import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { Euler, Quaternion } from "three";
import { camera, grabPoint, load, menu, snapshot } from "./helpers";
import type { BoneDefinition } from "../../src/types/bone";
const bones=JSON.parse(readFileSync(new URL('../../src/data/anatomy/t06.json',import.meta.url),'utf8')).bones as BoneDefinition[];
const key="bone-puzzle-3d:thoracic-t06:v1";
const saved=(page:Page)=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).state,key);
async function readyT06(page:Page){
  await page.waitForFunction(()=>Boolean(window.__boneProbe)&&Object.keys(window.__boneProbe.snapshot()).length===7);
  await expect(page.locator('.model-loading')).toHaveCount(0);await page.waitForTimeout(350);
}
async function alignWithButtons(page:Page,bone:BoneDefinition,index:number){
  await page.getByRole('button',{name:`조각 ${String(index+1).padStart(2,'0')} 선택`,exact:true}).click();
  const pose=(await saved(page)).pieces[bone.id].transform;
  const correction=new Quaternion(...bone.targetRotation).multiply(new Quaternion(...pose.rotation).invert());
  const angles=new Euler().setFromQuaternion(correction,'ZYX');
  await page.locator('.rotation-controls summary').click();
  for(const [axis,angle] of [['x',angles.x],['y',angles.y],['z',angles.z]] as const){
    const steps=Math.round(angle*180/Math.PI/5);const button=page.getByRole('button',{name:`${axis}축 ${steps<0?'반시계':'시계'} 회전`,exact:true});
    for(let i=0;i<Math.floor(Math.abs(steps)/3);i++)await button.click();
    for(let i=0;i<Math.abs(steps)%3;i++)await button.click({modifiers:['Shift']});
  }
  await page.locator('.rotation-controls summary').click();
}
for(const difficulty of ['easy','normal','hard'])test(`T06 ${difficulty}: seven real pointer placements complete the original vertebra`,async({page})=>{
  test.setTimeout(270000);await page.setViewportSize({width:1920,height:1080});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await load(page);await menu(page);await page.getByLabel('DIFFICULTY',{exact:true}).selectOption(difficulty);
  await page.getByRole('button',{name:'Start T06',exact:true}).click();
  if(difficulty==='easy'){
    await readyT06(page);
    while(await page.locator('.app').getAttribute('data-screen') === 'stageIntro'){
      for(const piece of Object.values(await snapshot(page))){
        expect(piece.bounds.left).toBeGreaterThanOrEqual(0);expect(piece.bounds.right).toBeLessThanOrEqual(1920);
        expect(piece.bounds.top).toBeGreaterThanOrEqual(60);expect(piece.bounds.bottom).toBeLessThanOrEqual(960);
      }
      await page.waitForTimeout(80);
    }
    await expect(page.locator('.app')).toHaveAttribute('data-screen','game');
  }else await page.getByRole('button',{name:/Skip intro/}).click();
  await readyT06(page);expect(Object.keys((await saved(page)).pieces)).toHaveLength(7);
  const first=bones[0];const point=await grabPoint(page,first.id);const before=(await saved(page)).pieces[first.id].transform;const view=await camera(page);
  await page.mouse.click(point.x,point.y);await page.getByRole('button',{name:'마우스로 회전',exact:true}).click();
  await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x+75,point.y-40,{steps:12});await page.mouse.up();
  const rotated=(await saved(page)).pieces[first.id].transform;expect(rotated.rotation).not.toEqual(before.rotation);expect(rotated.position).toEqual(before.position);expect(await camera(page)).toEqual(view);
  await page.getByRole('button',{name:'이동 모드',exact:true}).click();
  await page.getByRole('button',{name:'조립 가이드',exact:true}).click();
  await page.screenshot({path:`test-results/t06-${difficulty}-start.png`});
  for(const [index,bone] of bones.entries()){
    await alignWithButtons(page,bone,index);
    const start=(await snapshot(page))[bone.id];const point=await grabPoint(page,bone.id);
    await page.mouse.move(point.x,point.y);await page.mouse.down();
    await page.mouse.move(start.target.x+point.x-start.screen.x,start.target.y+point.y-start.screen.y,{steps:14});await page.mouse.up();
    await expect.poll(async()=>(await saved(page)).pieces[bone.id].placed).toBe(true);await page.waitForTimeout(260);
  }
  await expect(page.locator('.app')).toHaveAttribute('data-screen','complete');
  await expect(page.locator('.completion-panel')).toContainText('T06');
  await page.screenshot({path:`test-results/t06-${difficulty}-complete.png`});expect(errors).toEqual([]);
  await page.reload();await menu(page);await page.getByRole('button',{name:/이어하기/}).click();
  await expect(page.locator('.app')).toHaveAttribute('data-screen','complete');await readyT06(page);
  expect(Object.values((await saved(page)).pieces).every(p=>(p as {placed:boolean}).placed)).toBe(true);
});
test('HAND and T06 retain separate notes and poses across menu switching and reload',async({page})=>{
  await load(page);await menu(page);await page.getByRole('button',{name:'Start HAND',exact:true}).click();await page.getByRole('button',{name:/Skip intro/}).click();
  await page.getByRole('button',{name:'조각 01 선택',exact:true}).click();await page.getByLabel('ENGLISH ANATOMICAL NAME').fill('preserved HAND note');await page.getByRole('button',{name:'Save note',exact:true}).click();
  const original=await page.evaluate(()=>localStorage.getItem('bone-puzzle-3d:hand:v1'));
  await page.keyboard.press('Escape');await page.getByRole('button',{name:/Stage Select/}).click();
  await page.getByRole('button',{name:'Start T06',exact:true}).click();await page.getByRole('button',{name:/Skip intro/}).click();await readyT06(page);
  await page.getByRole('button',{name:'조각 01 선택',exact:true}).click();await page.getByLabel('ENGLISH ANATOMICAL NAME').fill('preserved T06 note');await page.getByRole('button',{name:'Save note',exact:true}).click();
  expect(await page.evaluate(()=>localStorage.getItem('bone-puzzle-3d:hand:v1'))).not.toBeNull();
  const hand=JSON.parse(original!).state.pieces;const nowHand=await page.evaluate(()=>JSON.parse(localStorage.getItem('bone-puzzle-3d:hand:v1')!).state.pieces);expect(nowHand).toEqual(hand);
  await page.reload();await menu(page);await page.getByRole('button',{name:'HAND 기록 불러오기',exact:true}).click();await expect(page.locator('.app')).toHaveAttribute('data-screen','game');
  await page.getByRole('button',{name:'조각 01 선택',exact:true}).click();await expect(page.getByLabel('ENGLISH ANATOMICAL NAME')).toHaveValue('preserved HAND note');
  await page.keyboard.press('Escape');await page.getByRole('button',{name:/Stage Select/}).click();await page.getByRole('button',{name:'T06 기록 불러오기',exact:true}).click();await readyT06(page);
  await page.getByRole('button',{name:'조각 01 선택',exact:true}).click();await expect(page.getByLabel('ENGLISH ANATOMICAL NAME')).toHaveValue('preserved T06 note');
});
