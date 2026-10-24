import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BoxGeometry, Mesh, MeshBasicMaterial, OrthographicCamera, Quaternion } from "three";
import { attachBoneInteractions } from "../src/scene/BoneInteractions";
import { handBones } from "../src/data/bones";
import { useGameStore } from "../src/state/gameStore";

const id = handBones[0].id;
let cleanup = () => {};
let canvas: HTMLCanvasElement;
let mesh: Mesh;
let controls: { enabled: boolean };
let invalidate: () => void;
let captured = false;

function pointer(type: string, x: number, y: number, extras: MouseEventInit = {}) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, ...extras });
  Object.defineProperties(event, { pointerId: { value: 11 }, isPrimary: { value: true } });
  (type === "pointerdown" ? canvas : window).dispatchEvent(event);
}

beforeEach(() => {
  localStorage.clear();
  useGameStore.getState().newGame("normal");
  useGameStore.getState().move(id, { position: [0, 0, 0], rotation: [0, 0, 0, 1] });
  useGameStore.getState().setInteractionMode("rotate");
  canvas = document.createElement("canvas");
  document.body.appendChild(canvas);
  canvas.getBoundingClientRect = () => ({ x: 0, y: 0, left: 0, top: 0, width: 1000, height: 1000, right: 1000, bottom: 1000, toJSON() {} });
  captured = false;
  canvas.setPointerCapture = () => { captured = true; };
  canvas.hasPointerCapture = () => captured;
  canvas.releasePointerCapture = () => { captured = false; };
  mesh = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial());
  mesh.userData.boneId = id;
  const camera = new OrthographicCamera(-5, 5, 5, -5, 0.1, 100);
  camera.position.set(0, 0, 20);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  controls = { enabled: true };
  invalidate = vi.fn();
  cleanup = attachBoneInteractions({ canvas, camera, controls, meshes: new Map([[id, mesh]]), invalidate });
});

afterEach(() => {
  cleanup();
  canvas.remove();
  mesh.geometry.dispose();
  (mesh.material as MeshBasicMaterial).dispose();
  vi.restoreAllMocks();
});

describe("central native bone pointer controller", () => {
  it("locks OrbitControls before movement and commits only one final rotated pose", () => {
    const writes = vi.spyOn(Storage.prototype, "setItem");
    const raycasts = vi.spyOn(mesh, "raycast");
    pointer("pointerdown", 500, 500);
    expect(raycasts).toHaveBeenCalledTimes(1);
    expect(controls.enabled).toBe(false);
    expect(captured).toBe(true);
    expect(useGameStore.getState().dragging).toBe(true);
    writes.mockClear();
    for (let x = 510; x <= 600; x += 10) pointer("pointermove", x, 520);
    expect(mesh.quaternion.y).not.toBe(0);
    expect(mesh.position.toArray()).toEqual([0, 0, 0]);
    expect(useGameStore.getState().pieces[id].transform.rotation).toEqual([0, 0, 0, 1]);
    expect(writes).not.toHaveBeenCalled();
    expect(raycasts).toHaveBeenCalledTimes(1);
    pointer("pointerup", 600, 520);
    expect(writes).toHaveBeenCalledTimes(1);
    useGameStore.getState().pieces[id].transform.rotation.forEach((value, index) =>
      expect(value).toBeCloseTo(mesh.quaternion.toArray()[index], 14),
    );
    expect(controls.enabled).toBe(true);
    expect(captured).toBe(false);
    expect(useGameStore.getState().dragging).toBe(false);
  });

  it.each(["pointercancel", "blur", "lostpointercapture", "cleanup"])(
    "rolls back on %s without snapping and restores pointer/controls",
    (reason) => {
      const drop = vi.fn();
      window.addEventListener("bone-drop", drop);
      pointer("pointerdown", 500, 500);
      pointer("pointermove", 590, 550);
      if (reason === "pointercancel") pointer("pointercancel", 590, 550);
      else if (reason === "blur") window.dispatchEvent(new Event("blur"));
      else if (reason === "lostpointercapture") {
        const event = new Event("lostpointercapture");
        Object.defineProperty(event, "pointerId", { value: 11 });
        canvas.dispatchEvent(event);
      } else cleanup();
      expect(mesh.position.toArray()).toEqual([0, 0, 0]);
      expect(mesh.quaternion.toArray()).toEqual([0, 0, 0, 1]);
      expect(useGameStore.getState().dragging).toBe(false);
      expect(controls.enabled).toBe(true);
      expect(captured).toBe(false);
      expect(drop).not.toHaveBeenCalled();
      window.removeEventListener("bone-drop", drop);
    },
  );

  it("uses Shift+drag as temporary movement while preserving the rotation preference", () => {
    pointer("pointerdown", 500, 500, { shiftKey: true });
    pointer("pointermove", 580, 510, { shiftKey: true });
    pointer("pointerup", 580, 510, { shiftKey: true });
    expect(mesh.position.x).toBeCloseTo(0.8);
    expect(mesh.quaternion.toArray()).toEqual([0, 0, 0, 1]);
    expect(useGameStore.getState().interactionMode).toBe("rotate");
  });

  it("starts from fresh canonical keyboard rotation and rolls back when the tab hides", () => {
    useGameStore.getState().rotate(id, "z", 45);
    const canonical = [...useGameStore.getState().pieces[id].transform.rotation];
    // The synthetic Mesh deliberately still has its old pose, like a pending React effect.
    pointer("pointerdown", 500, 500);
    expect(Math.abs(mesh.quaternion.dot(new Quaternion(...canonical)))).toBeCloseTo(1, 14);
    pointer("pointermove", 550, 540);
    vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    document.dispatchEvent(new Event("visibilitychange"));
    expect(Math.abs(mesh.quaternion.dot(new Quaternion(...canonical)))).toBeCloseTo(1, 14);
    expect(useGameStore.getState().dragging).toBe(false);
    expect(controls.enabled).toBe(true);
    expect(captured).toBe(false);
  });

  it("selects placed bones without starting a manipulation", () => {
    const piece = useGameStore.getState().pieces[id];
    useGameStore.setState({ pieces: { ...useGameStore.getState().pieces, [id]: { ...piece, placed: true } } });
    pointer("pointerdown", 500, 500);
    pointer("pointermove", 600, 550);
    pointer("pointerup", 600, 550);
    expect(useGameStore.getState().selectedBoneId).toBe(id);
    expect(useGameStore.getState().dragging).toBe(false);
    expect(mesh.quaternion.toArray()).toEqual([0, 0, 0, 1]);
    expect(controls.enabled).toBe(true);
  });
});
