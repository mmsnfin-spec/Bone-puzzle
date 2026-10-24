import { handBones } from "./bones";
import { HAND_STAGE, STAGE_METADATA } from "./stageRegistry";
export { STAGE_METADATA, stageMetadataById } from "./stageRegistry";
export const stages = STAGE_METADATA.map((stage) => ({
  ...stage, bones: stage.id === "hand" ? handBones : [],
}));
export const activeStage = { ...HAND_STAGE, bones: handBones };
