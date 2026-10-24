/** Load anatomy only after a stage intent; keep engine code out of the title. */
let scene: Promise<typeof import("./BoneScene")> | undefined;
export function loadBoneScene() {
  return (scene ??= import("./BoneScene").catch((error: unknown) => {
    scene = undefined;
    throw error;
  }));
}

let warmup: Promise<void> | undefined;
export function warmHandStage() {
  return (warmup ??= loadBoneScene()
    .then((module) => module.preloadHandStage())
    .catch((error: unknown) => {
      warmup = undefined;
      throw error;
    }));
}
