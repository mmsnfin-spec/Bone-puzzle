export { ANIMATION_TIMING as TIMING } from "../data/config/gameplay";
import { ANIMATION_TIMING as TIMING } from "../data/config/gameplay";
export const INTRO_DURATION =
  TIMING.reveal + TIMING.falling + TIMING.settle + TIMING.typography;
export function introPhase(ms: number) {
  if (ms < TIMING.reveal) return "assembled" as const;
  if (ms < TIMING.reveal + TIMING.falling) return "falling" as const;
  if (ms < TIMING.reveal + TIMING.falling + TIMING.settle)
    return "settling" as const;
  if (ms < INTRO_DURATION) return "typography" as const;
  return "finished" as const;
}
