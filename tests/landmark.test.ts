import { beforeEach, describe, expect, it } from "vitest";
import { getPuzzle, thoracicLandmarks } from "../src/data/puzzles";
import { freshPieces, restorePieces, stageStorageKey, STORAGE_KEY, ACTIVE_STAGE_KEY } from "../src/utils/persistence";
import { initialOrientation } from "../src/systems/OrientationSystem";
import { quaternionAngle, canSnap } from "../src/systems/SnapSystem";
import { useGameStore, flushGameSave } from "../src/state/gameStore";
import { LANDMARK_DIFFICULTY } from "../src/data/config/landmarkDifficulty";
import { handBones } from "../src/data/bones";
import type { Quat } from "../src/types/bone";
const stage="thoracic-t06";
const puzzle=getPuzzle(stage);
function rng(seed=1337){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
beforeEach(()=>{flushGameSave();localStorage.clear();useGameStore.getState().newGame("easy","hand");});
describe("T06 landmark contract",()=>{
  it("keeps exactly the same seven immutable anatomical pieces and all 15 semantic landmarks",()=>{
    for(const difficulty of ["easy","normal","hard"] as const){
      const pieces=freshPieces(stage,difficulty,rng());expect(Object.keys(pieces)).toEqual(puzzle.bones.map(b=>b.id));
      expect(puzzle.bones.every(b=>b.fmaId==="FMA9945"&&b.puzzleType==="landmark"&&Object.isFrozen(b))).toBe(true);
      expect(restorePieces(pieces,stage)).not.toBeNull();
    }
    expect(thoracicLandmarks).toHaveLength(15);
    expect(new Set(thoracicLandmarks.map(l=>l.id))).toContain("transverse-costal-facet");
    expect(puzzle.groups.map(g=>g.bones.length)).toEqual([1,1,3,2]);
    expect(puzzle.bones.every(b=>b.learning?.relatedLandmarks.every(id=>thoracicLandmarks.some(l=>l.id===id)))).toBe(true);
  });
  it("keeps EASY near the target while NORMAL uses multiple rotated axes",()=>{
    const random=rng();
    for(let i=0;i<1000;i++){
      const easy=initialOrientation([0,0,0,1],"easy",random);
      expect(Math.hypot(...easy)).toBeCloseTo(1,12);expect(quaternionAngle(easy,[0,0,0,1])).toBeLessThan(25*Math.PI/180);
      const normal=initialOrientation([0,0,0,1],"normal",random);expect(Math.hypot(...normal)).toBeCloseTo(1,12);
      expect(quaternionAngle(normal,[0,0,0,1])).toBeGreaterThan(20*Math.PI/180);
      expect(normal.slice(0,3).filter(x=>Math.abs(x)>.05).length).toBeGreaterThanOrEqual(2);
    }
  });
  it("HARD samples normalized unbiased SO(3) orientations, including inversions",()=>{
    const random=rng();const n=12000;const sums=[0,0,0,0];const squares=[0,0,0,0];let superiorReversed=0, anteriorReversed=0;
    for(let i=0;i<n;i++){
      const q=initialOrientation([0,0,0,1],"hard",random);expect(Math.hypot(...q)).toBeCloseTo(1,12);
      q.forEach((x,j)=>{sums[j]+=x;squares[j]+=x*x;});
      if(1-2*(q[0]*q[0]+q[2]*q[2])<0)superiorReversed++;
      if(1-2*(q[0]*q[0]+q[1]*q[1])<0)anteriorReversed++;
    }
    sums.forEach(x=>expect(Math.abs(x/n)).toBeLessThan(.025));squares.forEach(x=>expect(x/n).toBeCloseTo(.25,1));
    expect(superiorReversed/n).toBeGreaterThan(.45);expect(superiorReversed/n).toBeLessThan(.55);expect(anteriorReversed/n).toBeGreaterThan(.45);
  });
  it.each(["easy","normal","hard"] as const)("%s enforces its angular boundary, positions, and all seven completion poses",difficulty=>{
    const s=useGameStore.getState();s.newGame(difficulty,stage);const degrees=LANDMARK_DIFFICULTY[difficulty].rotationTolerance;
    for(const b of puzzle.bones){
      const q=(d:number):Quat=>[Math.sin(d*Math.PI/360),0,0,Math.cos(d*Math.PI/360)];
      expect(canSnap(b,{position:b.targetPosition,rotation:q(degrees-.1)},difficulty)).toBe(true);
      expect(canSnap(b,{position:b.targetPosition,rotation:q(degrees+.1)},difficulty)).toBe(false);
      expect(canSnap(b,{position:[b.targetPosition[0]+1,...b.targetPosition.slice(1)] as [number,number,number],rotation:b.targetRotation},difficulty)).toBe(false);
      expect(s.drop(b.id,{position:b.targetPosition,rotation:b.targetRotation})).toBe(true);
    }
    expect(Object.values(useGameStore.getState().pieces).filter(p=>p.placed)).toHaveLength(7);
  });
  it("clears only the active T06 save and recovers the preserved HAND record",async()=>{
    useGameStore.getState().saveLabel(handBones[0].id,"surviving note");
    const hand=localStorage.getItem(STORAGE_KEY);
    useGameStore.getState().newGame("normal",stage);
    useGameStore.persist.clearStorage();
    expect(localStorage.getItem(stageStorageKey(stage))).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBe(hand);
    await useGameStore.persist.rehydrate();expect(useGameStore.getState().stageId).toBe("hand");
    expect(useGameStore.getState().pieces[handBones[0].id].userLabel).toBe("surviving note");
  });
  it("preserves HAND v1 and T06 independently through switching, rehydration, and restart",async()=>{
    const hand=handBones[0];useGameStore.getState().saveLabel(hand.id,"a saved HAND note");
    const original=localStorage.getItem(STORAGE_KEY);
    useGameStore.getState().newGame("hard",stage);const first=puzzle.bones[0];useGameStore.getState().saveLabel(first.id,"a saved T06 note");
    const initial=useGameStore.getState().pieces[first.id].transform.rotation;
    expect(localStorage.getItem(STORAGE_KEY)).toBe(original);
    expect(localStorage.getItem(ACTIVE_STAGE_KEY)).toBe(stage);
    await useGameStore.persist.rehydrate();expect(useGameStore.getState().stageId).toBe(stage);expect(useGameStore.getState().pieces[first.id].transform.rotation).toEqual(initial);
    expect(useGameStore.getState().resumeStage("hand")).toBe(true);expect(useGameStore.getState().pieces[hand.id].userLabel).toBe("a saved HAND note");
    expect(useGameStore.getState().resumeStage(stage)).toBe(true);expect(useGameStore.getState().pieces[first.id].userLabel).toBe("a saved T06 note");
    useGameStore.getState().newGame();expect(Object.keys(useGameStore.getState().pieces)).toHaveLength(7);expect(useGameStore.getState().pieces[first.id].transform.rotation).not.toEqual(initial);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(original);expect(JSON.parse(localStorage.getItem(stageStorageKey(stage))!).state.stageId).toBe(stage);
  });
});
