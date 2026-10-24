import { useState } from "react";
import { assemblyCount, useGameStore } from "../state/gameStore";
import { useScreenStore } from "../state/screenStore";
import type { Difficulty } from "../types/game";
import { warmHandStage, warmStage } from "../scene/loadStage";
import { HAND_STAGE, STAGE_METADATA } from "../data/stageRegistry";
import { usePuzzle } from "../hooks/usePuzzle";
import type { PlayableStageId } from "../types/puzzle";
import { getPuzzle } from "../data/puzzles";
import { readStageSession } from "../utils/persistence";
import { DIFFICULTY_RULES } from "../data/config/gameplay";

export default function StageSelectScreen({ onSettings, onCredits, onHelp }: {
  onSettings: () => void; onCredits: () => void; onHelp: () => void;
}) {
  const [difficulty, setDifficulty] = useState<Difficulty>(useGameStore.getState().difficulty);
  const active = usePuzzle();
  const thoracic = getPuzzle("thoracic-t06");
  const hasSession = useGameStore((s) => s.hasSession);
  const placed = useGameStore(assemblyCount);
  const reduced = useGameStore((s) => s.reducedMotion);
  const begin = (stage: PlayableStageId) => {
    useGameStore.getState().newGame(difficulty, stage);
    useScreenStore.getState().go("stageIntro");
  };
  const resume = (stage: PlayableStageId) => {
    if (useGameStore.getState().resumeStage(stage)) {
      const s=useGameStore.getState();
      useScreenStore.getState().go(Object.values(s.pieces).every(p=>p.placed) ? "complete" : "game");
    }
  };
  return (
    <main className="stage-select-screen">
      <div className="menu-content">
        <p className="small-kicker">01 / STAGE SELECT</p>
        <h1>The architecture of touch.</h1>
        <p className="menu-description">독립된 뼈와 하나의 뼈 속 구조를 조립하며 배우는 해부학</p>
        <div className="menu-difficulty">
          <label htmlFor="difficulty">DIFFICULTY</label>
          <select id="difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
            {Object.entries(DIFFICULTY_RULES).map(([id, rule]) => <option key={id} value={id}>{rule.label}</option>)}
          </select>
        </div>
        <button className="stage-hand light-button" aria-label="Start HAND" onPointerEnter={() => { void warmHandStage().catch(() => {}); }} onFocus={() => { void warmHandStage().catch(() => {}); }} onClick={() => begin("hand")}>
          <span>{HAND_STAGE.name} <small>{HAND_STAGE.koreanName} · {HAND_STAGE.count} BONES</small></span><span aria-hidden="true">→</span>
        </button>
        <button className="stage-hand" aria-label="Start T06" onPointerEnter={() => { void warmStage("thoracic-t06").catch(() => {}); }} onFocus={() => { void warmStage("thoracic-t06").catch(() => {}); }} onClick={() => begin("thoracic-t06")}>
          <span>{thoracic.name} <small>{thoracic.koreanName} · {thoracic.count} LANDMARK PIECES</small></span><span aria-hidden="true">→</span>
        </button>
        <p className="muted">T06: 모든 난이도에서 같은 7개 영역을 조립합니다. 방향을 맞추는 도전이 달라집니다.</p>
        <button className="menu-continue" disabled={!hasSession} onClick={() => useScreenStore.getState().go(placed === active.count ? "complete" : "game")}>
          CONTINUE / 이어하기 {hasSession && <span>{active.name} · {placed} / {active.count}</span>}
        </button>
        {(["hand", "thoracic-t06"] as const).filter(id=>id!==active.id && readStageSession(id)?.hasSession).map(id=>
          <button className="menu-continue" key={id} onClick={()=>resume(id)}>{id === "hand" ? "HAND" : "T06"} 기록 불러오기</button>)}
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
