/** Stable imports for existing consumers; the anatomical catalog owns data. */
import { handCatalog } from "./anatomy/hand";
export const handBones = handCatalog.bones;
export const bonesById = handCatalog.byId;
export const handSource = handCatalog.source;
export const handBonesByCategory = handCatalog.byCategory;
export const handBoneIndexById = handCatalog.indexById;
