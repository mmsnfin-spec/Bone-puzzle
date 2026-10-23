import { useState } from "react";
import { stages } from "../data/stages";
import { useGameStore, assemblyCount } from "../state/gameStore";
import { useScreenStore } from "../state/screenStore";
import type { Difficulty } from "../types/game";
export default function TitleScreen({ onCredits }: { onCredits: () => void }) {
  const [difficulty, setDifficulty] = useState<Difficulty>(
    useGameStore.getState().difficulty,
  );
  const hasSession = useGameStore((s) => s.hasSession);
  const placed = useGameStore(assemblyCount);
  const reduced = useGameStore((s) => s.reducedMotion);
  const start = () => {
    useGameStore.getState().newGame(difficulty);
    useScreenStore.getState().go("stageIntro");
  };
  return (
    <div className="title-screen">
      <header className="title-header">
        <a className="wordmark" href="#" onClick={(e) => e.preventDefault()}>
          B/P <span>ANATOMY, PIECE BY PIECE.</span>
        </a>
        <button className="text-button" onClick={onCredits}>
          About & credits <span>↗</span>
        </button>
      </header>
      <main className="title-main">
        <p className="eyebrow">AN INTERACTIVE ANATOMY EXPERIENCE</p>
        <h1>
          BONE
          <br />
          PUZZLE<span className="sup-title">3D</span>
        </h1>
        <p className="title-description">
          손끝에서 시작하는 해부학.
          <br />
          하나씩 조립하고, 구조를 이해하세요.
        </p>
        <div className="title-detail">
          <span className="detail-rule" />
          <span>
            01 — RIGHT HAND
            <br />
            <small>27 bones. One extraordinary structure.</small>
          </span>
        </div>
      </main>
      <div className="anatomy-caption">
        <span>FIG. 01</span>
        <span>
          MANUS DEXTRA
          <br />
          <small>BodyParts3D · anatomical model</small>
        </span>
      </div>
      <footer className="title-footer">
        <div className="stage-selector" aria-label="스테이지 선택">
          {stages.map((s, i) => (
            <button
              key={s.id}
              disabled={!s.available}
              className={s.available ? "stage-option active" : "stage-option"}
              aria-pressed={s.available}
            >
              <span className="stage-index">0{i + 1}</span>
              <span>
                {s.name}
                <small>
                  {s.available ? "27 BONES · READY" : "COMING SOON"}
                </small>
              </span>
              {s.available && <span className="active-dot" />}
            </button>
          ))}
        </div>
        <div className="start-row">
          <div className="difficulty-options">
            <label htmlFor="difficulty">DIFFICULTY</label>
            <select
              id="difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            >
              <option value="easy">Easy — 위치 맞추기</option>
              <option value="normal">Normal — 위치 + 회전</option>
              <option value="hard">Hard — 정밀 조립</option>
            </select>
            <label className="motion-option">
              <input
                type="checkbox"
                checked={reduced}
                onChange={(e) =>
                  useGameStore.getState().setMotion(e.target.checked)
                }
              />
              모션 줄이기
            </label>
          </div>
          <div className="start-actions">
            {hasSession && (
              <button
                className="text-button resume"
                onClick={() =>
                  useScreenStore
                    .getState()
                    .go(placed === 27 ? "complete" : "game")
                }
              >
                이어하기 <span>{placed}/27</span>
              </button>
            )}
            <button className="start-button" onClick={start}>
              Start <span>↗</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
