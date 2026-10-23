import hand from "./hand.json";
import type { BoneDefinition } from "../types/bone";
export const handBones = hand.bones as unknown as BoneDefinition[];
export const bonesById = Object.fromEntries(
  handBones.map((bone) => [bone.id, bone]),
) as Record<string, BoneDefinition>;
export const handSource = hand;
