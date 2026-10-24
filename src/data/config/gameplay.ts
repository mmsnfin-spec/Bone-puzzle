/** Original snap rules and v1 save contract; independent of renderer/physics. */
export const DIFFICULTY_RULES = {
  easy: { label: "Easy", description: "위치 중심 · 회전 자동 보정", distanceMultiplier: 1, angleRadians: null },
  normal: { label: "Normal", description: "위치 + 회전", distanceMultiplier: 0.75, angleRadians: 0.35 },
  hard: { label: "Hard", description: "엄격한 위치 + 회전", distanceMultiplier: 0.5, angleRadians: 0.16 },
} as const;
export const GUIDE_CONFIG = { enabled: true, opacity: 0.2, minimum: 0.05, maximum: 0.25, step: 0.01 } as const;
export const HINT_CONFIG = { maximumUniqueBones: 5 } as const;
export const SAVE_CONFIG = { key: "bone-puzzle-3d:hand:v1", version: 1, timerIntervalMs: 5_000, maximumLabelLength: 120, maximumCoordinateMagnitude: 100 } as const;
export const ANIMATION_TIMING = { splash: 2100, reveal: 1700, falling: 2600, settle: 900, typography: 1500, snap: 220 } as const;
