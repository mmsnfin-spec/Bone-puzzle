import { useEffect, useState } from "react";
import { handBones } from "../data/bones";
import { useGameStore, assemblyCount, namingCount } from "../state/gameStore";
import { useScreenStore } from "../state/screenStore";
import BoneNameInput, { rotateBone } from "../components/game/BoneNameInput";
import ProgressDisplay, {
  formatTime,
} from "../components/game/ProgressDisplay";
import type { Vec3 } from "../types/bone";
export default function GameScreen({ onHelp }: { onHelp: () => void }) {
  const placed = useGameStore(assemblyCount),
    named = useGameStore(namingCount),
    hints = useGameStore((s) => s.hintsRemaining),
    elapsed = useGameStore((s) => s.elapsedTime),
    difficulty = useGameStore((s) => s.difficulty),
    ghost = useGameStore((s) => s.ghostOpacity);
  const [notice, setNotice] = useState("뼈를 드래그해 반투명 골격에 놓으세요.");
  useEffect(() => {
    if (placed === handBones.length) useScreenStore.getState().go("complete");
  }, [placed]);
  useEffect(() => {
    let prev = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      if (document.visibilityState === "visible")
        useGameStore.getState().tick((now - prev) / 1000);
      prev = now;
    }, 1000);
    const visibility = () => {
      prev = performance.now();
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  useEffect(() => {
    const drop = (e: Event) =>
      setNotice(
        (e as CustomEvent).detail.snapped
          ? "정확한 위치입니다. 조각을 고정했습니다."
          : "아직 맞는 위치가 아닙니다. 위치와 회전을 확인해 보세요.",
      );
    window.addEventListener("bone-drop", drop);
    return () => window.removeEventListener("bone-drop", drop);
  }, []);
  useEffect(() => {
    const keydown = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement).closest(
          'input,textarea,select,button,[role="dialog"]',
        )
      )
        return;
      const s = useGameStore.getState(),
        id = s.selectedBoneId;
      if (!id || s.pieces[id].placed) return;
      const p = s.pieces[id],
        step = e.shiftKey ? 0.05 : 0.25;
      const pos = [...p.transform.position] as Vec3;
      const axes: Record<string, [number, number]> = {
        ArrowLeft: [0, -step],
        ArrowRight: [0, step],
        ArrowUp: [1, step],
        ArrowDown: [1, -step],
        PageUp: [2, -step],
        PageDown: [2, step],
      };
      if (axes[e.key]) {
        e.preventDefault();
        const [axis, delta] = axes[e.key];
        pos[axis] = Math.max(
          axis === 1 ? -3.7 : -7,
          Math.min(axis === 1 ? 6 : 7, pos[axis] + delta),
        );
        s.move(id, { ...p.transform, position: pos });
      }
      if (e.key === "q" || e.key === "e") {
        e.preventDefault();
        rotateBone(id, "z", (e.key === "q" ? -1 : 1) * (e.shiftKey ? 5 : 15));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const snapped = s.drop(id, p.transform);
        setNotice(
          snapped
            ? "정확한 위치입니다. 조각을 고정했습니다."
            : "아직 맞는 위치가 아닙니다.",
        );
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, []);
  return (
    <div className="game-screen">
      <header className="game-header">
        <div className="game-brand">
          <button
            className="text-button"
            onClick={() => useScreenStore.getState().go("title")}
            aria-label="타이틀로 돌아가기"
          >
            ←
          </button>
          <span className="mini-wordmark">B/P</span>
          <span className="header-divider" />
          <strong>HAND</strong>
          <small>RIGHT · {difficulty.toUpperCase()}</small>
        </div>
        <div className="game-meta">
          <span className="time">{formatTime(elapsed)}</span>
          <span className="hint-counter">✧ {hints} / 5</span>
          <button
            className="text-button"
            onClick={() => {
              useGameStore.getState().newGame();
              useScreenStore.getState().go("stageIntro");
            }}
          >
            Restart ↻
          </button>
          <button
            className="circle-button"
            onClick={onHelp}
            aria-label="조작 도움말"
          >
            ?
          </button>
        </div>
      </header>
      <div className="scene-heading">
        <span className="small-kicker">ASSEMBLE THE ANATOMY</span>
        <h1>The hand.</h1>
        <span>8 CARPALS · 5 METACARPALS · 14 PHALANGES</span>
      </div>
      <aside className="game-sidebar">
        <ProgressDisplay placed={placed} named={named} total={27} />
        <BoneNameInput />
        <PieceInventory />
      </aside>
      <div className="scene-bottom">
        <div className="scene-controls">
          <button
            onClick={() => window.dispatchEvent(new Event("reset-camera"))}
            className="text-button"
          >
            ↺ 시점 초기화
          </button>
          <label>
            GHOST{" "}
            <input
              type="range"
              aria-label="고스트 투명도"
              min=".05"
              max=".25"
              step=".01"
              value={ghost}
              onChange={(e) =>
                useGameStore.getState().setGhost(Number(e.target.value))
              }
            />
          </label>
        </div>
        <p className="game-notice" role="status">
          {notice}
        </p>
        <div className="control-legend">
          <span>DRAG · 조각 이동</span>
          <span>ORBIT · 빈 공간 드래그</span>
          <span>ZOOM · 스크롤</span>
        </div>
      </div>
    </div>
  );
}
function PieceInventory() {
  const selected = useGameStore((s) => s.selectedBoneId),
    pieces = useGameStore((s) => s.pieces);
  return (
    <section className="inventory" aria-label="뼈 조각 목록">
      <div className="inventory-heading">
        <span className="small-kicker">PIECE INDEX</span>
        <small>✓ 배치 · • 이름 확인</small>
      </div>
      {(["carpals", "metacarpals", "phalanges"] as const).map((category) => (
        <div className="inventory-group" key={category}>
          <h3>{category.toUpperCase()}</h3>
          <div className="piece-grid">
            {handBones.map(
              (b, i) =>
                b.category === category && (
                  <button
                    key={b.id}
                    aria-label={`조각 ${String(i + 1).padStart(2, "0")} 선택`}
                    aria-pressed={selected === b.id}
                    className={`${selected === b.id ? "selected" : ""} ${pieces[b.id].placed ? "placed" : ""}`}
                    onClick={(e) => {
                      useGameStore.getState().select(b.id);
                      e.currentTarget.blur();
                    }}
                  >
                    {pieces[b.id].placed ? "✓" : String(i + 1).padStart(2, "0")}
                    {pieces[b.id].nameVerified && (
                      <span className="verified-dot" />
                    )}
                  </button>
                ),
            )}
          </div>
        </div>
      ))}
    </section>
  );
}
