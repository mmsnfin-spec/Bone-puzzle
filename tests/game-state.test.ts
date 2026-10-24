import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import {
  useGameStore,
  assemblyCount,
  namingCount,
  flushGameSave,
} from "../src/state/gameStore";
import { handBones } from "../src/data/bones";
import { STORAGE_KEY, restorePieces } from "../src/utils/persistence";
beforeEach(() => {
  flushGameSave();
  localStorage.clear();
  useGameStore.getState().newGame("easy");
  useGameStore.getState().setGuide(true);
  useGameStore.getState().setInteractionMode("move");
  useGameStore.getState().setMotion(false);
  useGameStore.getState().setGhost(0.2);
});
afterEach(() => {
  flushGameSave();
  vi.useRealTimers();
  vi.restoreAllMocks();
});
describe("game state and persistence", () => {
  it("completes all 27 placements independently of names", () => {
    for (const b of handBones)
      expect(
        useGameStore
          .getState()
          .drop(b.id, {
            position: b.targetPosition,
            rotation: b.targetRotation,
          }),
      ).toBe(true);
    expect(assemblyCount(useGameStore.getState())).toBe(27);
    expect(namingCount(useGameStore.getState())).toBe(0);
  });
  it("stores independent notes and rechecks edited names", () => {
    const [a, b] = handBones;
    const s = useGameStore.getState();
    s.saveLabel(a.id, "wrong but saved");
    s.saveLabel(b.id, b.englishName);
    expect(s.checkName(a.id, "wrong but saved")).toBe(false);
    expect(s.checkName(b.id, b.englishName)).toBe(true);
    expect(useGameStore.getState().pieces[a.id].userLabel).toBe(
      "wrong but saved",
    );
    expect(namingCount(useGameStore.getState())).toBe(1);
    s.saveLabel(b.id, "wrong");
    expect(namingCount(useGameStore.getState())).toBe(0);
  });
  it("prevents moving or double-counting placed bones", () => {
    const b = handBones[0],
      s = useGameStore.getState();
    s.drop(b.id, { position: b.targetPosition, rotation: b.targetRotation });
    s.move(b.id, b.initialTransform);
    expect(s.drop(b.id, b.initialTransform)).toBe(false);
    expect(useGameStore.getState().pieces[b.id].transform.position).toEqual(
      b.targetPosition,
    );
    expect(assemblyCount(useGameStore.getState())).toBe(1);
  });
  it("resets the whole stage including notes, timer and hints", () => {
    const b = handBones[0],
      s = useGameStore.getState();
    s.select(b.id);
    s.revealHint();
    s.checkName(b.id, b.englishName);
    s.drop(b.id, { position: b.targetPosition, rotation: b.targetRotation });
    s.tick(120);
    s.newGame();
    const reset = useGameStore.getState();
    expect([
      reset.hintsRemaining,
      reset.elapsedTime,
      assemblyCount(reset),
      namingCount(reset),
    ]).toEqual([5, 0, 0, 0]);
    expect(reset.selectedBoneId).toBeNull();
    expect(reset.pieces[b.id].userLabel).toBe("");
  });
  it("restores a real persisted stage and recomputes derived counts", async () => {
    const b = handBones[0],
      s = useGameStore.getState();
    s.select(b.id);
    s.revealHint();
    s.checkName(b.id, b.englishName);
    s.drop(b.id, { position: b.targetPosition, rotation: b.targetRotation });
    s.tick(9);
    const saved = localStorage.getItem(STORAGE_KEY)!;
    s.newGame();
    localStorage.setItem(STORAGE_KEY, saved);
    await useGameStore.persist.rehydrate();
    const restored = useGameStore.getState();
    expect(restored.hintsRemaining).toBe(4);
    expect(restored.elapsedTime).toBe(9);
    expect(assemblyCount(restored)).toBe(1);
    expect(namingCount(restored)).toBe(1);
  });
  it("rejects corrupt snapshots instead of rendering invalid bones", () => {
    expect(restorePieces({})).toBeNull();
    const p = structuredClone(useGameStore.getState().pieces);
    p[handBones[0].id].transform.position[0] = NaN;
    expect(restorePieces(p)).toBeNull();
  });
  it("keeps independent guide and manipulation preferences when restarting", () => {
    const s = useGameStore.getState();
    s.setGuide(false);
    s.setGhost(0.13);
    s.setInteractionMode("rotate");
    s.setMotion(true);
    s.newGame("hard");
    const reset = useGameStore.getState();
    expect([reset.guideEnabled, reset.ghostOpacity, reset.interactionMode,
      reset.reducedMotion, reset.difficulty]).toEqual([false, 0.13, "rotate", true, "hard"]);
    const bone = handBones[0];
    expect(reset.drop(bone.id, {
      position: bone.targetPosition, rotation: bone.targetRotation,
    })).toBe(true);
  });
  it("restores legacy v1 exact poses while defaulting new preferences", async () => {
    const s = useGameStore.getState(), bone = handBones[0];
    s.saveLabel(bone.id, "legacy note");
    const legacy = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    delete legacy.state.guideEnabled;
    delete legacy.state.interactionMode;
    legacy.state.pieces[bone.id].transform = {
      position: [1.25, -2.5, 0.75], rotation: [0, 0, 0, 0.999],
    };
    s.setGuide(false);
    s.setInteractionMode("rotate");
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));
    await useGameStore.persist.rehydrate();
    const restored = useGameStore.getState();
    expect(restored.guideEnabled).toBe(true);
    expect(restored.interactionMode).toBe("move");
    expect(restored.pieces[bone.id].transform).toEqual(legacy.state.pieces[bone.id].transform);
    expect(restored.pieces[bone.id].userLabel).toBe("legacy note");
  });
  it("normalizes accumulated axis rotations and prevents invalid runtime poses", () => {
    const s = useGameStore.getState(), bone = handBones[0];
    for (let i = 0; i < 120; i++) s.rotate(bone.id, i % 2 ? "y" : "x", 5);
    expect(Math.hypot(...useGameStore.getState().pieces[bone.id].transform.rotation)).toBeCloseTo(1, 12);
    const before = structuredClone(useGameStore.getState().pieces[bone.id].transform);
    s.move(bone.id, { position: [NaN, 0, 0], rotation: [0, 0, 0, 1] });
    expect(s.drop(bone.id, { position: [0, 0, 0], rotation: [0, 0, 0, 0] })).toBe(false);
    expect(useGameStore.getState().pieces[bone.id].transform).toEqual(before);
    s.setGhost(NaN);
    s.setGhost(Infinity);
    s.tick(NaN);
    s.tick(Infinity);
    expect(useGameStore.getState().ghostOpacity).toBe(0.2);
    expect(useGameStore.getState().elapsedTime).toBe(0);
  });
  it("skips storage for runtime selection and coalesces clocks without delaying placements", () => {
    vi.useFakeTimers();
    const write = vi.spyOn(Storage.prototype, "setItem");
    const s = useGameStore.getState(), bone = handBones[0];
    for (let i = 0; i < 20; i++) {
      s.select(handBones[i].id);
      s.setDragging(i % 2 === 0);
    }
    expect(write).not.toHaveBeenCalled();
    for (let i = 0; i < 4; i++) s.tick(1);
    expect(write).not.toHaveBeenCalled();
    s.tick(1);
    expect(write).toHaveBeenCalledTimes(1);
    s.drop(bone.id, { position: bone.targetPosition, rotation: bone.targetRotation });
    expect(write).toHaveBeenCalledTimes(2);
    const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(persisted.state.pieces[bone.id].placed).toBe(true);
    expect(persisted.state.elapsedTime).toBe(5);
    expect(persisted.state).not.toHaveProperty("dragging");
    expect(persisted.state).not.toHaveProperty("selectedBoneId");
    s.tick(1);
    window.dispatchEvent(new Event("pagehide"));
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).state.elapsedTime).toBe(6);
    expect(write).toHaveBeenCalledTimes(3);
  });
  it("flushes timer-only progress within five seconds and writes identical settings once", () => {
    vi.useFakeTimers();
    const write = vi.spyOn(Storage.prototype, "setItem");
    const s = useGameStore.getState();
    s.tick(0.25);
    vi.advanceTimersByTime(4_999);
    expect(write).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(write).toHaveBeenCalledTimes(1);
    s.setGuide(false);
    s.setGuide(false);
    s.setInteractionMode("move");
    expect(write).toHaveBeenCalledTimes(2);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).state.guideEnabled).toBe(false);
  });
  it("rejects malformed storage envelopes and clamps non-finite settings", async () => {
    const snapshot = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    snapshot.state.elapsedTime = null;
    snapshot.state.ghostOpacity = null;
    snapshot.state.interactionMode = "unsafe";
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    await useGameStore.persist.rehydrate();
    expect(useGameStore.getState().elapsedTime).toBe(0);
    expect(useGameStore.getState().ghostOpacity).toBe(0.2);
    expect(useGameStore.getState().interactionMode).toBe("move");
    for (const invalid of ["{bad", JSON.stringify({ state: {}, version: [] }), "null"]) {
      localStorage.setItem(STORAGE_KEY, invalid);
      await expect(Promise.resolve(useGameStore.persist.rehydrate())).resolves.toBeUndefined();
      expect(Object.keys(useGameStore.getState().pieces)).toHaveLength(27);
    }
  });
});
