/** All stage-specific anatomy and indexes; controls consume the same contract. */
import { handCatalog } from "./anatomy/hand";
import thoracicSource from "./anatomy/t06.json";
import { BONE_CATEGORIES } from "./anatomy/categories";
import { LANDMARK_DIFFICULTY } from "./config/landmarkDifficulty";
import { freezeData } from "./catalog";
import type { BoneDefinition } from "../types/bone";
import type { PuzzleDefinition, PlayableStageId, LandmarkPieceMetadata } from "../types/puzzle";
const thoracicBones = thoracicSource.bones.map(b=>({...b,difficulty:LANDMARK_DIFFICULTY})) as (BoneDefinition & LandmarkPieceMetadata)[];
if (thoracicBones.length!==7 || new Set(thoracicBones.map(b=>b.id)).size!==7) throw new Error("T06 requires exactly seven unique landmark pieces");
const thoracicGroups = [{id:"body",name:"VERTEBRAL BODY"},{id:"arch",name:"POSTERIOR ARCH"},{id:"process",name:"PROCESSES"},{id:"articular",name:"ARTICULAR REGIONS"}];
export const PUZZLES: Readonly<Record<PlayableStageId,PuzzleDefinition>> = freezeData({
  hand: {id:"hand",name:"HAND",koreanName:"오른손",puzzleType:"bone",count:handCatalog.bones.length,...handCatalog,
    groups:BONE_CATEGORIES.map(c=>({id:c.id,name:c.name,bones:handCatalog.byCategory[c.id]}))},
  "thoracic-t06": {id:"thoracic-t06",name:"T06",koreanName:"제6흉추",puzzleType:"landmark",count:thoracicBones.length,bones:thoracicBones,
    byId:Object.fromEntries(thoracicBones.map(b=>[b.id,b])),indexById:Object.fromEntries(thoracicBones.map((b,i)=>[b.id,i])),
    groups:thoracicGroups.map(g=>({...g,bones:thoracicBones.filter(b=>b.category===g.id)}))},
});
export const getPuzzle = (id: PlayableStageId) => PUZZLES[id];
export const isPlayableStage = (id: unknown): id is PlayableStageId => id === "hand" || id === "thoracic-t06";
export const thoracicLandmarks = freezeData(thoracicSource.landmarks);
export const thoracicProvenance = freezeData({fmaId:thoracicSource.sourceFmaId,bone:thoracicSource.bone,reviewStatus:thoracicSource.reviewStatus,sourceAxes:thoracicSource.sourceAxes});
