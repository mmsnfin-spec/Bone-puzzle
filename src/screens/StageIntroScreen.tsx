import { useGameStore } from "../state/gameStore";
import { useScreenStore } from "../state/screenStore";
import { TIMING } from "../systems/AnimationSystem";
import { HAND_STAGE } from "../data/stageRegistry";
export default function StageIntroScreen() {
  const phase = useGameStore((s) => s.animationStatus);
  return (
    <div className="intro-screen">
      <span className="intro-caption">01 / THE {HAND_STAGE.name}</span>
      {phase === "typography" && (
        <div
          className="stage-typography"
          style={{ animationDuration: `${TIMING.typography}ms` }}
          aria-label={HAND_STAGE.name}
        >
          {HAND_STAGE.name}
        </div>
      )}
      <p className="intro-subtitle">
        {phase === "assembled"
          ? `${HAND_STAGE.count} bones. One extraordinary structure.`
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
