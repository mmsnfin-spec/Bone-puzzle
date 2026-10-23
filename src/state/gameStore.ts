import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { bonesById, handBones } from "../data/bones";
import type { BonePlayState, Transform } from "../types/bone";
import type { Difficulty, AnimationStatus } from "../types/game";
import { canSnap } from "../systems/SnapSystem";
import { validateName } from "../systems/NameValidationSystem";
import { MAX_HINTS } from "../systems/HintSystem";
import { freshPieces, restorePieces, STORAGE_KEY } from "../utils/persistence";
export interface GameState {
  stageId: "hand";
  difficulty: Difficulty;
  pieces: Record<string, BonePlayState>;
  selectedBoneId: string | null;
  dragging: boolean;
  hintsRemaining: number;
  elapsedTime: number;
  hasSession: boolean;
  reducedMotion: boolean;
  ghostOpacity: number;
  animationStatus: AnimationStatus;
  newGame: (difficulty?: Difficulty) => void;
  select: (id: string | null) => void;
  setDragging: (value: boolean) => void;
  move: (id: string, transform: Transform) => void;
  drop: (id: string, transform: Transform) => boolean;
  saveLabel: (id: string, value: string) => void;
  checkName: (id: string, value: string) => boolean;
  revealHint: () => void;
  tick: (seconds: number) => void;
  setMotion: (value: boolean) => void;
  setGhost: (value: number) => void;
  setAnimation: (value: AnimationStatus) => void;
}
function updatePiece(
  pieces: GameState["pieces"],
  id: string,
  patch: Partial<BonePlayState>,
) {
  return { ...pieces, [id]: { ...pieces[id], ...patch } };
}
export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      stageId: "hand",
      difficulty: "easy",
      pieces: freshPieces(),
      selectedBoneId: null,
      dragging: false,
      hintsRemaining: MAX_HINTS,
      elapsedTime: 0,
      hasSession: false,
      reducedMotion: false,
      ghostOpacity: 0.2,
      animationStatus: "assembled",
      newGame: (difficulty = get().difficulty) =>
        set({
          pieces: freshPieces(),
          difficulty,
          selectedBoneId: null,
          dragging: false,
          hintsRemaining: MAX_HINTS,
          elapsedTime: 0,
          hasSession: true,
          animationStatus: "assembled",
        }),
      select: (id) => {
        if (id === null || bonesById[id]) set({ selectedBoneId: id });
      },
      setDragging: (dragging) => set({ dragging }),
      move: (id, transform) => {
        const s = get();
        if (s.pieces[id] && !s.pieces[id].placed)
          set({ pieces: updatePiece(s.pieces, id, { transform }) });
      },
      drop: (id, transform) => {
        const s = get(),
          bone = bonesById[id];
        if (!bone || s.pieces[id].placed) return false;
        const placed = canSnap(bone, transform, s.difficulty);
        set({
          dragging: false,
          pieces: updatePiece(s.pieces, id, {
            placed,
            transform: placed
              ? {
                  position: [...bone.targetPosition],
                  rotation: [...bone.targetRotation],
                }
              : transform,
          }),
        });
        return placed;
      },
      saveLabel: (id, value) => {
        const s = get();
        if (s.pieces[id])
          set({
            pieces: updatePiece(s.pieces, id, {
              userLabel: value.slice(0, 120),
              nameVerified:
                s.pieces[id].nameVerified && validateName(value, bonesById[id]),
            }),
          });
      },
      checkName: (id, value) => {
        const s = get();
        if (!bonesById[id]) return false;
        const valid = validateName(value, bonesById[id]);
        set({
          pieces: updatePiece(s.pieces, id, {
            userLabel: value.slice(0, 120),
            nameVerified: valid,
          }),
        });
        return valid;
      },
      revealHint: () => {
        const s = get(),
          id = s.selectedBoneId;
        if (!id || s.hintsRemaining <= 0 || s.pieces[id].hintShown) return;
        set({
          hintsRemaining: s.hintsRemaining - 1,
          pieces: updatePiece(s.pieces, id, { hintShown: true }),
        });
      },
      tick: (seconds) => {
        if (Number.isFinite(seconds) && seconds > 0)
          set((s) => ({ elapsedTime: s.elapsedTime + seconds }));
      },
      setMotion: (reducedMotion) => set({ reducedMotion }),
      setGhost: (value) =>
        set({ ghostOpacity: Math.max(0.05, Math.min(0.25, value)) }),
      setAnimation: (animationStatus) => set({ animationStatus }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => ({
        getItem: (key) => {
          try {
            return localStorage.getItem(key);
          } catch {
            return null;
          }
        },
        setItem: (key, value) => {
          try {
            localStorage.setItem(key, value);
          } catch {
            /* Private mode/quota: session remains playable. */
          }
        },
        removeItem: (key) => {
          try {
            localStorage.removeItem(key);
          } catch {
            /* no-op */
          }
        },
      })),
      partialize: (s) => ({
        stageId: s.stageId,
        difficulty: s.difficulty,
        pieces: s.pieces,
        hintsRemaining: s.hintsRemaining,
        elapsedTime: s.elapsedTime,
        hasSession: s.hasSession,
        reducedMotion: s.reducedMotion,
        ghostOpacity: s.ghostOpacity,
      }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<GameState> | undefined;
        const pieces = restorePieces(saved?.pieces);
        if (!pieces || saved?.stageId !== "hand") return current;
        // Revalidate naming instead of trusting persisted correctness flags.
        for (const bone of handBones)
          pieces[bone.id].nameVerified =
            pieces[bone.id].nameVerified &&
            validateName(pieces[bone.id].userLabel, bone);
        return {
          ...current,
          pieces,
          hasSession: saved.hasSession === true,
          difficulty: ["easy", "normal", "hard"].includes(
            saved.difficulty ?? "",
          )
            ? saved.difficulty!
            : "easy",
          hintsRemaining:
            MAX_HINTS - Object.values(pieces).filter((p) => p.hintShown).length,
          elapsedTime:
            typeof saved.elapsedTime === "number" &&
            Number.isFinite(saved.elapsedTime) &&
            saved.elapsedTime >= 0
              ? saved.elapsedTime
              : 0,
          reducedMotion: saved.reducedMotion === true,
          ghostOpacity:
            typeof saved.ghostOpacity === "number"
              ? Math.max(0.05, Math.min(0.25, saved.ghostOpacity))
              : 0.2,
        };
      },
    },
  ),
);
export const assemblyCount = (s: Pick<GameState, "pieces">) =>
  Object.values(s.pieces).filter((p) => p.placed).length;
export const namingCount = (s: Pick<GameState, "pieces">) =>
  Object.values(s.pieces).filter((p) => p.nameVerified).length;
