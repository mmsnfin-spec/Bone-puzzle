import type { BoneDefinition, Transform } from "../types/bone";
import type { Difficulty } from "../types/game";
import { DIFFICULTY_RULES } from "../data/config/gameplay";
export function quaternionAngle(a: number[], b: number[]) {
  const norm = Math.hypot(...a) * Math.hypot(...b);
  if (!norm) return Infinity;
  return (
    2 *
    Math.acos(
      Math.min(1, Math.abs(a.reduce((s, v, i) => s + v * b[i], 0) / norm)),
    )
  );
}
export function canSnap(
  bone: BoneDefinition,
  transform: Transform,
  difficulty: Difficulty,
) {
  if (![...transform.position, ...transform.rotation].every(Number.isFinite))
    return false;
  const distance = Math.hypot(
    ...transform.position.map((v, i) => v - bone.targetPosition[i]),
  );
  const rule = DIFFICULTY_RULES[difficulty];
  const tolerance = bone.snapDistance * rule.distanceMultiplier;
  return (
    distance <= tolerance &&
    (rule.angleRadians === null ||
      quaternionAngle(transform.rotation, bone.targetRotation) <=
        rule.angleRadians)
  );
}
