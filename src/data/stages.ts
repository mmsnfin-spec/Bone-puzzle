/** Compatibility view of menu and playable puzzle metadata. */
import { STAGE_METADATA, HAND_STAGE } from "./stageRegistry";
import { getPuzzle, isPlayableStage } from "./puzzles";
export const stages = STAGE_METADATA.map(stage=>({...stage,bones:isPlayableStage(stage.id)?getPuzzle(stage.id).bones:[]}));
export { STAGE_METADATA, stageMetadataById } from "./stageRegistry";
export const activeStage = {...HAND_STAGE,bones:getPuzzle("hand").bones};
