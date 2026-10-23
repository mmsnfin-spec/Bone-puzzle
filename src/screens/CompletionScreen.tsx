import { useGameStore, namingCount } from "../state/gameStore";
import { useScreenStore } from "../state/screenStore";
import { formatTime } from "../components/game/ProgressDisplay";
export default function CompletionScreen() {
  const time = useGameStore((s) => s.elapsedTime),
    hints = useGameStore((s) => s.hintsRemaining),
    named = useGameStore(namingCount);
  return (
    <div className="completion-screen">
      <div className="completion-heading">
        <p className="eyebrow">ALL 27 PIECES, IN PLACE.</p>
        <h1>Complete.</h1>
        <p>
          구조를 완성했습니다.
          <br />
          이제 손의 움직임을 상상해 보세요.
        </p>
      </div>
      <div className="completion-panel">
        <span className="small-kicker">HAND / SESSION RESULT</span>
        <dl>
          <div>
            <dt>ASSEMBLED</dt>
            <dd>
              27 <small>/ 27</small>
            </dd>
          </div>
          <div>
            <dt>TIME</dt>
            <dd>{formatTime(time)}</dd>
          </div>
          <div>
            <dt>HINTS USED</dt>
            <dd>
              {5 - hints} <small>/ 5</small>
            </dd>
          </div>
          <div>
            <dt>NAMES VERIFIED</dt>
            <dd>
              {named} <small>/ 27</small>
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
          onClick={() => useScreenStore.getState().go("title")}
        >
          Back to title <span>→</span>
        </button>
      </div>
      <p className="completion-caption">
        드래그하여 완성된 골격을 자유롭게 관찰하세요.
      </p>
    </div>
  );
}
