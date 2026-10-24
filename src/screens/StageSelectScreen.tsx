import { useState } from "react";
import { assemblyCount, useGameStore } from "../state/gameStore";
import { useScreenStore } from "../state/screenStore";
import type { Difficulty } from "../types/game";
import { warmHandStage } from "../scene/loadStage";
import { HAND_STAGE, STAGE_METADATA } from "../data/stageRegistry";
import { DIFFICULTY_RULES } from "../data/config/gameplay";

export default function StageSelectScreen({ onSettings, onCredits, onHelp }: {
  onSettings: () => void; onCredits: () => void; onHelp: () => void;
}) {
  const [difficulty, setDifficulty] = useState<Difficulty>(useGameStore.getState().difficulty);
  const hasSession = useGameStore((s) => s.hasSession);
  const placed = useGameStore(assemblyCount);
  const reduced = useGameStore((s) => s.reducedMotion);
  const begin = () => {
    useGameStore.getState().newGame(difficulty);
    useScreenStore.getState().go("stageIntro");
  };
  return (
    <main className="stage-select-screen">
      <div className="menu-content">
        <p className="small-kicker">01 / STAGE SELECT</p>
        <h1>The architecture of touch.</h1>
        <p className="menu-description">실제 해부학 데이터로 완성하는 오른손 골격</p>
        <div className="menu-difficulty">
          <label htmlFor="difficulty">DIFFICULTY</label>
          <select id="difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
            {Object.entries(DIFFICULTY_RULES).map(([id, rule]) => <option key={id} value={id}>{rule.label} — {rule.description}</option>)}
          </select>
        </div>
        <button className="stage-hand light-button" aria-label="Start HAND" onPointerEnter={() => { void warmHandStage().catch(() => {}); }} onFocus={() => { void warmHandStage().catch(() => {}); }} onClick={begin}>
          <span>{HAND_STAGE.name} <small>{HAND_STAGE.koreanName} · {HAND_STAGE.count} BONES</small></span><span aria-hidden="true">→</span>
        </button>
        <button className="menu-continue" disabled={!hasSession} onClick={() => useScreenStore.getState().go(placed === HAND_STAGE.count ? "complete" : "game")}>
          CONTINUE / 이어하기 {hasSession && <span>{placed} / {HAND_STAGE.count}</span>}
        </button>
        <p className="small-kicker coming-caption">COMING SOON</p>
        <div className="future-stages" aria-label="준비 중인 스테이지">
          {STAGE_METADATA.filter((stage) => !stage.available).map((stage) => <button key={stage.id} disabled>{stage.name}</button>)}
        </div>
        <label className="motion-option"><input type="checkbox" checked={reduced} onChange={(e) => useGameStore.getState().setMotion(e.target.checked)} />모션 줄이기</label>
        <nav className="menu-links" aria-label="메인 메뉴">
          <button onClick={onSettings}>설정</button>
          <button onClick={onCredits}>About / Credits</button>
          <button onClick={onHelp}>조작 안내</button>
          <button onClick={() => useScreenStore.getState().go("title")}>타이틀</button>
        </nav>
      </div>
    </main>
  );
}
