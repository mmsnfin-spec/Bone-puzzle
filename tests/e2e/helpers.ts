import { expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { BoneDefinition, BonePlayState } from "../../src/types/bone";

export const handBones = JSON.parse(
  readFileSync(new URL("../../src/data/hand.json", import.meta.url), "utf8"),
).bones as BoneDefinition[];
export type Point = { x: number; y: number };
export type Sample = { screen: Point; target: Point; position: number[]; rotation: number[]; minY: number };
export type SceneStats = {
  frames?: number;
  frameCount?: number;
  physicsSteps?: number;
  dynamicBodies?: number;
  guideMeshes?: number;
  guideMeshCount?: number;
  controlsEnabled?: boolean;
  [name: string]: unknown;
};
export type Probe = {
  snapshot: () => Record<string, Sample>;
  hit: (x: number, y: number) => string | null;
  camera: () => { position: number[]; quaternion: number[]; zoom: number };
  stats?: () => SceneStats;
};
declare global {
  interface Window { __boneProbe: Probe; }
}
export type SavedState = {
  pieces: Record<string, BonePlayState>;
  difficulty: "easy" | "normal" | "hard";
  interactionMode: "move" | "rotate";
  guideEnabled: boolean;
  ghostOpacity: number;
  elapsedTime: number;
  hintsRemaining: number;
};
export async function load(page: Page) {
  await page.goto("/");
  await expect(page.locator(".app")).toHaveAttribute("data-screen", "title");
}
export async function menu(page: Page, keyboard = false) {
  await expect(page.locator(".app")).toHaveAttribute("data-screen", /title|menu/);
  if ((await page.locator(".app").getAttribute("data-screen")) === "title") {
    if (keyboard) await page.keyboard.press("a");
    else await page.getByRole("button", { name: "Start", exact: true }).click();
  }
  await expect(page.locator(".app")).toHaveAttribute("data-screen", "menu");
}
export async function begin(page: Page, skip = true) {
  await menu(page);
  await page.getByRole("button", { name: "Start HAND", exact: true }).click();
  if (skip) {
    await expect(page.locator(".app")).toHaveAttribute("data-screen", /stageIntro|game/);
    if ((await page.locator(".app").getAttribute("data-screen")) === "stageIntro")
      await page.getByRole("button", { name: /Skip intro/ }).click();
  }
  await expect(page.locator(".app")).toHaveAttribute("data-screen", "game");
  await ready(page);
}
export async function ready(page: Page) {
  await page.waitForFunction(() => Boolean(window.__boneProbe) && Object.keys(window.__boneProbe.snapshot()).length === 27);
  await expect(page.locator(".model-loading")).toHaveCount(0);
  await page.waitForTimeout(350);
}
export async function state(page: Page): Promise<SavedState> {
  return page.evaluate(() => JSON.parse(localStorage.getItem("bone-puzzle-3d:hand:v1")!).state);
}
export async function snapshot(page: Page) {
  return page.evaluate(() => window.__boneProbe.snapshot());
}
export async function camera(page: Page) {
  return page.evaluate(() => window.__boneProbe.camera());
}
export async function stats(page: Page) {
  return page.evaluate(() => window.__boneProbe.stats?.() ?? {});
}
export async function grabPoint(page: Page, id: string) {
  const s = (await snapshot(page))[id];
  const point = await page.evaluate(({ center, id }) => {
    for (const radius of [0, 3, 6, 10, 15, 22, 30, 40])
      for (let i = 0; i < 16; i++) {
        const x = center.x + radius * Math.cos((i * Math.PI) / 8);
        const y = center.y + radius * Math.sin((i * Math.PI) / 8);
        if (window.__boneProbe.hit(x, y) === id) return { x, y };
      }
    return null;
  }, { center: s.screen, id });
  expect(point, `visible clickable surface for ${id}`).not.toBeNull();
  return point!;
}
export async function placeWithMouse(page: Page, id: string, wrong = false) {
  const s = (await snapshot(page))[id];
  const p = await grabPoint(page, id);
  const dest = wrong ? { x: s.target.x + 200, y: s.target.y - 80 } : {
    x: s.target.x + p.x - s.screen.x,
    y: s.target.y + p.y - s.screen.y,
  };
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(dest.x, dest.y, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(280);
}
export function quaternionAngle(a: number[], b: number[]) {
  const norm = Math.hypot(...a) * Math.hypot(...b);
  return 2 * Math.acos(Math.min(1, Math.abs(a.reduce((sum, x, i) => sum + x * b[i], 0) / norm)));
}
export async function setMode(page: Page, mode: "move" | "rotate") {
  const button = page.getByRole("button", { name: mode === "move" ? "이동 모드" : "회전 모드", exact: true });
  await button.click();
  await expect(button).toHaveAttribute("aria-pressed", "true");
}
export async function restart(page: Page) {
  await page.getByRole("button", { name: /Restart/ }).click();
  if ((await page.locator(".app").getAttribute("data-screen")) === "stageIntro")
    await page.getByRole("button", { name: /Skip intro/ }).click();
  await expect(page.locator(".app")).toHaveAttribute("data-screen", "game");
  await ready(page);
}
export async function continueSession(page: Page) {
  await load(page);
  await menu(page);
  await page.getByRole("button", { name: /이어하기/ }).click();
  await expect(page.locator(".app")).toHaveAttribute("data-screen", /game|complete/);
  await ready(page);
}
