import {
  Component,
  lazy,
  memo,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { BufferGeometry, Mesh, MeshStandardMaterial, MOUSE, Vector3 } from "three";
import type { OrthographicCamera } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { handBones, handBoneIndexById } from "../data/bones";
import { RENDERING_CONFIG } from "../data/config/rendering";
import { GUIDE_CONFIG } from "../data/config/gameplay";
import { HAND_STAGE } from "../data/stageRegistry";
import { useGameStore } from "../state/gameStore";
import { useScreenStore } from "../state/screenStore";
import type { BoneDefinition } from "../types/bone";
import type { Screen } from "../types/game";
import SceneRuntime, { PoseRuntime } from "./SceneRuntime";
import { usePageActivity } from "../hooks/usePageActivity";
import BoneInteractions from "./BoneInteractions";

const SceneProbe =
  import.meta.env.DEV && import.meta.env.VITE_E2E === "1"
    ? lazy(() => import("./SceneProbe"))
    : null;
const modelPaths = handBones.map((bone) => bone.modelPath);
let introModule: ReturnType<typeof importIntro> | undefined;
function importIntro() { return import("./IntroPhysics"); }
const loadIntro = () => (introModule ??= importIntro());
const IntroPhysics = lazy(loadIntro);

/** Called only after explicit HAND intent; importing the title never calls this. */
export function preloadHandStage() {
  useGLTF.preload(modelPaths);
  if (!useGameStore.getState().reducedMotion) void loadIntro().catch(() => { introModule = undefined; });
}

class SceneErrorBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() {
    return this.state.error ? (
      <div className="scene-error" role="alert">
        <strong>3D 모델을 불러오지 못했습니다.</strong>
        <p>모델 파일과 WebGL 지원을 확인한 후 다시 시도해 주세요.</p>
        <button onClick={() => location.reload()}>다시 불러오기</button>
      </div>
    ) : this.props.children;
  }
}

function BoneScene({ screen }: { screen: Screen }) {
  const [ready, setReady] = useState(false);
  const markReady = useCallback(() => setReady(true), []);
  return (
    <SceneErrorBoundary>
      <div className={`scene scene-${screen}`} data-testid="bone-scene" aria-label="오른손 27개 뼈의 3D 조립 공간">
        <Canvas
          frameloop="demand"
          dpr={RENDERING_CONFIG.dpr}
          orthographic
          camera={{ position: [0, 18, 18], zoom: 55, near: RENDERING_CONFIG.camera.near, far: RENDERING_CONFIG.camera.far }}
          gl={{ antialias: true, alpha: false }}
          fallback={<div className="scene-error" role="alert">WebGL을 지원하는 브라우저가 필요합니다.</div>}
        >
          <color attach="background" args={[RENDERING_CONFIG.background]} />
          <ambientLight intensity={RENDERING_CONFIG.lights.ambient} />
          <directionalLight {...RENDERING_CONFIG.lights.key} />
          <directionalLight {...RENDERING_CONFIG.lights.fill} />
          <Suspense fallback={null}>
            <World screen={screen} onReady={markReady} />
          </Suspense>
        </Canvas>
        {!ready && <div className="model-loading" role="status"><span className="loading-line" />Loading anatomy <small>{HAND_STAGE.name} · {handBones.length} BONES</small></div>}
      </div>
    </SceneErrorBoundary>
  );
}
export default memo(BoneScene);

type Materials = {
  normal: MeshStandardMaterial;
  selected: MeshStandardMaterial;
  placed: MeshStandardMaterial;
  guide: MeshStandardMaterial;
};

function Camera({ screen, runtime }: { screen: Screen; runtime: PoseRuntime }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera, size, invalidate } = useThree();
  const dragging = useGameStore((state) => state.dragging);
  const visible = usePageActivity();
  const enabled = !dragging && visible && (screen === "game" || screen === "complete");
  const anatomy = screen === "stageIntro" || screen === "complete";
  const lastView = useRef<boolean | null>(null);
  const reset = useCallback(() => {
    const orthographic = camera as OrthographicCamera;
    const view = RENDERING_CONFIG.views[anatomy ? "anatomy" : "gameplay"];
    const target = new Vector3(...view.target);
    camera.position.copy(target).add(new Vector3(...view.offset));
    orthographic.zoom = Math.min(size.height / view.height, size.width / view.width);
    orthographic.updateProjectionMatrix();
    camera.lookAt(target);
    if (controls.current) {
      controls.current.target.copy(target);
      controls.current.update();
    }
    invalidate();
  }, [anatomy, camera, invalidate, size.height, size.width]);
  useEffect(() => {
    // Pausing must preserve the exact camera pose; only real view changes reset.
    if (lastView.current !== anatomy) {
      lastView.current = anatomy;
      reset();
    }
  }, [anatomy, reset]);
  useEffect(() => {
    reset();
  }, [size.height, size.width]); // Resize reframes the actual unobscured canvas.
  useEffect(() => {
    window.addEventListener("reset-camera", reset);
    return () => window.removeEventListener("reset-camera", reset);
  }, [reset]);
  useEffect(() => {
    runtime.metrics.controlsEnabled = enabled;
  }, [enabled, runtime]);
  return <OrbitControls ref={controls} makeDefault enabled={enabled} enableDamping={false}
    minZoom={RENDERING_CONFIG.camera.minimumZoom} maxZoom={RENDERING_CONFIG.camera.maximumZoom} maxPolarAngle={RENDERING_CONFIG.camera.maximumPolarAngle}
    mouseButtons={{ LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.PAN, RIGHT: MOUSE.ROTATE }} />;
}

function World({ screen, onReady }: { screen: Screen; onReady: () => void }) {
  const gltfs = useGLTF(modelPaths);
  const geometries = useMemo(() => gltfs.map((gltf) => {
    let geometry: BufferGeometry | undefined;
    gltf.scene.traverse((object) => { if (object instanceof Mesh) geometry = object.geometry; });
    if (!geometry) throw new Error("Missing anatomical mesh");
    geometry.computeBoundingBox();
    return geometry;
  }), [gltfs]);
  const materials = useMemo<Materials>(() => ({
    normal: new MeshStandardMaterial(RENDERING_CONFIG.materials.normal),
    selected: new MeshStandardMaterial(RENDERING_CONFIG.materials.selected),
    placed: new MeshStandardMaterial(RENDERING_CONFIG.materials.placed),
    guide: new MeshStandardMaterial({ ...RENDERING_CONFIG.materials.guide, opacity: GUIDE_CONFIG.opacity }),
  }), []);
  const runtime = useMemo(() => new PoseRuntime(), []);
  const meshes = useMemo(() => new Map<string, Mesh>(), []);
  const reduced = useGameStore((state) => state.reducedMotion);
  const guideEnabled = useGameStore((state) => state.guideEnabled);
  const opacity = useGameStore((state) => state.ghostOpacity);
  const pieces = useGameStore((state) => state.pieces);
  const { invalidate } = useThree();
  useEffect(() => () => { for (const material of Object.values(materials)) material.dispose(); }, [materials]);
  useEffect(() => {
    if (screen !== "stageIntro") onReady();
    else if (reduced) {
      onReady();
      useGameStore.getState().setAnimation("finished");
      useScreenStore.getState().go("game");
    }
  }, [screen, onReady, reduced]);
  useEffect(() => {
    materials.guide.opacity = opacity;
    invalidate();
  }, [materials, opacity, invalidate]);
  const showGuide = guideEnabled && (screen === "game" || screen === "paused");
  const guideBones = showGuide ? handBones.filter((bone) => !pieces[bone.id].placed) : [];
  useEffect(() => {
    runtime.metrics.guideMeshCount = guideBones.length;
  }, [guideBones.length, runtime]);
  return <>
    <SceneRuntime runtime={runtime} paused={screen === "paused"} />
    {SceneProbe && <SceneProbe />}
    <Camera screen={screen} runtime={runtime} />
    {screen === "stageIntro" && !reduced ? (
      <Suspense fallback={null}><IntroPhysics geometries={geometries} material={materials.normal} metrics={runtime.metrics} onReady={onReady} /></Suspense>
    ) : <>
      <group dispose={null}>{handBones.map((bone, index) => <RegularBone key={bone.id} bone={bone} geometry={geometries[index]}
        meshes={meshes} materials={materials} runtime={runtime} />)}</group>
      <BoneInteractions meshes={meshes} screen={screen} />
      {showGuide && <group dispose={null}>{guideBones.map((bone) => <mesh key={bone.id} geometry={geometries[handBoneIndexById[bone.id]]}
        material={materials.guide} position={bone.targetPosition} quaternion={bone.targetRotation} scale={bone.targetScale}
        raycast={() => null} userData={{ guide: true }} dispose={null} />)}</group>}
    </>}
  </>;
}

const RegularBone = memo(function RegularBone({ bone, geometry, meshes, materials, runtime }: {
  bone: BoneDefinition; geometry: BufferGeometry; meshes: Map<string, Mesh>; materials: Materials; runtime: PoseRuntime;
}) {
  const mesh = useRef<Mesh>(null);
  const play = useGameStore((state) => state.pieces[bone.id]);
  const selected = useGameStore((state) => state.selectedBoneId === bone.id);
  const reduced = useGameStore((state) => state.reducedMotion);
  const wasPlaced = useRef(play.placed);
  const userData = useMemo(() => ({ boneId: bone.id }), [bone.id]);
  const { invalidate } = useThree();
  const register = useCallback((node: Mesh | null) => {
    if (mesh.current && mesh.current !== node) {
      runtime.jobs.delete(mesh.current);
      runtime.metrics.activeTweens = runtime.jobs.size;
    }
    mesh.current = node;
    if (node) meshes.set(bone.id, node);
    else meshes.delete(bone.id);
  }, [bone.id, meshes, runtime]);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    runtime.sync(mesh.current, play.transform, play.placed && !wasPlaced.current && !reduced);
    wasPlaced.current = play.placed;
    invalidate();
  }, [play.transform, play.placed, reduced, runtime, invalidate]);
  useEffect(() => () => { if (mesh.current) runtime.jobs.delete(mesh.current); }, [runtime]);
  return <mesh ref={register} geometry={geometry} material={selected ? materials.selected : play.placed ? materials.placed : materials.normal}
    scale={bone.targetScale} userData={userData} dispose={null} />;
});
