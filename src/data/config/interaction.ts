/** CSS-pixel sensitivity and model-space bounds. Keyboard/mouse share poses. */
export const INTERACTION_CONFIG = {
  initialMode: "move",
  arcballRadiusPx: 140,
  dragThresholdPx: 4,
  moveStep: 0.25,
  preciseMoveStep: 0.05,
  rotationDegrees: 15,
  preciseRotationDegrees: 5,
  bounds: { x: [-7, 7], y: [-3.7, 6], z: [-5, 5] },
} as const;
