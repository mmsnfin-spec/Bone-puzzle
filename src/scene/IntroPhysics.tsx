/** Rapier is confined to this lazy boundary. Assembly never mounts a world. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  Physics,
  RigidBody,
  CuboidCollider,
  useRapier,
  useBeforePhysicsStep,
} from "@react-three/rapier";
import type { RapierRigidBody } from "@react-three/rapier";
import { Mesh, Quaternion, Vector3 } from "three";
import type { BufferGeometry, Material } from "three";
import { handBones } from "../data/bones";
import { useGameStore } from "../state/gameStore";
import { useScreenStore } from "../state/screenStore";
import { INTRO_DURATION, TIMING, introPhase } from "../systems/AnimationSystem";
import type { AnimationStatus } from "../types/game";
import { usePageActivity } from "../hooks/usePageActivity";
import type { SceneMetrics } from "./SceneRuntime";
import { INTRO_PHYSICS } from "../data/config/physics";

type Pose = { position: Vector3; rotation: Quaternion };
type Props = {
  geometries: BufferGeometry[];
  material: Material;
  metrics: SceneMetrics;
  onReady: () => void;
};
const boundaries = [
  TIMING.reveal,
  TIMING.reveal + TIMING.falling,
  TIMING.reveal + TIMING.falling + TIMING.settle,
  INTRO_DURATION,
];

export default function IntroPhysics({ geometries, material, metrics, onReady }: Props) {
  const [phase, setPhase] = useState<AnimationStatus>("assembled");
  const [settlePoses, setSettlePoses] = useState<Pose[] | null>(null);
  const bodies = useRef(new Map<number, RapierRigidBody>());
  const phaseRef = useRef<AnimationStatus>("assembled");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const elapsedBase = useRef(0);
  const resumeTime = useRef(0);
  const started = useRef(false);
  const visibleRef = useRef(!document.hidden);
  const visible = usePageActivity();
  const { invalidate } = useThree();
  const elapsed = useCallback(
    () => elapsedBase.current + (visibleRef.current && started.current ? performance.now() - resumeTime.current : 0),
    [],
  );

  useEffect(() => {
    useGameStore.getState().setAnimation("assembled");
    return () => {
      clearTimeout(timer.current);
      metrics.dynamicBodies = 0;
      metrics.physicsMounted = false;
    };
  }, [metrics]);

  const advance = useCallback(function advanceClock() {
    clearTimeout(timer.current);
    if (!started.current || !visibleRef.current) return;
    const ms = elapsed();
    const next = introPhase(ms);
    if (next !== phaseRef.current) {
      if (phaseRef.current === "falling") {
        const poses = handBones.map((bone, index) => {
          const body = bodies.current.get(index);
          if (!body) return { position: new Vector3(...bone.targetPosition), rotation: new Quaternion(...bone.targetRotation) };
          const p = body.translation(), q = body.rotation();
          return { position: new Vector3(p.x, p.y, p.z), rotation: new Quaternion(q.x, q.y, q.z, q.w) };
        });
        setSettlePoses(poses);
      }
      phaseRef.current = next;
      metrics.dynamicBodies = 0;
      setPhase(next);
      useGameStore.getState().setAnimation(next);
      invalidate();
      if (next === "finished") {
        useScreenStore.getState().go("game");
        return;
      }
    }
    const boundary = boundaries.find((value) => value > ms);
    if (boundary !== undefined) timer.current = setTimeout(advanceClock, Math.max(1, boundary - ms));
  }, [elapsed, invalidate, metrics]);

  const physicsReady = useCallback(() => {
    onReady();
    if (!started.current) {
      started.current = true;
      resumeTime.current = performance.now();
    }
    // Re-arm after React StrictMode's effect cleanup/replay as well.
    advance();
  }, [advance, onReady]);

  useEffect(() => {
    const changeActivity = (nextVisible: boolean) => {
      if (nextVisible === visibleRef.current) return;
      if (!nextVisible) {
        elapsedBase.current = elapsed();
        clearTimeout(timer.current);
      } else {
        resumeTime.current = performance.now();
      }
      visibleRef.current = nextVisible;
      if (nextVisible) {
        advance();
        invalidate();
      }
    };
    const visibilityChanged = () => changeActivity(!document.hidden && document.hasFocus());
    const focused = () => changeActivity(!document.hidden);
    const blurred = () => changeActivity(false);
    document.addEventListener("visibilitychange", visibilityChanged);
    window.addEventListener("focus", focused);
    window.addEventListener("blur", blurred);
    return () => {
      document.removeEventListener("visibilitychange", visibilityChanged);
      window.removeEventListener("focus", focused);
      window.removeEventListener("blur", blurred);
    };
  }, [advance, elapsed, invalidate]);

  const physicalPhase = phase === "assembled" || phase === "falling";
  return (
    <>
      {physicalPhase && (
        <Physics gravity={INTRO_PHYSICS.gravity} timeStep={INTRO_PHYSICS.fixedStepSeconds} interpolate={false} paused>
          <ManualStepper active={phase === "falling" && visible} metrics={metrics} onReady={physicsReady} />
          {phase === "falling" && (
            <>
              <RigidBody type="fixed" position={INTRO_PHYSICS.floorPosition} colliders={false}>
                <CuboidCollider args={INTRO_PHYSICS.floorHalfSize} />
              </RigidBody>
              {handBones.map((bone, index) => (
                <FallingBone key={bone.id} index={index} geometry={geometries[index]} material={material} bodies={bodies.current} />
              ))}
            </>
          )}
        </Physics>
      )}
      {phase !== "falling" && (
        <IntroMeshes phase={phase} geometries={geometries} material={material} starts={settlePoses} elapsed={elapsed} visible={visible} />
      )}
    </>
  );
}

function ManualStepper({ active, metrics, onReady }: { active: boolean; metrics: SceneMetrics; onReady: () => void }) {
  const { step } = useRapier();
  const { invalidate } = useThree();
  const fresh = useRef(true);
  useBeforePhysicsStep(() => metrics.physicsSteps++);
  useEffect(() => {
    metrics.physicsMounted = true;
    onReady();
    return () => { metrics.physicsMounted = false; metrics.dynamicBodies = 0; };
  }, [metrics, onReady]);
  useEffect(() => {
    fresh.current = true;
    metrics.dynamicBodies = active ? handBones.length : 0;
    if (active) invalidate();
  }, [active, invalidate, metrics]);
  useEffect(() => {
    const resetDelta = () => { fresh.current = true; };
    document.addEventListener("visibilitychange", resetDelta);
    return () => document.removeEventListener("visibilitychange", resetDelta);
  }, []);
  useFrame((_, delta) => {
    if (!active || document.hidden) return;
    // Never feed a hidden-tab time gap back into the fixed-step simulation.
    step(fresh.current ? INTRO_PHYSICS.fixedStepSeconds : Math.min(delta, INTRO_PHYSICS.maximumFrameDeltaSeconds));
    fresh.current = false;
    invalidate();
  });
  return null;
}

function FallingBone({ index, geometry, material, bodies }: {
  index: number; geometry: BufferGeometry; material: Material; bodies: Map<number, RapierRigidBody>;
}) {
  const body = useRef<RapierRigidBody>(null);
  const bone = handBones[index];
  useEffect(() => {
    const rigidBody = body.current;
    if (!rigidBody) return;
    bodies.set(index, rigidBody);
    rigidBody.setLinvel({ x: Math.sin(index * 2.4) * 0.65, y: 0, z: Math.cos(index * 1.7) * 0.7 }, true);
    rigidBody.setAngvel({ x: Math.sin(index + 1) * 1.7, y: Math.cos(index) * 1.1, z: Math.sin(index * 3) * 1.3 }, true);
    return () => { bodies.delete(index); };
  }, [bodies, index]);
  return (
    <RigidBody ref={body} type="dynamic" colliders="hull" position={bone.targetPosition} quaternion={bone.targetRotation}
      restitution={INTRO_PHYSICS.restitution} friction={INTRO_PHYSICS.friction} linearDamping={INTRO_PHYSICS.linearDamping} angularDamping={INTRO_PHYSICS.angularDamping} ccd canSleep>
      <mesh geometry={geometry} material={material} userData={{ boneId: bone.id }} dispose={null} />
    </RigidBody>
  );
}

function IntroMeshes({ phase, geometries, material, starts, elapsed, visible }: {
  phase: AnimationStatus; geometries: BufferGeometry[]; material: Material; starts: Pose[] | null; elapsed: () => number; visible: boolean;
}) {
  const meshes = useRef<Array<Mesh | null>>([]);
  const { invalidate } = useThree();
  const destinations = useMemo(() => handBones.map((bone, index) => {
    const rotation = new Quaternion(...bone.initialTransform.rotation);
    const position = new Vector3(...bone.initialTransform.position);
    const box = geometries[index].boundingBox;
    if (box) {
      const corner = new Vector3();
      let bottom = Infinity;
      for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
        corner.set(x, y, z).applyQuaternion(rotation);
        bottom = Math.min(bottom, corner.y);
      }
      position.y = Math.max(position.y, INTRO_PHYSICS.floorSurfaceY - bottom);
    }
    return { position, rotation };
  }), [geometries]);
  const apply = useCallback((progress: number) => {
    const eased = 1 - Math.pow(1 - progress, 3);
    for (let index = 0; index < handBones.length; index++) {
      const mesh = meshes.current[index];
      if (!mesh) continue;
      if (phase === "assembled") {
        mesh.position.fromArray(handBones[index].targetPosition);
        mesh.quaternion.fromArray(handBones[index].targetRotation);
      } else if (phase === "settling" && starts) {
        mesh.position.lerpVectors(starts[index].position, destinations[index].position, eased);
        mesh.quaternion.slerpQuaternions(starts[index].rotation, destinations[index].rotation, eased);
      } else {
        mesh.position.copy(destinations[index].position);
        mesh.quaternion.copy(destinations[index].rotation);
      }
    }
  }, [destinations, phase, starts]);
  useEffect(() => { apply(phase === "settling" ? 0 : 1); invalidate(); }, [apply, invalidate, phase]);
  useFrame(() => {
    if (phase !== "settling" || !visible || document.hidden) return;
    const progress = Math.min(1, Math.max(0, (elapsed() - TIMING.reveal - TIMING.falling) / TIMING.settle));
    apply(progress);
    if (progress < 1) invalidate();
  });
  return <group dispose={null}>{handBones.map((bone, index) => <mesh key={bone.id}
    ref={(mesh) => { meshes.current[index] = mesh; }} geometry={geometries[index]} material={material}
    userData={{ boneId: bone.id }} dispose={null} />)}</group>;
}
