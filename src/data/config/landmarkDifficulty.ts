/** Thoracic prototype only. HAND's established rules remain unchanged. */
export const LANDMARK_DIFFICULTY = {
  easy: { rotationRange: "small", axisDegrees: 12, rotationTolerance: 25, distanceMultiplier: 1 },
  normal: { rotationRange: "medium", minimumAxisDegrees: 45, maximumAxisDegrees: 75, rotationTolerance: 15, distanceMultiplier: 1 },
  hard: { rotationRange: "uniform_random_3d", rotationTolerance: 8, distanceMultiplier: 1 },
} as const;
