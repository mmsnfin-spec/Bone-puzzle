import { Plane, Vector3 } from "three";
import type { Vec3 } from "../types/bone";
import { INTERACTION_CONFIG } from "../data/config/interaction";
/** Drag plane faces the current camera and passes through this bone's own target.
 * Projecting the grabbed point onto it preserves the screen-space grab offset even
 * after orbiting, while making the correct target reachable in three dimensions. */
export function createDragPlane(cameraDirection: Vector3, target: Vec3) {
  return new Plane().setFromNormalAndCoplanarPoint(
    cameraDirection.clone().normalize(),
    new Vector3(...target),
  );
}
export function clampDrag(v: Vector3) {
  for (const axis of ["x", "y", "z"] as const) {
    const [minimum, maximum] = INTERACTION_CONFIG.bounds[axis];
    v[axis] = Math.max(minimum, Math.min(maximum, v[axis]));
  }
  return v;
}
