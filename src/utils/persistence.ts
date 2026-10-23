import type { BonePlayState } from "../types/bone";
import { handBones } from "../data/bones";
export const STORAGE_KEY = "bone-puzzle-3d:hand:v1";
export function freshPieces(): Record<string, BonePlayState> {
  return Object.fromEntries(
    handBones.map((b) => [
      b.id,
      {
        transform: structuredClone(b.initialTransform),
        placed: false,
        userLabel: "",
        nameVerified: false,
        hintShown: false,
      },
    ]),
  );
}
const numericArray = (v: unknown, n: number) =>
  Array.isArray(v) &&
  v.length === n &&
  v.every(
    (x) => typeof x === "number" && Number.isFinite(x) && Math.abs(x) < 100,
  );
export function restorePieces(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const pieces = value as Record<string, BonePlayState>;
  if (Object.keys(pieces).length !== handBones.length) return null;
  for (const bone of handBones) {
    const p = pieces[bone.id];
    if (
      !p ||
      !numericArray(p.transform?.position, 3) ||
      !numericArray(p.transform?.rotation, 4) ||
      Math.abs(Math.hypot(...p.transform.rotation) - 1) > 0.01 ||
      typeof p.userLabel !== "string" ||
      p.userLabel.length > 120 ||
      typeof p.placed !== "boolean" ||
      typeof p.nameVerified !== "boolean" ||
      typeof p.hintShown !== "boolean"
    )
      return null;
    if (p.placed)
      p.transform = {
        position: [...bone.targetPosition],
        rotation: [...bone.targetRotation],
      };
  }
  if (Object.values(pieces).filter((p) => p.hintShown).length > 5) return null;
  return pieces;
}
