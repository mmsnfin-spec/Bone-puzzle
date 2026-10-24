export type Screen =
  | "splash"
  | "title"
  | "menu"
  | "stageIntro"
  | "game"
  | "paused"
  | "complete";
export type Difficulty = "easy" | "normal" | "hard";
export type InteractionMode = "move" | "rotate";
export type StageId = import("../data/stageRegistry").RegisteredStageId;
export type AnimationStatus =
  | "assembled"
  | "falling"
  | "settling"
  | "typography"
  | "finished";
