/** Load anatomy only after a stage intent; keep engine code out of the title. */
let scene: Promise<typeof import("./BoneScene")> | undefined;
export function loadBoneScene() {
  return (scene ??= import("./BoneScene").catch((error: unknown) => {
    scene = undefined;
    throw error;
  }));
}

const warmups = new Map<string, Promise<void>>();
export function warmHandStage() { return warmStage("hand"); }
export function warmStage(id: import("../types/puzzle").PlayableStageId) {
  if (warmups.has(id)) return warmups.get(id)!;
  const result = loadBoneScene()
    .then((module) => module.preloadPuzzle(id))
    .catch((error: unknown) => {
      warmups.delete(id);
      throw error;
    });
  warmups.set(id,result);
  return result;
}
