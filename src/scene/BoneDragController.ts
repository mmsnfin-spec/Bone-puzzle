import { Plane, Vector3 } from "three";
import type { Vec3 } from "../types/bone";
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
  v.x = Math.max(-7, Math.min(7, v.x));
  v.y = Math.max(-3.7, Math.min(6, v.y));
  v.z = Math.max(-5, Math.min(5, v.z));
  return v;
}
