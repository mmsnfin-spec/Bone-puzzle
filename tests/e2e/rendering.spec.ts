import { test, expect } from "@playwright/test";
import { begin, continueSession, handBones, load, menu, placeWithMouse, ready, state, stats } from "./helpers";

test("minimal title loads no scene, menu controls and responsive layouts remain usable", async ({ page }) => {
  const modelRequests: string[] = [];
  page.on("request", (request) => { if (request.url().endsWith(".glb")) modelRequests.push(request.url()); });
  await load(page);
  await expect(page.locator(".title-screen")).toHaveText("BONE PUZZLE아무 key나 눌러 시작하시오");
  await expect(page.locator(".title-screen button")).toHaveCount(0);
  await expect(page.locator("canvas")).toHaveCount(0);
  await page.waitForTimeout(350);
  expect(modelRequests).toHaveLength(0);
  await page.keyboard.down("Shift");
  await page.keyboard.up("Shift");
  await expect(page.locator(".app")).toHaveAttribute("data-screen", "title");
  await page.keyboard.down("a");
  await page.keyboard.down("a");
  await page.keyboard.up("a");
  await expect(page.locator(".app")).toHaveAttribute("data-screen", "menu");
  for (const name of ["FOOT", "UPPER LIMB", "LOWER LIMB", "PELVIS", "SPINE", "THORAX", "SKULL"])
    await expect(page.getByRole("button", { name, exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "설정", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await page.getByRole("button", { name: "About / Credits", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("BodyParts3D");
  await expect(page.getByRole("dialog")).toContainText("CC");
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  for (const size of [{ width: 1280, height: 720 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(size);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(size.width);
    await expect(page.getByRole("button", { name: "Start HAND", exact: true })).toBeInViewport();
    await page.screenshot({ path: `test-results/menu-${size.width}.png` });
  }
  await begin(page);
  for (const size of [{ width: 1280, height: 720 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(size);
    await expect(page.getByRole("button", { name: "조립 가이드", exact: true })).toBeInViewport();
    await expect(page.getByRole("button", { name: "회전 모드", exact: true })).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(size.width);
    await page.screenshot({ path: `test-results/game-${size.width}.png` });
  }
});

test("guide is truly unmounted when off, persists, and static gameplay stops drawing", async ({ page }) => {
  await load(page);
  await begin(page);
  const guide = page.getByRole("button", { name: "조립 가이드", exact: true });
  const opacity = page.getByLabel("고스트 투명도", { exact: true });
  await expect(guide).toHaveAttribute("aria-pressed", "true");
  await opacity.focus();
  await page.keyboard.press("Home");
  for (let i = 0; i < 7; i++) await page.keyboard.press("ArrowRight");
  expect((await state(page)).ghostOpacity).toBeCloseTo(0.12);
  await guide.click();
  await expect(guide).toHaveAttribute("aria-pressed", "false");
  await expect(opacity).toBeDisabled();
  expect((await state(page)).guideEnabled).toBe(false);
  await page.waitForTimeout(500);
  let before = await stats(page);
  expect(before.guideMeshCount).toBe(0);
  expect(before.dynamicBodies).toBe(0);
  expect(before.physicsMounted).toBe(false);
  expect(typeof before.frameCount).toBe("number");
  await page.waitForTimeout(1100);
  let after = await stats(page);
  expect(after.frameCount).toBe(before.frameCount);
  expect(after.physicsSteps).toBe(before.physicsSteps);
  await continueSession(page);
  expect((await state(page)).guideEnabled).toBe(false);
  expect((await state(page)).ghostOpacity).toBeCloseTo(0.12);
  expect((await stats(page)).guideMeshCount).toBe(0);
  await placeWithMouse(page, handBones[0].id);
  expect((await state(page)).pieces[handBones[0].id].placed).toBe(true);
  await page.waitForTimeout(500);
  before = await stats(page);
  await page.waitForTimeout(750);
  after = await stats(page);
  expect(after.frameCount).toBe(before.frameCount);
  await page.keyboard.press("g");
  await expect(guide).toHaveAttribute("aria-pressed", "true");
  expect((await stats(page)).guideMeshCount).toBe(26);
  await page.keyboard.press("Escape");
  await expect(page.locator(".app")).toHaveAttribute("data-screen", "paused");
  const pausedTime = (await state(page)).elapsedTime;
  await page.waitForTimeout(1100);
  expect((await state(page)).elapsedTime).toBe(pausedTime);
  await page.getByRole("button", { name: /재개/ }).click();
  await expect(page.locator(".app")).toHaveAttribute("data-screen", "game");
});

test("real foreground switch pauses intro physics and resumes without background simulation", async ({ page, context }) => {
  test.skip(process.env.E2E_HEADFUL !== "1", "Real document.hidden requires DISPLAY and E2E_HEADFUL=1; headless tabs may stay visible.");
  await load(page);
  await menu(page);
  await page.getByRole("button", { name: "Start HAND", exact: true }).click();
  await ready(page);
  await expect.poll(async () => (await stats(page)).dynamicBodies).toBe(27);
  const client = await context.newCDPSession(page);
  await client.send("Emulation.setFocusEmulationEnabled", { enabled: false });
  const foreground = await context.newPage();
  await foreground.goto("about:blank");
  await foreground.bringToFront();
  await expect.poll(() => page.evaluate(() => document.hasFocus())).toBe(false);
  await page.waitForTimeout(150);
  const before = await stats(page);
  await page.waitForTimeout(700);
  const after = await stats(page);
  expect(after.physicsSteps).toBe(before.physicsSteps);
  expect(after.frameCount).toBe(before.frameCount);
  await page.bringToFront();
  await expect.poll(() => page.evaluate(() => document.hasFocus())).toBe(true);
  await foreground.close();
  await expect(page.locator(".app")).toHaveAttribute("data-screen", "game");
  expect((await stats(page)).physicsMounted).toBe(false);
});
