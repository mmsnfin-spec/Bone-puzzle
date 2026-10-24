import { useGameStore, flushGameSave } from "../state/gameStore";
import { useScreenStore } from "../state/screenStore";

import { usePuzzle } from "../hooks/usePuzzle";

export default function PauseScreen({ onSettings, onHelp }: { onSettings: () => void; onHelp: () => void }) {
  const puzzle = usePuzzle();
  return (
    <div className="pause-screen" role="dialog" aria-modal="true" aria-labelledby="pause-title">
      <section className="pause-panel">
        <p className="small-kicker">{puzzle.name} / SESSION PAUSED</p>
        <h1 id="pause-title">Paused.</h1>
        <button className="light-button" autoFocus onClick={() => useScreenStore.getState().go("game")}>재개 · Esc</button>
        <button onClick={onSettings}>설정</button>
        <button onClick={onHelp}>조작 안내</button>
        <button onClick={() => { useGameStore.getState().newGame(); useScreenStore.getState().go("stageIntro"); }}>Restart · 다시 시작</button>
        <button onClick={() => { flushGameSave(); useScreenStore.getState().go("menu"); }}>Stage Select · 스테이지 선택</button>
      </section>
    </div>
  );
}
