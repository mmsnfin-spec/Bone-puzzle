import type { BoneDefinition } from "../types/bone";
export function normalizeName(value: string) {
  return value.trim().toLocaleLowerCase("en-US").replace(/\s+/g, " ");
}
export function validateName(
  value: string,
  bone: Pick<BoneDefinition, "englishName" | "acceptedAliases">,
) {
  const normalized = normalizeName(value);
  return (
    normalized.length > 0 &&
    [bone.englishName, ...bone.acceptedAliases].some(
      (name) => normalizeName(name) === normalized,
    )
  );
}
