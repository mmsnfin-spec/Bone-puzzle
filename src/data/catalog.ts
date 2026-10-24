import type { BoneDefinition } from "../types/bone";
import { BONE_CATEGORIES } from "./anatomy/categories";
import type { BoneCategory } from "./anatomy/categories";

export function freezeData<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nested of Object.values(value)) freezeData(nested);
    Object.freeze(value);
  }
  return value;
}

/** Build shared indexes once; immutable definitions remain separate from saves. */
export function createBoneCatalog<T extends { bones: unknown[] }>(
  source: T,
  expectedCounts: Record<BoneCategory, number>,
) {
  const bones = source.bones as BoneDefinition[];
  const byId: Record<string, BoneDefinition> = {};
  const byCategory = {} as Record<BoneCategory, BoneDefinition[]>;
  for (const { id } of BONE_CATEGORIES) byCategory[id] = [];
  for (const bone of bones) {
    if (!bone.id || byId[bone.id] || bone.fmaId !== bone.id || !byCategory[bone.category as BoneCategory])
      throw new Error(`Invalid anatomical identity/category: ${bone.id}`);
    byId[bone.id] = bone;
    byCategory[bone.category as BoneCategory].push(bone);
  }
  for (const { id } of BONE_CATEGORIES)
    if (byCategory[id].length !== expectedCounts[id]) throw new Error(`Unexpected ${id} count`);
  freezeData(source);
  return Object.freeze({
    source,
    bones: Object.freeze(bones) as readonly BoneDefinition[],
    byId: Object.freeze(byId),
    byCategory: freezeData(byCategory) as Readonly<Record<BoneCategory, readonly BoneDefinition[]>>,
    indexById: Object.freeze(Object.fromEntries(bones.map((bone, index) => [bone.id, index]))),
  });
}
