import { describe, it, expect } from "vitest";
import { handBones } from "../src/data/bones";
import { validateName } from "../src/systems/NameValidationSystem";
const capitate = handBones.find((b) => b.englishName === "Capitate")!;
describe("anatomical naming", () => {
  it.each([
    "Capitate",
    "capitate",
    "CAPITATE",
    "  Capitate  ",
    "right capitate",
    "capitate bone",
  ])("accepts verified name %s", (name) =>
    expect(validateName(name, capitate)).toBe(true),
  );
  it.each(["", "capitat", "hamate", "left capitate", "capitate!!!"])(
    "rejects wrong name %s",
    (name) => expect(validateName(name, capitate)).toBe(false),
  );
  it("requires digit specificity for phalanges", () => {
    const b = handBones.find(
      (b) => b.englishName === "Proximal phalanx of index finger",
    )!;
    expect(validateName("proximal phalanx", b)).toBe(false);
    expect(validateName("proximal phalanx of right index finger", b)).toBe(
      true,
    );
  });
});
