import { create } from "zustand";
import type { Screen } from "../types/game";
const transitions: Record<Screen, Screen[]> = {
  splash: ["title"],
  title: ["menu"],
  menu: ["stageIntro", "game", "complete", "title"],
  stageIntro: ["game", "menu", "title"],
  game: ["paused", "complete", "stageIntro", "menu", "title"],
  paused: ["game", "stageIntro", "menu", "title"],
  complete: ["stageIntro", "menu", "title", "game"],
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
