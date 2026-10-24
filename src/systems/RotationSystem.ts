import type { Quat } from "../types/bone";

/** Unit quaternions are canonical game data; no rendering dependency is needed. */
export function normalizeQuaternion(rotation: readonly number[]): Quat {
  if (rotation.length !== 4 || !rotation.every(Number.isFinite))
    return [0, 0, 0, 1];
  const scale = Math.max(...rotation.map(Math.abs));
  if (!scale) return [0, 0, 0, 1];
  const scaled = rotation.map((value) => value / scale);
  const length = Math.hypot(...scaled);
  return scaled.map((value) => value / length) as Quat;
}

/** Apply a world-axis rotation (delta * current), retaining the mesh's center. */
export function rotateQuaternion(
  rotation: Quat,
  axis: "x" | "y" | "z",
  degrees: number,
): Quat {
  const [x, y, z, w] = normalizeQuaternion(rotation);
  if (!Number.isFinite(degrees)) return [x, y, z, w];
  const halfAngle = ((degrees % 360) * Math.PI) / 360;
  const sine = Math.sin(halfAngle);
  const dx = axis === "x" ? sine : 0;
  const dy = axis === "y" ? sine : 0;
  const dz = axis === "z" ? sine : 0;
  const dw = Math.cos(halfAngle);
  return normalizeQuaternion([
    dw * x + dx * w + dy * z - dz * y,
    dw * y - dx * z + dy * w + dz * x,
    dw * z + dx * y - dy * x + dz * w,
    dw * w - dx * x - dy * y - dz * z,
  ]);
}
