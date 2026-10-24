import { describe, expect, it } from "vitest";
import original from "../src/data/hand.json";
import { handBones, handBonesByCategory, handBoneIndexById, handSource } from "../src/data/bones";
import { createBoneCatalog } from "../src/data/catalog";
import { STAGE_METADATA } from "../src/data/stageRegistry";
import { freshPieces } from "../src/utils/persistence";
import { canSnap } from "../src/systems/SnapSystem";

describe("anatomical catalog boundaries", () => {
  it("indexes the complete original data without rewriting targets or provenance", () => {
    expect(handBones).toEqual(original.bones);
    expect(handSource.coordinateMapping).toEqual(original.coordinateMapping);
    expect(Object.values(handBonesByCategory).map((bones) => bones.length)).toEqual([8, 5, 14]);
    for (const bone of handBones) expect(handBones[handBoneIndexById[bone.id]]).toBe(bone);
  });
  it("keeps immutable definitions separate from mutable session poses", () => {
    const pieces = freshPieces();
    const bone = handBones[0];
    pieces[bone.id].transform.position[0] += 1;
    expect(pieces[bone.id].transform.position).not.toEqual(bone.initialTransform.position);
    expect(Object.isFrozen(bone.targetPosition)).toBe(true);
    expect(Object.isFrozen(handBones)).toBe(true);
    expect(canSnap(bone, { position: [...bone.targetPosition], rotation: [...bone.targetRotation] }, "hard")).toBe(true);
  });
  it("rejects duplicate FMA IDs and incorrect category counts", () => {
    const invalid = structuredClone(original);
    invalid.bones[1].id = invalid.bones[0].id;
    expect(() => createBoneCatalog(invalid, { carpals: 8, metacarpals: 5, phalanges: 14 })).toThrow();
    expect(() => createBoneCatalog(structuredClone(original), { carpals: 7, metacarpals: 5, phalanges: 14 })).toThrow();
  });
  it("registers only stages with available anatomy as playable", () => {
    expect(STAGE_METADATA.filter((stage) => stage.available).map((stage) => stage.id)).toEqual(["hand"]);
    expect(STAGE_METADATA[0].count).toBe(handBones.length);
    expect(new Set(STAGE_METADATA.map((stage) => stage.id)).size).toBe(STAGE_METADATA.length);
  });
});
