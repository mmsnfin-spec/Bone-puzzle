/** Menu metadata only. An unavailable stage never creates fabricated anatomy. */
export const STAGE_METADATA = [
  { id: "hand", name: "HAND", koreanName: "오른손", subtitle: "The architecture of touch", count: 27, available: true, side: "right" },
  { id: "foot", name: "FOOT", koreanName: "발", subtitle: "The foundation of movement", count: 26, available: false },
  { id: "upper-limb", name: "UPPER LIMB", koreanName: "상지", count: null, available: false },
  { id: "lower-limb", name: "LOWER LIMB", koreanName: "하지", count: null, available: false },
  { id: "pelvis", name: "PELVIS", koreanName: "골반", count: null, available: false },
  { id: "spine", name: "SPINE", koreanName: "척주", count: null, available: false },
  { id: "thorax", name: "THORAX", koreanName: "흉곽", count: null, available: false },
  { id: "skull", name: "SKULL", koreanName: "두개골", count: null, available: false },
  { id: "vertebra", name: "VERTEBRA", koreanName: "척추뼈", count: null, available: false },
] as const;
export const HAND_STAGE = STAGE_METADATA[0];
export type RegisteredStageId = (typeof STAGE_METADATA)[number]["id"];
export const stageMetadataById = Object.fromEntries(STAGE_METADATA.map((stage) => [stage.id, stage]));
