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
  const landmarkRule = bone.puzzleType === "landmark" ? bone.difficulty?.[difficulty] : undefined;
  if (bone.puzzleType === "landmark" && !landmarkRule) return false;
  const angle = landmarkRule ? landmarkRule.rotationTolerance * Math.PI / 180 : rule.angleRadians;
  const tolerance = bone.snapDistance * (landmarkRule?.distanceMultiplier ?? rule.distanceMultiplier);
  return (
    distance <= tolerance &&
    (angle === null ||
      quaternionAngle(transform.rotation, bone.targetRotation) <=
        angle)
  );
}
