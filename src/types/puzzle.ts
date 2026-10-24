import type { BoneDefinition } from "./bone";
export type PlayableStageId = "hand" | "thoracic-t06";
export type AnatomicalDirection = "anterior" | "posterior" | "superior" | "inferior" | "left" | "right";
export interface LandmarkPieceMetadata {
  puzzleType: "landmark";
  region: "spine";
  section: "thoracic";
  bone: "T06";
  label: { en: string; ko: string };
  anatomicalDirectionRole: AnatomicalDirection[];
  difficulty: typeof import("../data/config/landmarkDifficulty").LANDMARK_DIFFICULTY;
  learning: { category: string; relatedLandmarks: string[] };
}
export interface PuzzleDefinition {
  id: PlayableStageId;
  name: string;
  koreanName: string;
  puzzleType: "bone" | "landmark";
  count: number;
  bones: readonly BoneDefinition[];
  byId: Readonly<Record<string, BoneDefinition>>;
  indexById: Readonly<Record<string, number>>;
  groups: readonly { id: string; name: string; bones: readonly BoneDefinition[] }[];
}
