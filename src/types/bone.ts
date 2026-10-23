export type Vec3 = [number, number, number];
export type Quat = [number, number, number, number];
export type Transform = { position: Vec3; rotation: Quat };
export type BoneDefinition = {
  id: string;
  fmaId: string;
  englishName: string;
  koreanName: string;
  acceptedAliases: string[];
  category: "carpals" | "metacarpals" | "phalanges";
  modelPath: string;
  targetPosition: Vec3;
  targetRotation: Quat;
  targetScale: Vec3;
  initialTransform: Transform;
  originalCenter: Vec3;
  size: Vec3;
  snapDistance: number;
  sourceSha256: string;
};
export type BonePlayState = {
  transform: Transform;
  placed: boolean;
  userLabel: string;
  nameVerified: boolean;
  hintShown: boolean;
};
