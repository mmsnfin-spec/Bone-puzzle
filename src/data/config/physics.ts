/** Intro-only dynamics; fixed-step simulation never runs during assembly. */
export const INTRO_PHYSICS = {
  gravity: [0, -15, 0] as [number, number, number],
  fixedStepSeconds: 1 / 60,
  maximumFrameDeltaSeconds: 0.1,
  floorPosition: [0, -4.25, 0] as [number, number, number],
  floorHalfSize: [16, 0.15, 12] as [number, number, number],
  floorSurfaceY: -4.08,
  restitution: 0.22,
  friction: 0.9,
  linearDamping: 0.6,
  angularDamping: 0.8,
} as const;
