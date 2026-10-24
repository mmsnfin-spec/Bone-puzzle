import { Quaternion } from "three";
import { INTERACTION_CONFIG } from "../data/config/interaction";

/** A fixed virtual rolling-sphere radius in CSS pixels, independent of zoom/mesh size. */
export const ARCBALL_RADIUS_PX = INTERACTION_CONFIG.arcballRadiusPx;

/**
 * Incremental camera-relative arcball rotation. A pointer displacement rolls the
 * virtual sphere by distance/radius radians around its screen-plane tangent axis.
 * Unlike a clamped hemisphere projection, a long stroke continues through 180/360
 * degrees. Incremental quaternions also preserve diagonal and reversed gestures
 * without Euler singularities or pointer-event-rate-dependent sensitivity.
 * `target` lets the live controller reuse one quaternion for every pointer event.
 */
export function arcballDelta(
  deltaX: number,
  deltaY: number,
  cameraWorld: Quaternion,
  radius: number = ARCBALL_RADIUS_PX,
  target = new Quaternion(),
): Quaternion {
  const distance = Math.hypot(deltaX, deltaY);
  const cameraLength = Math.hypot(
    cameraWorld.x,
    cameraWorld.y,
    cameraWorld.z,
    cameraWorld.w,
  );
  if (
    !Number.isFinite(distance) ||
    distance === 0 ||
    !Number.isFinite(radius) ||
    radius <= 0 ||
    !Number.isFinite(cameraLength) ||
    cameraLength === 0 ||
    !Number.isFinite(distance / radius)
  )
    return target.identity();

  // Drag right rotates about camera up; drag down rotates about camera right.
  const x = deltaY / distance;
  const y = deltaX / distance;
  const qx = cameraWorld.x / cameraLength;
  const qy = cameraWorld.y / cameraLength;
  const qz = cameraWorld.z / cameraLength;
  const qw = cameraWorld.w / cameraLength;
  // Quaternion-vector rotation, expanded to avoid allocating vectors per event.
  const tx = -2 * qz * y;
  const ty = 2 * qz * x;
  const tz = 2 * (qx * y - qy * x);
  const worldX = x + qw * tx + qy * tz - qz * ty;
  const worldY = y + qw * ty + qz * tx - qx * tz;
  const worldZ = qw * tz + qx * ty - qy * tx;
  const halfAngle = ((distance / radius) % (Math.PI * 2)) / 2;
  const sine = Math.sin(halfAngle);
  return target
    .set(worldX * sine, worldY * sine, worldZ * sine, Math.cos(halfAngle))
    .normalize();
}

/** Convert a world-space delta back into a transformed parent's local basis. */
export function applyArcballDelta(
  currentLocal: Quaternion,
  deltaWorld: Quaternion,
  parentWorld = new Quaternion(),
  target = new Quaternion(),
): Quaternion {
  const parent = parentWorld.clone().normalize();
  const inverse = parent.clone().invert();
  return target
    .copy(inverse)
    .multiply(deltaWorld)
    .multiply(parent)
    .multiply(currentLocal)
    .normalize();
}
