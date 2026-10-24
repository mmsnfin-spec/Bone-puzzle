import { describe, expect, it } from "vitest";
import { useScreenStore } from "../src/state/screenStore";
import type { Screen } from "../src/types/game";

describe("screen transition boundaries", () => {
  it("routes a single title transition through the menu", () => {
    useScreenStore.setState({ screen: "title" });
    useScreenStore.getState().go("game");
    expect(useScreenStore.getState().screen).toBe("title");
    useScreenStore.getState().go("menu");
    useScreenStore.getState().go("stageIntro");
    useScreenStore.getState().go("game");
    useScreenStore.getState().go("paused");
    expect(useScreenStore.getState().screen).toBe("paused");
    useScreenStore.getState().go("game");
    useScreenStore.getState().go("complete");
    useScreenStore.getState().go("menu");
    expect(useScreenStore.getState().screen).toBe("menu");
  });
  it("keeps intro, pause, replay, continue and return transitions available", () => {
    const scenarios: [Screen, Screen][] = [
      ["splash", "title"], ["title", "menu"], ["menu", "game"],
      ["menu", "complete"], ["stageIntro", "menu"], ["game", "paused"],
      ["paused", "stageIntro"], ["paused", "menu"], ["paused", "title"],
      ["complete", "stageIntro"], ["complete", "game"],
    ];
    for (const [from, to] of scenarios) {
      useScreenStore.setState({ screen: from });
      useScreenStore.getState().go(to);
      expect(useScreenStore.getState().screen).toBe(to);
    }
    useScreenStore.setState({ screen: "splash" });
    useScreenStore.getState().go("paused");
    expect(useScreenStore.getState().screen).toBe("splash");
  });
});
