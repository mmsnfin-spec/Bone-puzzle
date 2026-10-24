import { HINT_CONFIG } from "../data/config/gameplay";
export const MAX_HINTS = HINT_CONFIG.maximumUniqueBones;
export function hintAllowed(
  selected: boolean,
  revealed: boolean,
  remaining: number,
) {
  return selected && (revealed || remaining > 0);
}
