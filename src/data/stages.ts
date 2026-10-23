import { handBones } from "./bones";
import type { StageId } from "../types/game";
export const stages = [
  {
    id: "hand" as StageId,
    name: "HAND",
    subtitle: "The architecture of touch",
    count: 27,
    available: true,
    bones: handBones,
  },
  {
    id: "foot" as StageId,
    name: "FOOT",
    subtitle: "The foundation of movement",
    count: 26,
    available: false,
    bones: [],
  },
  {
    id: "vertebra" as StageId,
    name: "VERTEBRA",
    subtitle: "The structure that supports us",
    count: null,
    available: false,
    bones: [],
  },
];
export const activeStage = stages[0];
