import { beforeEach, describe, it, expect } from "vitest";
import {
  useGameStore,
  assemblyCount,
  namingCount,
} from "../src/state/gameStore";
import { handBones } from "../src/data/bones";
import { STORAGE_KEY, restorePieces } from "../src/utils/persistence";
beforeEach(() => {
  localStorage.clear();
  useGameStore.getState().newGame("easy");
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
});
