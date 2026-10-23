export const MAX_HINTS = 5;
export function hintAllowed(
  selected: boolean,
  revealed: boolean,
  remaining: number,
) {
  return selected && (revealed || remaining > 0);
}
