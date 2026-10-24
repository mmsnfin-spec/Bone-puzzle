import { useGameStore } from "../state/gameStore";
import { getPuzzle } from "../data/puzzles";
/** Subscribe only to the stage identity, never to frame-rate transform changes. */
export function usePuzzle() {
  return getPuzzle(useGameStore(s=>s.stageId));
}
