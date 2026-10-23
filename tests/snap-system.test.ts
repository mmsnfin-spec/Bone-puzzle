import { describe, it, expect } from "vitest";
import { handBones } from "../src/data/bones";
import { canSnap, quaternionAngle } from "../src/systems/SnapSystem";
const bone = handBones[0];
describe("identity-specific magnetic snap", () => {
  it("accepts every exact target in all difficulties", () => {
    for (const b of handBones)
      for (const difficulty of ["easy", "normal", "hard"] as const)
        expect(
          canSnap(
            b,
            { position: b.targetPosition, rotation: b.targetRotation },
            difficulty,
          ),
        ).toBe(true);
  });
  it("rejects a distant position and another bone target", () => {
    expect(
      canSnap(
        bone,
        { position: [99, 99, 99], rotation: bone.targetRotation },
        "easy",
      ),
    ).toBe(false);
    const other = handBones.find((b) =>
      b.englishName.includes("Distal phalanx"),
    )!;
    expect(
      canSnap(
        bone,
        { position: other.targetPosition, rotation: other.targetRotation },
        "easy",
      ),
    ).toBe(false);
  });
  it("corrects orientation only on Easy", () => {
    const t = {
      position: bone.targetPosition,
      rotation: [1, 0, 0, 0] as [number, number, number, number],
    };
    expect(canSnap(bone, t, "easy")).toBe(true);
    expect(canSnap(bone, t, "normal")).toBe(false);
    expect(canSnap(bone, t, "hard")).toBe(false);
  });
  it("uses stricter hard distance and rotation tolerances", () => {
    const t = {
      position: [
        bone.targetPosition[0] + bone.snapDistance * 0.7,
        ...bone.targetPosition.slice(1),
      ] as [number, number, number],
      rotation: bone.targetRotation,
    };
    expect(canSnap(bone, t, "easy")).toBe(true);
    expect(canSnap(bone, t, "normal")).toBe(true);
    expect(canSnap(bone, t, "hard")).toBe(false);
    const rotation = [0, Math.sin(0.25 / 2), 0, Math.cos(0.25 / 2)] as [
      number,
      number,
      number,
      number,
    ];
    expect(
      canSnap(bone, { position: bone.targetPosition, rotation }, "normal"),
    ).toBe(true);
    expect(
      canSnap(bone, { position: bone.targetPosition, rotation }, "hard"),
    ).toBe(false);
  });
  it("handles quaternion sign equivalence and invalid coordinates", () => {
    expect(quaternionAngle([0, 0, 0, 1], [0, 0, 0, -1])).toBe(0);
    expect(
      canSnap(
        bone,
        { position: [NaN, 0, 0], rotation: bone.targetRotation },
        "easy",
      ),
    ).toBe(false);
    expect(quaternionAngle([0, 0, 0, 0], [0, 0, 0, 1])).toBe(Infinity);
  });
});
