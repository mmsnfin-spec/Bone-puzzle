import { describe, expect, it } from "vitest";
import { Euler, Quaternion, Vector3 } from "three";
import {
  ARCBALL_RADIUS_PX,
  applyArcballDelta,
  arcballDelta,
} from "../src/scene/Arcball";
import {
  normalizeQuaternion,
  rotateQuaternion,
} from "../src/systems/RotationSystem";
import type { Quat } from "../src/types/bone";

const identity = new Quaternion();
const radians = (degrees: number) => (degrees * Math.PI) / 180;
const equivalent = (a: Quaternion, b: Quaternion) => {
  expect(Math.abs(a.clone().normalize().dot(b.clone().normalize()))).toBeCloseTo(1, 11);
};

describe("numeric quaternion rotation shared by keyboard and mouse", () => {
  it("premultiplies world-axis rotation rather than adding Euler angles", () => {
    const start = new Quaternion().setFromEuler(new Euler(0.7, -1.2, 0.4));
    for (const axis of ["x", "y", "z"] as const) {
      const unit = new Vector3(Number(axis === "x"), Number(axis === "y"), Number(axis === "z"));
      const expected = start.clone().premultiply(new Quaternion().setFromAxisAngle(unit, radians(15)));
      const actual = rotateQuaternion(start.toArray() as Quat, axis, 15);
      equivalent(new Quaternion(...actual), expected);
      expect(Math.hypot(...actual)).toBeCloseTo(1, 14);
    }
  });

  it("keeps normalized finite state across 360 degrees, reversals and invalid input", () => {
    let rotation: Quat = [0, 0, 0, 1];
    for (let i = 0; i < 24; i++) rotation = rotateQuaternion(rotation, "x", 15);
    equivalent(new Quaternion(...rotation), identity);
    rotation = rotateQuaternion(rotation, "y", 180);
    rotation = rotateQuaternion(rotation, "y", -180);
    equivalent(new Quaternion(...rotation), identity);
    const extreme = normalizeQuaternion([1e300, 0, 0, 1e300]);
    expect(extreme[0]).toBeCloseTo(Math.SQRT1_2, 14);
    expect(extreme[3]).toBeCloseTo(Math.SQRT1_2, 14);
    expect(extreme.slice(1, 3)).toEqual([0, 0]);
    expect(normalizeQuaternion([NaN, 0, 0, 1])).toEqual([0, 0, 0, 1]);
    expect(normalizeQuaternion([0, 0, 0, 0])).toEqual([0, 0, 0, 1]);
    expect(rotateQuaternion([0, 0, 0, 1], "x", Infinity)).toEqual([0, 0, 0, 1]);
  });
});

describe("incremental camera-relative arcball", () => {
  it("supports horizontal, vertical, diagonal, 180 and 360 degree strokes", () => {
    equivalent(
      arcballDelta(ARCBALL_RADIUS_PX * Math.PI, 0, identity),
      new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI),
    );
    equivalent(arcballDelta(ARCBALL_RADIUS_PX * Math.PI * 2, 0, identity), identity);
    equivalent(
      arcballDelta(0, ARCBALL_RADIUS_PX * Math.PI / 2, identity),
      new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2),
    );
    const diagonal = arcballDelta(50, 50, identity);
    expect(diagonal.x).toBeCloseTo(diagonal.y, 14);
    expect(diagonal.z).toBe(0);
    expect(Math.hypot(diagonal.x, diagonal.y, diagonal.z, diagonal.w)).toBeCloseTo(1, 14);
  });

  it("has equal sensitivity for fast/slow pointer events at any camera orientation", () => {
    const camera = new Quaternion().setFromEuler(new Euler(-0.4, 1.1, 0.3));
    const start = new Quaternion().setFromEuler(new Euler(0.2, -0.5, 0.9));
    const fast = start.clone().premultiply(arcballDelta(310, -180, camera)).normalize();
    const slow = start.clone();
    for (let i = 0; i < 100; i++) slow.premultiply(arcballDelta(3.1, -1.8, camera)).normalize();
    equivalent(fast, slow);
    for (let i = 0; i < 100; i++) slow.premultiply(arcballDelta(-3.1, 1.8, camera)).normalize();
    equivalent(slow, start);
  });

  it("rotates around camera axes, not fixed world axes or geometry scale", () => {
    const camera = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI / 2);
    const actual = arcballDelta(70, 0, camera);
    equivalent(actual, new Quaternion().setFromAxisAngle(new Vector3(-1, 0, 0), 0.5));
    equivalent(actual, arcballDelta(70, 0, new Quaternion(camera.x * 7, camera.y * 7, camera.z * 7, camera.w * 7)));
    // Mesh scale/zoom never enters the fixed-CSS-pixel arcball calculation.
    const geometryScales = [0.05, 1, 20];
    for (const _scale of geometryScales) equivalent(arcballDelta(70, 0, camera), actual);
  });

  it("converts a world rotation into transformed parent coordinates without moving the pivot", () => {
    const parent = new Quaternion().setFromEuler(new Euler(-0.7, 0.8, 0.2));
    const local = new Quaternion().setFromEuler(new Euler(0.1, 0.4, -0.6));
    const delta = arcballDelta(85, 40, new Quaternion().setFromEuler(new Euler(0.5, 0.2, 0.4)));
    const next = applyArcballDelta(local, delta, parent);
    equivalent(parent.clone().multiply(next), delta.clone().multiply(parent).multiply(local));
    equivalent(local, new Quaternion().setFromEuler(new Euler(0.1, 0.4, -0.6)));
  });

  it("preserves normalization through long mixed-axis interaction and handles zero motion", () => {
    const rotation = new Quaternion();
    const camera = new Quaternion().setFromEuler(new Euler(-0.3, 0.7, -0.2));
    const delta = new Quaternion();
    for (let i = 0; i < 5000; i++)
      rotation.premultiply(arcballDelta(Math.sin(i) * 8, Math.cos(i * 0.4) * 8, camera, ARCBALL_RADIUS_PX, delta)).normalize();
    expect(rotation.length()).toBeCloseTo(1, 14);
    equivalent(arcballDelta(0, 0, camera), identity);
    equivalent(arcballDelta(NaN, 0, camera), identity);
    equivalent(arcballDelta(1, 2, camera, 0), identity);
  });
});
