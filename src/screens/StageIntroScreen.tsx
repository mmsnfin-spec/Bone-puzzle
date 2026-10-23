import { useGameStore } from "../state/gameStore";
import { useScreenStore } from "../state/screenStore";
import { TIMING } from "../systems/AnimationSystem";
export default function StageIntroScreen() {
  const phase = useGameStore((s) => s.animationStatus);
  return (
    <div className="intro-screen">
      <span className="intro-caption">01 / THE HAND</span>
      {phase === "typography" && (
        <div
          className="stage-typography"
          style={{ animationDuration: `${TIMING.typography}ms` }}
          aria-label="HAND"
        >
          HAND
        </div>
      )}
      <p className="intro-subtitle">
        {phase === "assembled"
          ? "27 bones. One extraordinary structure."
          : phase === "falling"
            ? "Every structure begins with a piece."
            : ""}
      </p>
      <button
        className="skip-intro text-button"
        onClick={() => {
          useGameStore.getState().setAnimation("finished");
          useScreenStore.getState().go("game");
        }}
      >
        Skip intro <span>→</span>
      </button>
    </div>
  );
}
