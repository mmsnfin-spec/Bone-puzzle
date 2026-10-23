import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { Physics, RigidBody, CuboidCollider } from "@react-three/rapier";
import type { RapierRigidBody } from "@react-three/rapier";
import { BufferGeometry, Mesh, Quaternion, Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { handBones } from "../data/bones";
import { useGameStore } from "../state/gameStore";
import { useScreenStore } from "../state/screenStore";
import { introPhase } from "../systems/AnimationSystem";
import { createDragPlane, clampDrag } from "./BoneDragController";
import type { BoneDefinition, Transform, Vec3 } from "../types/bone";
import type { Screen } from "../types/game";

const SceneProbe =
  import.meta.env.DEV && import.meta.env.VITE_E2E === "1"
    ? lazy(() => import("./SceneProbe"))
    : null;

class SceneErrorBoundary extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="scene-error" role="alert">
        <strong>3D 모델을 불러오지 못했습니다.</strong>
        <p>모델 파일과 WebGL 지원을 확인한 후 다시 시도해 주세요.</p>
        <button onClick={() => location.reload()}>다시 불러오기</button>
      </div>
    ) : (
      this.props.children
    );
  }
}
const modelPaths = handBones.map((b) => b.modelPath);
export default function BoneScene({ screen }: { screen: Screen }) {
  const [ready, setReady] = useState(false);
  return (
    <SceneErrorBoundary>
      <div
        className={`scene scene-${screen}`}
        data-testid="bone-scene"
        aria-label="오른손 27개 뼈의 3D 조립 공간"
      >
        <Canvas
          shadows="percentage"
          dpr={[1, 1.5]}
          orthographic
          camera={{ position: [0, 9, 24], zoom: 60, near: 0.1, far: 100 }}
          gl={{ antialias: true, alpha: false }}
          fallback={
            <div className="scene-error" role="alert">
              WebGL을 지원하는 브라우저가 필요합니다.
            </div>
          }
        >
          <color attach="background" args={["#050505"]} />
          <ambientLight intensity={0.65} />
          <hemisphereLight args={["#e6eaf5", "#27241f", 1.3]} />
          <directionalLight
            position={[-5, 10, 8]}
            intensity={2.7}
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-camera-left={-9}
            shadow-camera-right={9}
            shadow-camera-top={9}
            shadow-camera-bottom={-9}
            shadow-bias={-0.0004}
          />
          <directionalLight
            position={[5, 2, -4]}
            intensity={1.8}
            color="#b5bfd3"
          />
          <Suspense fallback={null}>
            <World screen={screen} onReady={() => setReady(true)} />
          </Suspense>
        </Canvas>
        {!ready && (
          <div className="model-loading" role="status">
            <span className="loading-line" />
            Loading anatomy <small>HAND · 27 BONES</small>
          </div>
        )}
      </div>
    </SceneErrorBoundary>
  );
}
function Camera({ screen }: { screen: Screen }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera, size } = useThree();
  const dragging = useGameStore((s) => s.dragging);
  useEffect(() => {
    if ("zoom" in camera) {
      camera.zoom = Math.min(size.height / 13, size.width / 13.2);
      camera.updateProjectionMatrix();
    }
  }, [camera, size]);
  useEffect(() => {
    camera.position.set(0, 9, 24);
    controls.current?.target.set(0, 0.1, 0);
    controls.current?.update();
  }, [screen, camera]);
  useEffect(() => {
    const reset = () => {
      camera.position.set(0, 9, 24);
      camera.zoom = Math.min(size.height / 13, size.width / 13.2);
      camera.updateProjectionMatrix();
      controls.current?.target.set(0, 0.1, 0);
      controls.current?.update();
    };
    window.addEventListener("reset-camera", reset);
    return () => window.removeEventListener("reset-camera", reset);
  }, [camera, size]);
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enabled={!dragging && (screen === "game" || screen === "complete")}
      enableDamping
      dampingFactor={0.12}
      minZoom={25}
      maxZoom={180}
      maxPolarAngle={Math.PI * 0.85}
      target={[0, 0.1, 0]}
    />
  );
}
function World({ screen, onReady }: { screen: Screen; onReady: () => void }) {
  const gltfs = useGLTF(modelPaths);
  const geometries = useMemo(
    () =>
      gltfs.map((g) => {
        let geometry: BufferGeometry | undefined;
        g.scene.traverse((obj) => {
          if (obj instanceof Mesh) geometry = obj.geometry;
        });
        if (!geometry) throw new Error("Missing mesh");
        return geometry;
      }),
    [gltfs],
  );
  const setAnimation = useGameStore((s) => s.setAnimation);
  const reduced = useGameStore((s) => s.reducedMotion);
  const introStart = useRef<number | null>(null);
  const lastPhase = useRef("");
  useEffect(() => {
    onReady();
  }, []); // Assets are resolved before the intro clock starts.
  useEffect(() => {
    introStart.current = null;
    lastPhase.current = "";
    if (screen === "stageIntro") setAnimation("assembled");
  }, [screen, setAnimation]);
  useFrame(() => {
    if (screen !== "stageIntro") return;
    if (introStart.current === null) introStart.current = performance.now();
    const phase = reduced
      ? "finished"
      : introPhase(performance.now() - introStart.current);
    if (phase !== lastPhase.current) {
      lastPhase.current = phase;
      setAnimation(phase);
      if (phase === "finished") useScreenStore.getState().go("game");
    }
  });
  return (
    <>
      {SceneProbe && <SceneProbe />}
      <Camera screen={screen} />
      <Physics gravity={[0, -15, 0]} timeStep={1 / 60} interpolate>
        <RigidBody type="fixed" position={[0, -4.25, 0]} colliders={false}>
          <CuboidCollider args={[16, 0.15, 12]} />
        </RigidBody>
        {screen !== "title" && screen !== "complete" && (
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, -4.105, 0]}
            receiveShadow
          >
            <planeGeometry args={[40, 40]} />
            <meshBasicMaterial color="#050505" toneMapped={false} />
          </mesh>
        )}
        {handBones.map((bone, i) => (
          <Bone
            key={bone.id}
            bone={bone}
            geometry={geometries[i]}
            index={i}
            screen={screen}
          />
        ))}
        {screen === "game" &&
          handBones.map((bone, i) => (
            <Ghost key={bone.id} bone={bone} geometry={geometries[i]} />
          ))}
      </Physics>
    </>
  );
}
function Ghost({
  bone,
  geometry,
}: {
  bone: BoneDefinition;
  geometry: BufferGeometry;
}) {
  const placed = useGameStore((s) => s.pieces[bone.id].placed);
  const opacity = useGameStore((s) => s.ghostOpacity);
  const difficulty = useGameStore((s) => s.difficulty);
  if (placed) return null;
  return (
    <mesh
      geometry={geometry}
      position={bone.targetPosition}
      quaternion={bone.targetRotation}
      raycast={() => null}
    >
      <meshStandardMaterial
        color="#aab5c5"
        transparent
        opacity={difficulty === "hard" ? Math.min(opacity, 0.075) : opacity}
        depthWrite={false}
        roughness={0.8}
      />
    </mesh>
  );
}
function Bone({
  bone,
  geometry,
  index,
  screen,
}: {
  bone: BoneDefinition;
  geometry: BufferGeometry;
  index: number;
  screen: Screen;
}) {
  const body = useRef<RapierRigidBody>(null);
  const mesh = useRef<Mesh>(null);
  const play = useGameStore((s) => s.pieces[bone.id]);
  const selected = useGameStore((s) => s.selectedBoneId === bone.id);
  const phase = useGameStore((s) => s.animationStatus);
  const [hover, setHover] = useState(false);
  const { camera, gl } = useThree();
  const stageIntro = screen === "stageIntro";
  const dynamic = stageIntro && phase === "falling";
  const desired = useMemo(() => new Vector3(), []);
  const q = useMemo(() => new Quaternion(), []);
  const floorCorners = useMemo(() => {
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    return [box.min.x, box.max.x].flatMap((x) =>
      [box.min.y, box.max.y].flatMap((y) =>
        [box.min.z, box.max.z].map((z) => new Vector3(x, y, z)),
      ),
    );
  }, [geometry]);
  const drag = useRef<{
    plane: ReturnType<typeof createDragPlane>;
    offset: Vector3;
    start: [number, number];
    moved: boolean;
    transform: Transform;
    pointerId: number;
  } | null>(null);
  useEffect(() => {
    if (dynamic && body.current) {
      body.current.setLinvel(
        {
          x: Math.sin(index * 2.4) * 0.65,
          y: 0,
          z: Math.cos(index * 1.7) * 0.7,
        },
        true,
      );
      body.current.setAngvel(
        {
          x: Math.sin(index + 1) * 1.7,
          y: Math.cos(index) * 1.1,
          z: Math.sin(index * 3) * 1.3,
        },
        true,
      );
      body.current.wakeUp();
    }
  }, [dynamic, index]);
  useFrame((_, delta) => {
    const b = body.current;
    if (!b || dynamic) return;
    b.wakeUp();
    let target: Transform;
    if (
      screen === "title" ||
      screen === "splash" ||
      (stageIntro && phase === "assembled")
    )
      target = { position: bone.targetPosition, rotation: bone.targetRotation };
    else if (stageIntro) target = bone.initialTransform;
    else target = drag.current?.moved ? drag.current.transform : play.transform;
    desired.fromArray(target.position);
    if (screen === "title") desired.x += 3.4;
    q.fromArray(target.rotation);
    const current = b.translation();
    const currentQ = b.rotation();
    const immediate =
      drag.current?.moved ||
      screen === "title" ||
      (stageIntro && phase === "assembled");
    const alpha = immediate ? 1 : 1 - Math.exp(-delta * (stageIntro ? 7 : 18));
    desired.lerpVectors(
      new Vector3(current.x, current.y, current.z),
      desired,
      alpha,
    );
    q.copy(
      new Quaternion(currentQ.x, currentQ.y, currentQ.z, currentQ.w).slerp(
        q,
        alpha,
      ),
    );
    if (stageIntro && phase !== "assembled") {
      const bottom = Math.min(
        ...floorCorners.map((v) => v.clone().applyQuaternion(q).y),
      );
      desired.y = Math.max(desired.y, -4.08 - bottom);
    }
    // Explicit poses after the dynamic phase also update bodies removed from Rapier's active kinematic island.
    b.setTranslation(desired, true);
    b.setRotation(q, true);
    b.setNextKinematicTranslation(desired);
    b.setNextKinematicRotation(q);
  });
  const pointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (screen !== "game") return;
    e.stopPropagation();
    if (play.placed) {
      useGameStore.getState().select(bone.id);
      return;
    }
    const direction = camera.getWorldDirection(new Vector3());
    const plane = createDragPlane(direction, bone.targetPosition);
    const hit = e.ray.intersectPlane(plane, new Vector3());
    if (!hit) return;
    const pos = body.current!.translation();
    const projected = plane.projectPoint(
      new Vector3(pos.x, pos.y, pos.z),
      new Vector3(),
    );
    drag.current = {
      plane,
      offset: projected.sub(hit),
      start: [e.clientX, e.clientY],
      moved: false,
      transform: structuredClone(play.transform),
      pointerId: e.pointerId,
    };
    useGameStore.getState().setDragging(true);
    (e.target as unknown as Element).setPointerCapture(e.pointerId);
  };
  const pointerMove = (e: ThreeEvent<PointerEvent>) => {
    const d = drag.current;
    if (!d) return;
    e.stopPropagation();
    if (Math.hypot(e.clientX - d.start[0], e.clientY - d.start[1]) > 4)
      d.moved = true;
    if (!d.moved) return;
    const hit = e.ray.intersectPlane(d.plane, new Vector3());
    if (!hit) return;
    clampDrag(hit.add(d.offset));
    d.transform = {
      position: hit.toArray() as Vec3,
      rotation: play.transform.rotation,
    };
  };
  const pointerUp = (e: ThreeEvent<PointerEvent>) => {
    const d = drag.current;
    if (!d) return;
    e.stopPropagation();
    if (d.moved) {
      const snapped = useGameStore.getState().drop(bone.id, d.transform);
      window.dispatchEvent(
        new CustomEvent("bone-drop", { detail: { snapped } }),
      );
    } else useGameStore.getState().select(bone.id);
    drag.current = null;
    useGameStore.getState().setDragging(false);
    try {
      (e.target as unknown as Element).releasePointerCapture(e.pointerId);
    } catch {
      /* Pointer may already have been released. */
    }
  };
  useEffect(() => {
    const cancel = () => {
      if (drag.current) {
        drag.current = null;
        useGameStore.getState().setDragging(false);
      }
    };
    gl.domElement.addEventListener("pointercancel", cancel);
    window.addEventListener("blur", cancel);
    return () => {
      gl.domElement.removeEventListener("pointercancel", cancel);
      window.removeEventListener("blur", cancel);
      cancel();
    };
  }, [gl]);
  useEffect(() => {
    if (hover && screen === "game")
      gl.domElement.style.cursor = play.placed ? "pointer" : "grab";
    return () => {
      gl.domElement.style.cursor = "auto";
    };
  }, [hover, screen, play.placed, gl]);
  return (
    <RigidBody
      ref={body}
      type={dynamic ? "dynamic" : "kinematicPosition"}
      colliders="hull"
      restitution={0.22}
      friction={0.9}
      linearDamping={0.6}
      angularDamping={0.8}
      ccd
      position={bone.targetPosition}
      canSleep
    >
      <mesh
        ref={mesh}
        geometry={geometry}
        castShadow
        receiveShadow
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
        }}
        onPointerOut={() => setHover(false)}
        userData={{ boneId: bone.id }}
      >
        <meshStandardMaterial
          color={selected ? "#f7edd9" : play.placed ? "#eee9dd" : "#e1ded4"}
          roughness={0.64}
          metalness={0}
          emissive={
            selected
              ? "#65523b"
              : hover && screen === "game"
                ? "#302b22"
                : "#000000"
          }
          emissiveIntensity={selected ? 0.38 : 0.18}
        />
      </mesh>
    </RigidBody>
  );
}
