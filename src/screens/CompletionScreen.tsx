import { useGameStore, namingCount } from "../state/gameStore";
import { useScreenStore } from "../state/screenStore";
import { formatTime } from "../components/game/ProgressDisplay";
import { usePuzzle } from "../hooks/usePuzzle";
import { HINT_CONFIG } from "../data/config/gameplay";
export default function CompletionScreen() {
  const HAND_STAGE = usePuzzle();
  const time = useGameStore((s) => s.elapsedTime),
    hints = useGameStore((s) => s.hintsRemaining),
    named = useGameStore(namingCount);
  return (
    <div className="completion-screen">
      <div className="completion-heading">
        <p className="eyebrow">ALL {HAND_STAGE.count} PIECES, IN PLACE.</p>
        <h1>Complete.</h1>
        <p>
          구조를 완성했습니다.
          <br />
          {HAND_STAGE.puzzleType === "landmark" ? "하나의 척추뼈, 일곱 영역의 관계를 살펴보세요." : "이제 손의 움직임을 상상해 보세요."}
        </p>
      </div>
      <div className="completion-panel">
        <span className="small-kicker">{HAND_STAGE.name} / SESSION RESULT</span>
        <dl>
          <div>
            <dt>ASSEMBLED</dt>
            <dd>
              {HAND_STAGE.count} <small>/ {HAND_STAGE.count}</small>
            </dd>
          </div>
          <div>
            <dt>TIME</dt>
            <dd>{formatTime(time)}</dd>
          </div>
          <div>
            <dt>HINTS USED</dt>
            <dd>
              {HINT_CONFIG.maximumUniqueBones - hints} <small>/ {HINT_CONFIG.maximumUniqueBones}</small>
            </dd>
          </div>
          <div>
            <dt>NAMES VERIFIED</dt>
            <dd>
              {named} <small>/ {HAND_STAGE.count}</small>
            </dd>
          </div>
        </dl>
        <button
          className="light-button"
          onClick={() => {
            useGameStore.getState().newGame();
            useScreenStore.getState().go("stageIntro");
          }}
        >
          Replay <span>↗</span>
        </button>
        <button
          className="text-button"
          onClick={() => useScreenStore.getState().go("menu")}
        >
          Back to Stage Select <span>→</span>
        </button>
      </div>
      <p className="completion-caption">
        오른쪽 드래그 · 휠 · 가운데 드래그로 완성된 골격을 관찰하세요.
      </p>
    </div>
  );
}
