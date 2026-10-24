import type { Difficulty } from "../types/game";
import type { Quat } from "../types/bone";
import { LANDMARK_DIFFICULTY } from "../data/config/landmarkDifficulty";
import { normalizeQuaternion } from "./RotationSystem";
export function multiplyOrientation(a: Quat, b: Quat): Quat {
  return normalizeQuaternion([
    a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],
    a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],
    a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],
    a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2],
  ]);
}
export function initialOrientation(target: Quat, difficulty: Difficulty, random = Math.random): Quat {
  let delta: Quat;
  if (difficulty === "hard") {
    // Shoemake: uniform Haar measure on SO(3), rather than uniform Euler angles.
    const u=random(), a=random()*2*Math.PI, b=random()*2*Math.PI;
    delta=[Math.sqrt(1-u)*Math.sin(a),Math.sqrt(1-u)*Math.cos(a),Math.sqrt(u)*Math.sin(b),Math.sqrt(u)*Math.cos(b)];
  } else {
    const angles = Array.from({length:3},()=>difficulty === "easy"
      ? (random()*2-1)*LANDMARK_DIFFICULTY.easy.axisDegrees
      : (random()<.5?-1:1)*(LANDMARK_DIFFICULTY.normal.minimumAxisDegrees+random()*(LANDMARK_DIFFICULTY.normal.maximumAxisDegrees-LANDMARK_DIFFICULTY.normal.minimumAxisDegrees)));
    delta=[0,0,0,1];
    angles.forEach((degrees,axis)=>{ const half=degrees*Math.PI/360;const q:Quat=[0,0,0,Math.cos(half)];q[axis]=Math.sin(half);delta=multiplyOrientation(delta,q); });
  }
  return multiplyOrientation(target,delta);
}
