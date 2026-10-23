import { create } from "zustand";
import type { Screen } from "../types/game";
const transitions: Record<Screen, Screen[]> = {
  splash: ["title"],
  title: ["stageIntro", "game", "complete"],
  stageIntro: ["game", "title"],
  game: ["complete", "stageIntro", "title"],
  complete: ["stageIntro", "title", "game"],
};
export const useScreenStore = create<{
  screen: Screen;
  go: (next: Screen) => void;
}>((set, get) => ({
  screen: "splash",
  go: (next) => {
    if (transitions[get().screen].includes(next)) set({ screen: next });
  },
}));
