/** Anatomical grouping, shared by catalog validation and the Piece Index. */
export const BONE_CATEGORIES = [
  { id: "carpals", name: "CARPALS", koreanName: "수근골" },
  { id: "metacarpals", name: "METACARPALS", koreanName: "중수골" },
  { id: "phalanges", name: "PHALANGES", koreanName: "지골" },
] as const;
export type BoneCategory = (typeof BONE_CATEGORIES)[number]["id"];
