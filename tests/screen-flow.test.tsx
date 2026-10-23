import {
  cleanup,
  fireEvent,
  render,
  screen,
  act,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { useScreenStore } from "../src/state/screenStore";
import { useGameStore } from "../src/state/gameStore";
import TitleScreen from "../src/screens/TitleScreen";
import StageIntroScreen from "../src/screens/StageIntroScreen";
import BoneNameInput from "../src/components/game/BoneNameInput";
import { handBones } from "../src/data/bones";
import { introPhase, INTRO_DURATION } from "../src/systems/AnimationSystem";
afterEach(() => cleanup());
beforeEach(() => {
  useScreenStore.setState({ screen: "title" });
  useGameStore.getState().newGame();
});
describe("screen flow and learning UI", () => {
  it("requires Start and leaves unavailable stages disabled", () => {
    render(<TitleScreen onCredits={vi.fn()} />);
    expect(useScreenStore.getState().screen).toBe("title");
    expect(screen.getByRole("button", { name: /FOOT/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /VERTEBRA/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /^Start/ }));
    expect(useScreenStore.getState().screen).toBe("stageIntro");
  });
  it("allows only valid state transitions", () => {
    useScreenStore.setState({ screen: "splash" });
    useScreenStore.getState().go("game");
    expect(useScreenStore.getState().screen).toBe("splash");
    useScreenStore.getState().go("title");
    useScreenStore.getState().go("stageIntro");
    useScreenStore.getState().go("game");
    useScreenStore.getState().go("complete");
    expect(useScreenStore.getState().screen).toBe("complete");
  });
  it("shows HAND only during the typography phase and supports skipping", () => {
    useScreenStore.setState({ screen: "stageIntro" });
    const { rerender } = render(<StageIntroScreen />);
    expect(screen.queryByLabelText("HAND")).not.toBeInTheDocument();
    act(() => useGameStore.getState().setAnimation("typography"));
    rerender(<StageIntroScreen />);
    expect(screen.getByLabelText("HAND")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Skip intro/ }));
    expect(useScreenStore.getState().screen).toBe("game");
    expect(introPhase(INTRO_DURATION + 60_000)).toBe("finished");
  });
  it("saves, checks, reveals hints and maintains independent notes in actual inputs", () => {
    const capitate = handBones.find((b) => b.englishName === "Capitate")!;
    useGameStore.getState().select(capitate.id);
    render(<BoneNameInput />);
    const input = screen.getByLabelText("ENGLISH ANATOMICAL NAME");
    fireEvent.change(input, { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: "Save note" }));
    expect(useGameStore.getState().pieces[capitate.id].userLabel).toBe("wrong");
    fireEvent.click(screen.getByRole("button", { name: /Check/ }));
    expect(
      screen.getByRole("status", { name: "이름 확인 결과" }),
    ).toHaveTextContent("아직 맞지");
    fireEvent.click(screen.getByRole("button", { name: /이름 힌트 보기/ }));
    expect(useGameStore.getState().hintsRemaining).toBe(4);
    expect(useGameStore.getState().pieces[capitate.id].nameVerified).toBe(
      false,
    );
    fireEvent.change(input, { target: { value: "  CAPITATE  " } });
    fireEvent.click(screen.getByRole("button", { name: /Check/ }));
    expect(
      screen.getByRole("status", { name: "이름 확인 결과" }),
    ).toHaveTextContent("정답입니다");
    act(() => useGameStore.getState().select(handBones[0].id));
    expect(screen.getByLabelText("ENGLISH ANATOMICAL NAME")).toHaveValue("");
    act(() => useGameStore.getState().select(capitate.id));
    expect(screen.getByLabelText("ENGLISH ANATOMICAL NAME")).toHaveValue(
      "  CAPITATE  ",
    );
  });
});
