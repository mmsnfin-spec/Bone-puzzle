import { useEffect, useState } from "react";
import { usePuzzle } from "../hooks/usePuzzle";
import { GUIDE_CONFIG, HINT_CONFIG } from "../data/config/gameplay";
import { INTERACTION_CONFIG } from "../data/config/interaction";
import { useGameStore, assemblyCount, namingCount, flushGameSave } from "../state/gameStore";
import { useScreenStore } from "../state/screenStore";
import BoneNameInput from "../components/game/BoneNameInput";
import ProgressDisplay, { formatTime } from "../components/game/ProgressDisplay";
import type { Vec3 } from "../types/bone";

export default function GameScreen({ onHelp }: { onHelp: () => void }) {
  const puzzle = usePuzzle();
  const handBones = puzzle.bones;
  const placed = useGameStore(assemblyCount), named = useGameStore(namingCount);
  const hints = useGameStore((s) => s.hintsRemaining);
  const elapsed = useGameStore((s) => s.elapsedTime);
  const difficulty = useGameStore((s) => s.difficulty);
  const ghost = useGameStore((s) => s.ghostOpacity);
  const guide = useGameStore((s) => s.guideEnabled);
  const mode = useGameStore((s) => s.interactionMode);
  const [notice, setNotice] = useState("조각을 선택하고 이동하거나 회전해 정확한 위치에 놓으세요.");
  useEffect(() => {
    if (placed === handBones.length) useScreenStore.getState().go("complete");
  }, [placed]);
  useEffect(() => {
    let previous = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      if (document.visibilityState === "visible" && useScreenStore.getState().screen === "game") useGameStore.getState().tick((now - previous) / 1000);
      previous = now;
    }, 1000);
    const visibility = () => { previous = performance.now(); if (document.visibilityState !== "visible") flushGameSave(); };
    document.addEventListener("visibilitychange", visibility);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", visibility); flushGameSave(); };
  }, []);
  useEffect(() => {
    const drop = (event: Event) => setNotice((event as CustomEvent).detail.snapped ? "정확한 위치입니다. 조각을 고정했습니다." : "아직 맞는 위치가 아닙니다. 위치와 회전을 확인해 보세요.");
    window.addEventListener("bone-drop", drop);
    return () => window.removeEventListener("bone-drop", drop);
  }, []);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if ((event.target as HTMLElement).closest('input,textarea,select,[contenteditable="true"],[role="dialog"]') || document.querySelector("dialog[open]")) return;
      const store = useGameStore.getState();
      if (store.dragging) return;
      const key = event.key.toLowerCase();
      if (key === "g") { event.preventDefault(); if (!event.repeat) store.setGuide(!store.guideEnabled); return; }
      const id = store.selectedBoneId;
      if (!id || store.pieces[id].placed) return;
      const piece = store.pieces[id];
      const step = event.shiftKey ? INTERACTION_CONFIG.preciseMoveStep : INTERACTION_CONFIG.moveStep;
      const position = [...piece.transform.position] as Vec3;
      const axes: Record<string, [number, number]> = {
        ArrowLeft: [0, -step], ArrowRight: [0, step], ArrowUp: [1, step], ArrowDown: [1, -step], PageUp: [2, -step], PageDown: [2, step],
      };
      if (axes[event.key]) {
        event.preventDefault();
        const [axis, delta] = axes[event.key];
        const key = (["x", "y", "z"] as const)[axis];
        const [minimum, maximum] = INTERACTION_CONFIG.bounds[key];
        position[axis] = Math.max(minimum, Math.min(maximum, position[axis] + delta));
        store.move(id, { ...piece.transform, position });
      } else if (["x", "y", "z", "q", "e"].includes(key)) {
        event.preventDefault();
        const axis = key === "q" || key === "e" ? "z" : key as "x" | "y" | "z";
        store.rotate(id, axis, (key === "q" ? -1 : 1) * (event.shiftKey ? INTERACTION_CONFIG.preciseRotationDegrees : INTERACTION_CONFIG.rotationDegrees));
      } else if (event.key === "Enter" && !(event.target as HTMLElement).closest("button")) {
        event.preventDefault();
        const snapped = store.drop(id, piece.transform);
        setNotice(snapped ? "정확한 위치입니다. 조각을 고정했습니다." : "아직 맞는 위치가 아닙니다.");
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, []);
  return (
    <div className="game-screen">
      <header className="game-header">
        <div className="game-brand"><strong>{puzzle.name}</strong><small>{puzzle.puzzleType === "landmark" ? "LANDMARK" : "RIGHT"} · {difficulty.toUpperCase()}</small></div>
        <div className="game-meta">
          <span className="time">{formatTime(elapsed)}</span>
          <span className="hint-counter">HINTS {hints} / {HINT_CONFIG.maximumUniqueBones}</span>
          <button onClick={() => { flushGameSave(); useScreenStore.getState().go("paused"); }}>Pause · Esc</button>
          <button onClick={() => { useGameStore.getState().newGame(); useScreenStore.getState().go("stageIntro"); }}>Restart ↻</button>
          <button className="circle-button" onClick={onHelp} aria-label="조작 도움말">?</button>
        </div>
      </header>
      <aside className="game-sidebar">
        <ProgressDisplay placed={placed} named={named} total={handBones.length} />
        <BoneNameInput />
        <PieceInventory />
      </aside>
      <div className="scene-bottom">
        <div className="scene-controls">
          <div className="interaction-modes" role="group" aria-label="조각 조작 모드">
            <button aria-label="이동 모드" aria-pressed={mode === "move"} onClick={(event) => { useGameStore.getState().setInteractionMode("move"); event.currentTarget.blur(); }}>MOVE</button>
            <button aria-label="회전 모드" aria-pressed={mode === "rotate"} onClick={(event) => { useGameStore.getState().setInteractionMode("rotate"); event.currentTarget.blur(); }}>ROTATE</button>
          </div>
          <button className="guide-toggle" aria-label="조립 가이드" aria-pressed={guide} onClick={(event) => { useGameStore.getState().setGuide(!guide); event.currentTarget.blur(); }}>GUIDE {guide ? "ON" : "OFF"} · G</button>
          <label className={guide ? "opacity-control" : "opacity-control disabled"}>투명도 <input type="range" aria-label="고스트 투명도" min={GUIDE_CONFIG.minimum} max={GUIDE_CONFIG.maximum} step={GUIDE_CONFIG.step} value={ghost} disabled={!guide} onChange={(event) => useGameStore.getState().setGhost(Number(event.target.value))} /></label>
          <button className="text-button" onClick={() => window.dispatchEvent(new Event("reset-camera"))}>↺ 시점 초기화</button>
        </div>
        <p className="game-notice" role="status">{notice}</p>
        <p className="control-legend">LEFT · {mode === "rotate" ? "자유 회전" : "조각 이동"} / SHIFT · 이동　 RIGHT · 시점 회전　 MIDDLE · PAN　 WHEEL · 확대</p>
      </div>
    </div>
  );
}
function PieceInventory() {
  const { groups, indexById: handBoneIndexById } = usePuzzle();
  const selected = useGameStore((s) => s.selectedBoneId), pieces = useGameStore((s) => s.pieces);
  return <section className="inventory" aria-label="뼈 조각 목록">
    <div className="inventory-heading"><span className="small-kicker">PIECE INDEX</span><small>✓ 배치 · • 이름 확인</small></div>
    {groups.map(({ id: category, name, bones }) => <div className="inventory-group" key={category}>
      <h3>{name}</h3><div className="piece-grid">
        {bones.map((bone) => <button key={bone.id} aria-label={`조각 ${String(handBoneIndexById[bone.id] + 1).padStart(2, "0")} 선택`} aria-pressed={selected === bone.id} className={`${selected === bone.id ? "selected" : ""} ${pieces[bone.id].placed ? "placed" : ""}`} onClick={(event) => { useGameStore.getState().select(bone.id); event.currentTarget.blur(); }}>{pieces[bone.id].placed ? "✓" : String(handBoneIndexById[bone.id] + 1).padStart(2, "0")}{pieces[bone.id].nameVerified && <span className="verified-dot" />}</button>)}
      </div>
    </div>)}
  </section>;
}
