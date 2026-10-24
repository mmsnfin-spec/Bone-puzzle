import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { Quaternion, Raycaster, Vector2, Vector3 } from "three";
import type { Camera, Mesh, Plane } from "three";
import { bonesById } from "../data/bones";
import { useGameStore } from "../state/gameStore";
import type { Transform, Vec3, Quat } from "../types/bone";
import type { Screen } from "../types/game";
import { arcballDelta } from "./Arcball";
import { clampDrag, createDragPlane } from "./BoneDragController";
import { INTERACTION_CONFIG } from "../data/config/interaction";

type Controls = { enabled: boolean };
type InteractionOptions = {
  canvas: HTMLCanvasElement;
  camera: Camera;
  controls: Controls | null;
  meshes: Map<string, Mesh>;
  invalidate: () => void;
  canRestoreControls?: () => boolean;
};
type Gesture = {
  id: string;
  mesh: Mesh;
  pointerId: number;
  mode: "move" | "rotate";
  plane: Plane;
  offset: Vector3;
  start: Vector2;
  previous: Vector2;
  moved: boolean;
  controlsEnabled: boolean;
  parentRotation: Quaternion;
  cameraRotation: Quaternion;
  committed: Transform;
};

/**
 * One native controller for the complete scene. Raycasting occurs only at
 * pointerdown. The hot pointermove path changes one Mesh and invalidates a frame;
 * Zustand/React/persistence are updated once at the final drop, never per move.
 * Exported separately from React so pointer-capture/cancel behavior is testable.
 */
export function attachBoneInteractions({
  canvas,
  camera,
  controls,
  meshes,
  invalidate,
  canRestoreControls = () => true,
}: InteractionOptions): () => void {
  let gesture: Gesture | null = null;
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const hit = new Vector3();
  const worldPosition = new Vector3();
  const direction = new Vector3();
  const deltaRotation = new Quaternion();
  const worldRotation = new Quaternion();
  const inverseParent = new Quaternion();

  const rayFromEvent = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    camera.updateMatrixWorld(true);
    raycaster.setFromCamera(pointer, camera);
    return true;
  };
  const consume = (event: Event) => {
    if (event.cancelable) event.preventDefault();
    event.stopImmediatePropagation();
  };
  const restorePose = (drag: Gesture) => {
    const state = useGameStore.getState().pieces[drag.id];
    const pose = state?.transform ?? drag.committed;
    drag.mesh.position.fromArray(pose.position);
    drag.mesh.quaternion.fromArray(pose.rotation).normalize();
    drag.mesh.updateMatrixWorld(true);
    invalidate();
  };
  const release = (drag: Gesture) => {
    drag.mesh.userData.interacting = false;
    if (controls)
      controls.enabled = drag.controlsEnabled && canRestoreControls();
    if (useGameStore.getState().dragging)
      useGameStore.getState().setDragging(false);
    canvas.style.cursor = "auto";
    try {
      if (canvas.hasPointerCapture(drag.pointerId))
        canvas.releasePointerCapture(drag.pointerId);
    } catch {
      // Capture can already have been released by cancellation or browser blur.
    }
  };
  const cancel = () => {
    const drag = gesture;
    if (!drag) return;
    gesture = null;
    restorePose(drag);
    release(drag);
  };

  const down = (event: PointerEvent) => {
    if (gesture) {
      consume(event);
      return;
    }
    if (event.button !== 0 || event.isPrimary === false || !rayFromEvent(event))
      return;
    const realMeshes = [...meshes.values()].filter((mesh) => mesh.visible);
    for (const mesh of realMeshes) mesh.updateWorldMatrix(true, false);
    const intersection = raycaster.intersectObjects(realMeshes, false)[0];
    if (!intersection) return;
    const mesh = intersection.object as Mesh;
    const id = mesh.userData.boneId as string;
    const state = useGameStore.getState();
    const piece = state.pieces[id];
    const bone = bonesById[id];
    if (!piece || !bone) return;
    consume(event); // Capture phase prevents OrbitControls from starting first.
    state.select(id);
    if (piece.placed) return;

    // Read the latest canonical keyboard/button result, even if React has not
    // committed its pose effect yet when this native pointer event arrives.
    mesh.position.fromArray(piece.transform.position);
    mesh.quaternion.fromArray(piece.transform.rotation).normalize();
    mesh.updateWorldMatrix(true, false);

    const targetWorld = new Vector3(...bone.targetPosition);
    mesh.parent?.localToWorld(targetWorld);
    const plane = createDragPlane(
      camera.getWorldDirection(direction),
      targetWorld.toArray() as Vec3,
    );
    if (!raycaster.ray.intersectPlane(plane, hit)) return;
    mesh.getWorldPosition(worldPosition);
    const offset = plane.projectPoint(worldPosition, new Vector3()).sub(hit);
    const committed: Transform = {
      position: [...piece.transform.position],
      rotation: [...piece.transform.rotation],
    };
    gesture = {
      id,
      mesh,
      pointerId: event.pointerId,
      mode: event.shiftKey ? "move" : state.interactionMode,
      plane,
      offset,
      start: new Vector2(event.clientX, event.clientY),
      previous: new Vector2(event.clientX, event.clientY),
      moved: false,
      controlsEnabled: controls?.enabled ?? false,
      parentRotation:
        mesh.parent?.getWorldQuaternion(new Quaternion()) ?? new Quaternion(),
      cameraRotation: camera.getWorldQuaternion(new Quaternion()),
      committed,
    };
    mesh.userData.interacting = true;
    if (controls) controls.enabled = false;
    state.setDragging(true);
    canvas.style.cursor = gesture.mode === "rotate" ? "crosshair" : "grabbing";
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      // Window-level move/up listeners still release a gesture outside canvas.
    }
  };

  const move = (event: PointerEvent) => {
    const drag = gesture;
    if (!drag || event.pointerId !== drag.pointerId) return;
    consume(event);
    if (!drag.moved) {
      if (drag.start.distanceTo(pointer.set(event.clientX, event.clientY)) <= INTERACTION_CONFIG.dragThresholdPx)
        return;
      drag.moved = true;
    }
    if (drag.mode === "rotate") {
      arcballDelta(
        event.clientX - drag.previous.x,
        event.clientY - drag.previous.y,
        drag.cameraRotation,
        undefined,
        deltaRotation,
      );
      // World delta * world orientation, then convert to the mesh parent's basis.
      inverseParent.copy(drag.parentRotation).invert();
      worldRotation
        .copy(drag.parentRotation)
        .multiply(drag.mesh.quaternion)
        .premultiply(deltaRotation);
      drag.mesh.quaternion.copy(inverseParent).multiply(worldRotation).normalize();
    } else if (
      rayFromEvent(event) &&
      raycaster.ray.intersectPlane(drag.plane, hit)
    ) {
      hit.add(drag.offset);
      if (drag.mesh.parent) drag.mesh.parent.worldToLocal(hit);
      clampDrag(hit);
      drag.mesh.position.copy(hit);
    }
    drag.previous.set(event.clientX, event.clientY);
    drag.mesh.updateMatrixWorld(true);
    invalidate();
  };

  const up = (event: PointerEvent) => {
    const drag = gesture;
    if (!drag || event.pointerId !== drag.pointerId) return;
    consume(event);
    // A final pointerup can contain the last coordinates without a preceding move.
    if (event.clientX !== drag.previous.x || event.clientY !== drag.previous.y)
      move(event);
    gesture = null;
    drag.mesh.userData.interacting = false;
    if (drag.moved) {
      const transform: Transform = {
        position: drag.mesh.position.toArray() as Vec3,
        rotation: drag.mesh.quaternion.toArray() as Quat,
      };
      const snapped = useGameStore.getState().drop(drag.id, transform);
      window.dispatchEvent(new CustomEvent("bone-drop", { detail: { snapped } }));
    }
    release(drag);
    invalidate();
  };
  const pointerCancel = (event: PointerEvent) => {
    if (gesture && event.pointerId === gesture.pointerId) {
      consume(event);
      cancel();
    }
  };
  const lostCapture = (event: PointerEvent) => {
    if (gesture && event.pointerId === gesture.pointerId) cancel();
  };
  const visibility = () => {
    if (document.hidden) cancel();
  };
  const wheel = (event: WheelEvent) => {
    if (gesture) consume(event);
  };

  canvas.addEventListener("pointerdown", down, { capture: true });
  canvas.addEventListener("lostpointercapture", lostCapture);
  canvas.addEventListener("wheel", wheel, { capture: true, passive: false });
  window.addEventListener("pointermove", move, { capture: true });
  window.addEventListener("pointerup", up, { capture: true });
  window.addEventListener("pointercancel", pointerCancel, { capture: true });
  window.addEventListener("blur", cancel);
  document.addEventListener("visibilitychange", visibility);
  return () => {
    cancel();
    canvas.removeEventListener("pointerdown", down, true);
    canvas.removeEventListener("lostpointercapture", lostCapture);
    canvas.removeEventListener("wheel", wheel, true);
    window.removeEventListener("pointermove", move, true);
    window.removeEventListener("pointerup", up, true);
    window.removeEventListener("pointercancel", pointerCancel, true);
    window.removeEventListener("blur", cancel);
    document.removeEventListener("visibilitychange", visibility);
  };
}

export default function BoneInteractions({
  meshes,
  screen,
}: {
  meshes: Map<string, Mesh>;
  screen: Screen;
}) {
  const { camera, gl, invalidate } = useThree();
  const controls = useThree((state) => state.controls) as Controls | null;
  const screenRef = useRef(screen);
  screenRef.current = screen;
  useEffect(() => {
    if (screen !== "game") return;
    return attachBoneInteractions({
      canvas: gl.domElement,
      camera,
      controls,
      meshes,
      invalidate,
      canRestoreControls: () =>
        screenRef.current === "game" || screenRef.current === "complete",
    });
  }, [camera, controls, gl, invalidate, meshes, screen]);
  return null;
}
