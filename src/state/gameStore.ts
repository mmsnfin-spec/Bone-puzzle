import { create } from "zustand";
import { persist } from "zustand/middleware";
import { bonesById, handBones } from "../data/bones";
import type { BonePlayState, Transform } from "../types/bone";
import type { Difficulty, AnimationStatus, InteractionMode } from "../types/game";
import { canSnap } from "../systems/SnapSystem";
import { validateName } from "../systems/NameValidationSystem";
import { MAX_HINTS } from "../systems/HintSystem";
import { rotateQuaternion, normalizeQuaternion } from "../systems/RotationSystem";
import { GUIDE_CONFIG, SAVE_CONFIG } from "../data/config/gameplay";
import { INTERACTION_CONFIG } from "../data/config/interaction";
import {
  createGameStorage, freshPieces, restorePieces, STORAGE_KEY, validTransform,
} from "../utils/persistence";
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
  guideEnabled: boolean;
  interactionMode: InteractionMode;
  animationStatus: AnimationStatus;
  newGame: (difficulty?: Difficulty) => void;
  select: (id: string | null) => void;
  setDragging: (value: boolean) => void;
  move: (id: string, transform: Transform) => void;
  rotate: (id: string, axis: "x" | "y" | "z", degrees: number) => void;
  drop: (id: string, transform: Transform) => boolean;
  saveLabel: (id: string, value: string) => void;
  checkName: (id: string, value: string) => boolean;
  revealHint: () => void;
  tick: (seconds: number) => void;
  setMotion: (value: boolean) => void;
  setGhost: (value: number) => void;
  setGuide: (enabled: boolean) => void;
  setInteractionMode: (mode: InteractionMode) => void;
  setAnimation: (value: AnimationStatus) => void;
}
const gameStorage = createGameStorage();
export const flushGameSave = gameStorage.flush;

function normalizedTransform(value: unknown): Transform | null {
  return validTransform(value) ? {
    position: [...value.position],
    rotation: normalizeQuaternion(value.rotation),
  } : null;
}

function sameTransform(a: Transform, b: Transform) {
  return a.position.every((value, index) => value === b.position[index]) &&
    a.rotation.every((value, index) => value === b.rotation[index]);
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
      ghostOpacity: GUIDE_CONFIG.opacity,
      guideEnabled: GUIDE_CONFIG.enabled,
      interactionMode: INTERACTION_CONFIG.initialMode,
      animationStatus: "assembled",
      newGame: (difficulty = get().difficulty) =>
        set({
          pieces: freshPieces(),
          difficulty: ["easy", "normal", "hard"].includes(difficulty) ? difficulty : "easy",
          selectedBoneId: null,
          dragging: false,
          hintsRemaining: MAX_HINTS,
          elapsedTime: 0,
          hasSession: true,
          animationStatus: "assembled",
        }),
      select: (id) => {
        if ((id === null || bonesById[id]) && get().selectedBoneId !== id)
          set({ selectedBoneId: id });
      },
      setDragging: (dragging) => {
        if (get().dragging !== dragging) set({ dragging });
      },
      move: (id, transform) => {
        const s = get();
        const safe = normalizedTransform(transform);
        if (s.pieces[id] && !s.pieces[id].placed && safe &&
          !sameTransform(s.pieces[id].transform, safe))
          set({ pieces: updatePiece(s.pieces, id, { transform: safe }) });
      },
      rotate: (id, axis, degrees) => {
        const s = get(), piece = s.pieces[id];
        if (!piece || piece.placed || !Number.isFinite(degrees) ||
          !["x", "y", "z"].includes(axis)) return;
        s.move(id, {
          position: piece.transform.position,
          rotation: rotateQuaternion(piece.transform.rotation, axis, degrees),
        });
      },
      drop: (id, transform) => {
        const s = get(),
          bone = bonesById[id];
        if (!bone || s.pieces[id].placed) return false;
        const safe = normalizedTransform(transform);
        if (!safe) {
          set({ dragging: false });
          return false;
        }
        const placed = canSnap(bone, safe, s.difficulty);
        set({
          dragging: false,
          pieces: updatePiece(s.pieces, id, {
            placed,
            transform: placed
              ? {
                  position: [...bone.targetPosition],
                  rotation: [...bone.targetRotation],
                }
              : safe,
          }),
        });
        return placed;
      },
      saveLabel: (id, value) => {
        const s = get();
        if (s.pieces[id] && s.pieces[id].userLabel !== value.slice(0, SAVE_CONFIG.maximumLabelLength))
          set({
            pieces: updatePiece(s.pieces, id, {
              userLabel: value.slice(0, SAVE_CONFIG.maximumLabelLength),
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
            userLabel: value.slice(0, SAVE_CONFIG.maximumLabelLength),
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
        if (Number.isFinite(seconds) && seconds > 0 &&
          Number.isFinite(get().elapsedTime + seconds))
          set((s) => ({ elapsedTime: s.elapsedTime + seconds }));
      },
      setMotion: (reducedMotion) => {
        if (get().reducedMotion !== reducedMotion) set({ reducedMotion });
      },
      setGhost: (value) => {
        if (!Number.isFinite(value)) return;
        const ghostOpacity = Math.max(GUIDE_CONFIG.minimum, Math.min(GUIDE_CONFIG.maximum, value));
        if (get().ghostOpacity !== ghostOpacity) set({ ghostOpacity });
      },
      setGuide: (guideEnabled) => {
        if (get().guideEnabled !== guideEnabled) set({ guideEnabled });
      },
      setInteractionMode: (interactionMode) => {
        if (["move", "rotate"].includes(interactionMode) &&
          get().interactionMode !== interactionMode) set({ interactionMode });
      },
      setAnimation: (animationStatus) => {
        if (get().animationStatus !== animationStatus) set({ animationStatus });
      },
    }),
    {
      name: STORAGE_KEY,
      version: SAVE_CONFIG.version,
      storage: gameStorage.storage,
      partialize: (s) => ({
        stageId: s.stageId,
        difficulty: s.difficulty,
        pieces: s.pieces,
        hintsRemaining: s.hintsRemaining,
        elapsedTime: s.elapsedTime,
        hasSession: s.hasSession,
        reducedMotion: s.reducedMotion,
        ghostOpacity: s.ghostOpacity,
        guideEnabled: s.guideEnabled,
        interactionMode: s.interactionMode,
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
            typeof saved.ghostOpacity === "number" && Number.isFinite(saved.ghostOpacity)
              ? Math.max(GUIDE_CONFIG.minimum, Math.min(GUIDE_CONFIG.maximum, saved.ghostOpacity))
              : GUIDE_CONFIG.opacity,
          guideEnabled: saved.guideEnabled !== false,
          interactionMode: saved.interactionMode === "rotate" ? "rotate" : "move",
        };
      },
    },
  ),
);

// A paused tab is not guaranteed to receive its pending timeout before the
// browser freezes it, so page lifecycle events flush the final timer snapshot.
if (typeof window !== "undefined") {
  const flushWhenHidden = () => {
    if (document.visibilityState === "hidden") flushGameSave();
  };
  window.addEventListener("pagehide", flushGameSave);
  document.addEventListener("visibilitychange", flushWhenHidden);
  if (import.meta.hot) import.meta.hot.dispose(() => {
    flushGameSave();
    window.removeEventListener("pagehide", flushGameSave);
    document.removeEventListener("visibilitychange", flushWhenHidden);
  });
}
export const assemblyCount = (s: Pick<GameState, "pieces">) =>
  Object.values(s.pieces).filter((p) => p.placed).length;
export const namingCount = (s: Pick<GameState, "pieces">) =>
  Object.values(s.pieces).filter((p) => p.nameVerified).length;
