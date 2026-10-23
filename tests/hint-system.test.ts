import { beforeEach, it, expect } from "vitest";
import { useGameStore } from "../src/state/gameStore";
import { handBones } from "../src/data/bones";
beforeEach(() => useGameStore.getState().newGame());
it("requires selection and starts with exactly five hints", () => {
  useGameStore.getState().revealHint();
  expect(useGameStore.getState().hintsRemaining).toBe(5);
});
it("reveals a name once without verifying it or overwriting a note", () => {
  const s = useGameStore.getState(),
    b = handBones[0];
  s.select(b.id);
  s.saveLabel(b.id, "my own note");
  s.revealHint();
  s.revealHint();
  const current = useGameStore.getState();
  expect(current.hintsRemaining).toBe(4);
  expect(current.pieces[b.id]).toMatchObject({
    hintShown: true,
    nameVerified: false,
    userLabel: "my own note",
  });
});
it("exhausts five unique hints and refuses a sixth", () => {
  const s = useGameStore.getState();
  for (const b of handBones.slice(0, 6)) {
    s.select(b.id);
    s.revealHint();
  }
  const current = useGameStore.getState();
  expect(current.hintsRemaining).toBe(0);
  expect(current.pieces[handBones[5].id].hintShown).toBe(false);
  s.select(handBones[0].id);
  s.revealHint();
  expect(useGameStore.getState().hintsRemaining).toBe(0);
});
