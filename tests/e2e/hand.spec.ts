import { test, expect } from "@playwright/test";
import { handBones, load, menu, begin, ready, state, snapshot, grabPoint, placeWithMouse, restart } from "./helpers";

test("cinematic, all 27 actual pointer placements, naming, persistence and completion", async ({
  page,
}) => {
  test.setTimeout(270_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await load(page);
  await page.waitForTimeout(500);
  expect(await page.locator(".app").getAttribute("data-screen")).toBe("title");
  await page.screenshot({ path: "test-results/title.png" });
  await menu(page, true);
  await page.getByRole("button", { name: "Start HAND", exact: true }).click();
  await expect(page.locator(".app")).toHaveAttribute(
    "data-screen",
    "stageIntro",
  );
  await ready(page);
  await page.waitForTimeout(2300);
  const falling = await snapshot(page);
  expect(Object.values(falling).some((b) => b.position[1] < -1)).toBe(true);
  await expect(page.getByLabel("HAND", { exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/hand-intro.png" });
  await expect(page.locator(".app")).toHaveAttribute("data-screen", "game");
  await expect(page.getByLabel("HAND", { exact: true })).toHaveCount(0);
  await page.waitForTimeout(1500);
  const settled = await snapshot(page);
  expect(Object.keys(settled)).toHaveLength(27);
  expect(
    Math.min(...Object.values(settled).map((b) => b.minY)),
  ).toBeGreaterThan(-4.13);
  for (const bone of handBones)
    expect(
      Math.hypot(
        ...settled[bone.id].position.map(
          (x, i) => x - bone.initialTransform.position[i],
        ),
      ),
    ).toBeLessThan(0.06);
  await page.screenshot({ path: "test-results/gameplay.png" });
  const capitate = handBones.find((b) => b.englishName === "Capitate")!;
  const capPoint = await grabPoint(page, capitate.id);
  await page.mouse.click(capPoint.x, capPoint.y);
  await expect(page.getByLabel("ENGLISH ANATOMICAL NAME")).toBeVisible();
  await page.getByLabel("ENGLISH ANATOMICAL NAME").fill("wrong");
  await page.getByRole("button", { name: "Save note" }).click();
  expect((await state(page)).pieces[capitate.id].userLabel).toBe("wrong");
  await page.getByRole("button", { name: /Check/ }).click();
  await expect(
    page.getByRole("status", { name: "이름 확인 결과" }),
  ).toContainText("아직 맞지");
  await page.getByRole("button", { name: /이름 힌트 보기/ }).click();
  expect((await state(page)).hintsRemaining).toBe(4);
  expect((await state(page)).pieces[capitate.id].nameVerified).toBe(false);
  await page.getByRole("button", { name: /공개한 힌트/ }).click();
  expect((await state(page)).hintsRemaining).toBe(4);
  await page.getByLabel("ENGLISH ANATOMICAL NAME").fill("  CAPITATE  ");
  await page.getByRole("button", { name: /Check/ }).click();
  await expect(
    page.getByRole("status", { name: "이름 확인 결과" }),
  ).toContainText("정답입니다");
  await page.getByRole("button", { name: "조립 가이드", exact: true }).click();
  await expect(page.getByRole("button", { name: "조립 가이드", exact: true })).toHaveAttribute("aria-pressed", "false");
  const before = await page.evaluate(() => window.__boneProbe.camera());
  await placeWithMouse(page, handBones[0].id, true);
  expect((await state(page)).pieces[handBones[0].id].placed).toBe(false);
  const after = await page.evaluate(() => window.__boneProbe.camera());
  expect(after.position).toEqual(before.position);
  expect(after.quaternion).toEqual(before.quaternion);
  for (const bone of handBones) {
    await placeWithMouse(page, bone.id);
    expect(
      (await state(page)).pieces[bone.id].placed,
      `actual mouse drop: ${bone.id}`,
    ).toBe(true);
  }
  await expect(page.locator(".app")).toHaveAttribute("data-screen", "complete");
  await expect(page.getByRole("heading", { name: "Complete." })).toBeVisible();
  await page.screenshot({ path: "test-results/complete.png" });
  await page.getByRole("button", { name: /Back to Stage Select/ }).click();
  await page.reload();
  await menu(page);
  await expect(page.getByRole("button", { name: /이어하기/ })).toBeVisible();
  await page.getByRole("button", { name: /이어하기/ }).click();
  await expect(page.locator(".app")).toHaveAttribute("data-screen", "complete");
  await page.getByRole("button", { name: /Replay/ }).click();
  await page.getByRole("button", { name: /Skip intro/ }).click();
  expect((await state(page)).hintsRemaining).toBe(5);
  expect((await state(page)).guideEnabled).toBe(false);
  expect(
    Object.values((await state(page)).pieces).filter((p: any) => p.placed),
  ).toHaveLength(0);
  expect(errors).toEqual([]);
});

test("camera orbit, zoom, rotated-camera drag, five-hint cap, restart", async ({
  page,
}) => {
  await load(page);
  await begin(page);
  const before = await page.evaluate(() => window.__boneProbe.camera());
  await page.mouse.move(850, 350);
  await page.mouse.down();
  await page.mouse.move(930, 390, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(600);
  const after = await page.evaluate(() => window.__boneProbe.camera());
  expect(after.quaternion).not.toEqual(before.quaternion);
  await placeWithMouse(page, handBones[0].id);
  expect((await state(page)).pieces[handBones[0].id].placed).toBe(true);
  await page.mouse.move(800, 350);
  await page.mouse.wheel(0, -150);
  await page.waitForTimeout(400);
  expect(
    (await page.evaluate(() => window.__boneProbe.camera())).zoom,
  ).toBeGreaterThan(after.zoom);
  await page.getByRole("button", { name: /시점 초기화/ }).click();
  for (let i = 0; i < 5; i++) {
    await page
      .getByRole("button", {
        name: `조각 ${String(i + 1).padStart(2, "0")} 선택`,
      })
      .click();
    await page.getByRole("button", { name: /이름 힌트 보기/ }).click();
  }
  await page.getByRole("button", { name: "조각 06 선택" }).click();
  await expect(
    page.getByRole("button", { name: /이름 힌트 보기/ }),
  ).toBeDisabled();
  expect((await state(page)).hintsRemaining).toBe(0);
  await restart(page);
  expect((await state(page)).hintsRemaining).toBe(5);
  expect((await state(page)).pieces[handBones[0].id].placed).toBe(false);
});

test("mobile layout, reduced motion and asset failure feedback", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await load(page);
  await menu(page);
  await expect(
    page.getByRole("checkbox", { name: "모션 줄이기" }),
  ).toBeChecked();
  await begin(page);
  await expect(page.getByRole("progressbar")).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
  await page.getByRole("button", { name: "조각 07 선택" }).click();
  await page.getByLabel("ENGLISH ANATOMICAL NAME").fill("capitate");
  await page.getByRole("button", { name: /Check/ }).click();
  await expect(
    page.getByRole("status", { name: "이름 확인 결과" }),
  ).toContainText("정답입니다");
  await page.route("**/*.glb", (route) => route.abort());
  await page.reload();
  await menu(page);
  await page.getByRole("button", { name: /이어하기/ }).click();
  await expect(page.getByRole("alert")).toContainText(
    "3D 모델을 불러오지 못했습니다",
  );
});

test("Normal rejects rotation mismatch, rotation controls and keyboard placement work", async ({
  page,
}) => {
  await load(page);
  await menu(page);
  await page.getByLabel("DIFFICULTY").selectOption("normal");
  await begin(page);
  const bone = handBones[1];
  await page.getByRole("button", { name: "조각 02 선택" }).click();
  await placeWithMouse(page, bone.id);
  expect((await state(page)).pieces[bone.id].placed).toBe(false);
  await page.getByText("조각 회전 · 키보드 조작", { exact: true }).click();
  for (let i = 0; i < 6; i++)
    await page.getByRole("button", { name: "x축 반시계 회전" }).click();
  await page.getByRole("button", { name: "조각 02 선택" }).click();
  await page.keyboard.press("Enter");
  expect((await state(page)).pieces[bone.id].placed).toBe(true);
  await page.getByRole("button", { name: "조각 03 선택" }).click();
  const previous = (await state(page)).pieces[handBones[2].id].transform
    .position;
  await page.keyboard.press("Shift+ArrowUp");
  expect(
    (await state(page)).pieces[handBones[2].id].transform.position[1],
  ).toBeCloseTo(previous[1] + 0.05);
});
