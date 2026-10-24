import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Mesh, Quaternion, Vector3 } from "three";
import type { Transform } from "../types/bone";
import { ANIMATION_TIMING } from "../data/config/gameplay";
import { usePageActivity } from "../hooks/usePageActivity";

export type SceneMetrics = {
  frameCount: number;
  physicsSteps: number;
  dynamicBodies: number;
  physicsMounted: boolean;
  guideMeshCount: number;
  activeTweens: number;
  controlsEnabled: boolean;
  paused: boolean;
};
type PoseTween = {
  from: Vector3;
  to: Vector3;
  rotation: Quaternion;
  targetRotation: Quaternion;
  started: number;
};
export class PoseRuntime {
  readonly jobs = new Map<Mesh, PoseTween>();
  readonly metrics: SceneMetrics = {
    frameCount: 0,
    physicsSteps: 0,
    dynamicBodies: 0,
    physicsMounted: false,
    guideMeshCount: 0,
    activeTweens: 0,
    controlsEnabled: false,
    paused: false,
  };
  sync(mesh: Mesh, pose: Transform, animate: boolean) {
    if (mesh.userData.interacting) return;
    this.jobs.delete(mesh);
    if (animate) {
      this.jobs.set(mesh, {
        from: mesh.position.clone(),
        to: new Vector3(...pose.position),
        rotation: mesh.quaternion.clone(),
        targetRotation: new Quaternion(...pose.rotation),
        started: performance.now(),
      });
    } else {
      mesh.position.fromArray(pose.position);
      mesh.quaternion.fromArray(pose.rotation);
      mesh.updateMatrixWorld();
    }
    this.metrics.activeTweens = this.jobs.size;
  }
}

/** One tiny frame callback for the scene. No idle invalidation or bone polling. */
export default function SceneRuntime({
  runtime,
  paused,
}: {
  runtime: PoseRuntime;
  paused: boolean;
}) {
  const { invalidate, scene } = useThree();
  const visible = usePageActivity();
  const suspended = paused || !visible;
  const pauseStart = useRef<number | null>(null);
  useEffect(() => {
    scene.userData.runtimeMetrics = runtime.metrics;
    return () => {
      delete scene.userData.runtimeMetrics;
      runtime.jobs.clear();
    };
  }, [runtime, scene]);
  useEffect(() => {
    runtime.metrics.paused = suspended;
    if (suspended) {
      pauseStart.current = performance.now();
    } else if (pauseStart.current !== null) {
      const duration = performance.now() - pauseStart.current;
      for (const job of runtime.jobs.values()) job.started += duration;
      pauseStart.current = null;
      if (runtime.jobs.size) invalidate();
    }
  }, [suspended, runtime, invalidate]);
  useFrame(() => {
    runtime.metrics.frameCount++;
    if (suspended || runtime.jobs.size === 0) return;
    const now = performance.now();
    for (const [mesh, job] of runtime.jobs) {
      const progress = Math.min(1, (now - job.started) / ANIMATION_TIMING.snap);
      const eased = 1 - Math.pow(1 - progress, 3);
      mesh.position.lerpVectors(job.from, job.to, eased);
      mesh.quaternion.slerpQuaternions(job.rotation, job.targetRotation, eased);
      mesh.updateMatrixWorld();
      if (progress === 1) runtime.jobs.delete(mesh);
    }
    runtime.metrics.activeTweens = runtime.jobs.size;
    if (runtime.jobs.size) invalidate();
  });
  return null;
}
