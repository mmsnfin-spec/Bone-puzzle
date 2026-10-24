import type { BonePlayState, Transform } from "../types/bone";
import type { Difficulty, InteractionMode } from "../types/game";
import type { PersistStorage, StorageValue } from "zustand/middleware";
import { getPuzzle, isPlayableStage } from "../data/puzzles";
import type { PlayableStageId } from "../types/puzzle";
import { initialOrientation } from "../systems/OrientationSystem";
import { HINT_CONFIG, SAVE_CONFIG } from "../data/config/gameplay";
export const STORAGE_KEY = SAVE_CONFIG.key;
export const ACTIVE_STAGE_KEY = "bone-puzzle-3d:active-stage:v1";
export const stageStorageKey = (stage: PlayableStageId) => stage === "hand" ? STORAGE_KEY : "bone-puzzle-3d:thoracic-t06:v1";
export function readStageSession(stage: PlayableStageId): PersistedGameState | null {
  try {
    const snapshot = JSON.parse(localStorage.getItem(stageStorageKey(stage)) || "null");
    if (!snapshot || (snapshot.version !== undefined && snapshot.version !== SAVE_CONFIG.version) || snapshot.state?.stageId !== stage) return null;
    return snapshot.state;
  } catch { return null; }
}
export interface PersistedGameState {
  stageId: PlayableStageId;
  difficulty: Difficulty;
  pieces: Record<string, BonePlayState>;
  hintsRemaining: number;
  elapsedTime: number;
  hasSession: boolean;
  reducedMotion: boolean;
  ghostOpacity: number;
  guideEnabled: boolean;
  interactionMode: InteractionMode;
}

/** Runtime selection/drag events never serialize the anatomical snapshot.
 * Timer-only updates are written at most once per five seconds; a player action
 * or an explicit flush always includes the latest timer and poses immediately.
 */
export function createGameStorage() {
  type Snapshot = StorageValue<PersistedGameState>;
  let latest: Snapshot | null = null;
  let observed: Snapshot | null = null;
  let written: Snapshot | null = null;
  let serialized: string | null = null;
  let pending: ReturnType<typeof setTimeout> | null = null;
  const meaningfulKeys = [
    "stageId", "difficulty", "pieces", "hintsRemaining", "hasSession",
    "reducedMotion", "ghostOpacity", "guideEnabled", "interactionMode",
  ] as const;

  const flush = () => {
    if (pending !== null) clearTimeout(pending);
    pending = null;
    if (!latest) return;
    try {
      const next = JSON.stringify(latest);
      // The additional read preserves recovery after storage was externally
      // cleared, without writing duplicate values for ordinary runtime events.
      const key = stageStorageKey(latest.state.stageId);
      if (next !== serialized || localStorage.getItem(key) !== next)
        localStorage.setItem(key, next);
      if (localStorage.getItem(ACTIVE_STAGE_KEY) !== latest.state.stageId)
        localStorage.setItem(ACTIVE_STAGE_KEY, latest.state.stageId);
      serialized = next;
      written = latest;
    } catch {
      // Private mode, quota errors, and unavailable storage leave play intact.
    }
  };

  const storage: PersistStorage<PersistedGameState> = {
    getItem: (name) => {
      try {
        const active = localStorage.getItem(ACTIVE_STAGE_KEY);
        const key = isPlayableStage(active) ? stageStorageKey(active) : name;
        const raw = localStorage.getItem(key) ?? (key !== name ? localStorage.getItem(name) : null);
        if (!raw) return null;
        const value: unknown = JSON.parse(raw);
        if (!value || typeof value !== "object" || !("state" in value))
          return null;
        const snapshot = value as Snapshot;
        if (!snapshot.state || typeof snapshot.state !== "object") return null;
        if (snapshot.version !== undefined &&
          (typeof snapshot.version !== "number" || !Number.isFinite(snapshot.version)))
          return null;
        latest = observed = written = snapshot;
        serialized = raw;
        return snapshot;
      } catch {
        return null;
      }
    },
    setItem: (_name, value) => {
      latest = value;
      const previous = observed;
      observed = value;
      const meaningful = !previous || meaningfulKeys.some(
        (key) => value.state[key] !== previous.state[key],
      );
      if (meaningful) {
        flush();
        return;
      }
      if (!previous || value.state.elapsedTime === previous.state.elapsedTime) return;
      if (!written || value.state.elapsedTime - written.state.elapsedTime >= SAVE_CONFIG.timerIntervalMs / 1000 ||
        value.state.elapsedTime < written.state.elapsedTime) {
        flush();
      } else if (pending === null) {
        pending = setTimeout(flush, SAVE_CONFIG.timerIntervalMs);
      }
    },
    removeItem: (name) => {
      if (pending !== null) clearTimeout(pending);
      pending = null;
      latest = observed = written = null;
      serialized = null;
      try {
        const active = localStorage.getItem(ACTIVE_STAGE_KEY);
        localStorage.removeItem(isPlayableStage(active) ? stageStorageKey(active) : name);
        localStorage.removeItem(ACTIVE_STAGE_KEY);
      } catch { /* unavailable storage */ }
    },
  };
  return { storage, flush };
}
export function freshPieces(stage: PlayableStageId = "hand", difficulty: Difficulty = "easy", random = Math.random): Record<string, BonePlayState> {
  return Object.fromEntries(
    getPuzzle(stage).bones.map((b) => [
      b.id,
      {
        transform: { position: [...b.initialTransform.position], rotation: b.puzzleType === "landmark" ? initialOrientation(b.targetRotation, difficulty, random) : [...b.initialTransform.rotation] },
        placed: false,
        userLabel: "",
        nameVerified: false,
        hintShown: false,
      },
    ]),
  );
}
const numericArray = (v: unknown, n: number) =>
  Array.isArray(v) &&
  v.length === n &&
  v.every(
    (x) => typeof x === "number" && Number.isFinite(x) && Math.abs(x) < SAVE_CONFIG.maximumCoordinateMagnitude,
  );
export function validTransform(value: unknown): value is Transform {
  if (!value || typeof value !== "object") return false;
  const transform = value as Transform;
  return numericArray(transform.position, 3) &&
    numericArray(transform.rotation, 4) && Math.hypot(...transform.rotation) > 1e-12;
}
export function restorePieces(value: unknown, stage: PlayableStageId = "hand") {
  const bones = getPuzzle(stage).bones;
  if (!value || typeof value !== "object") return null;
  const saved = value as Record<string, BonePlayState>;
  if (Object.keys(saved).length !== bones.length) return null;
  const pieces: Record<string, BonePlayState> = {};
  for (const bone of bones) {
    const p = saved[bone.id];
    if (
      !p ||
      !numericArray(p.transform?.position, 3) ||
      !numericArray(p.transform?.rotation, 4) ||
      Math.abs(Math.hypot(...p.transform.rotation) - 1) > 0.01 ||
      typeof p.userLabel !== "string" ||
      p.userLabel.length > SAVE_CONFIG.maximumLabelLength ||
      typeof p.placed !== "boolean" ||
      typeof p.nameVerified !== "boolean" ||
      typeof p.hintShown !== "boolean"
    )
      return null;
    pieces[bone.id] = {
      ...p,
      transform: p.placed ? {
        position: [...bone.targetPosition], rotation: [...bone.targetRotation],
      } : {
        position: [...p.transform.position], rotation: [...p.transform.rotation],
      },
    };
  }
  if (Object.values(pieces).filter((p) => p.hintShown).length > HINT_CONFIG.maximumUniqueBones) return null;
  return pieces;
}
