import { test, expect, type Page } from "@playwright/test";
import { begin, camera, continueSession, grabPoint, handBones, load, quaternionAngle, restart, setMode, snapshot, state, stats } from "./helpers";

async function gesture(page: Page, id: string, dx: number, dy: number, steps: number) {
  const p = await grabPoint(page, id);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x + dx, p.y + dy, { steps });
  await page.mouse.up();
  await page.waitForTimeout(180);
}

async function orbitEmpty(page: Page) {
  const point = await page.evaluate(() => {
    const rect = document.querySelector("canvas")!.getBoundingClientRect();
    for (const ry of [0.15, 0.25, 0.35, 0.5])
      for (const rx of [0.2, 0.4, 0.6, 0.75]) {
        const x = rect.x + rect.width * rx;
        const y = rect.y + rect.height * ry;
        if (document.elementFromPoint(x, y)?.tagName === "CANVAS" && !window.__boneProbe.hit(x, y)) return { x, y };
      }
    return null;
  });
  expect(point).not.toBeNull();
  const before = await camera(page);
  await page.mouse.move(point!.x, point!.y);
  await page.mouse.down();
  await page.mouse.move(point!.x + 70, point!.y + 20, { steps: 8 });
  await page.mouse.up();
  await expect.poll(async () => (await camera(page)).quaternion).not.toEqual(before.quaternion);
  await page.waitForTimeout(300);
}

test("rolling arcball covers 90, 180 and 360 degrees without translating a bone", async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await load(page);
  await begin(page);
  const id = handBones[0].id;
  for (const degrees of [90, 180, 360]) {
    if (degrees !== 90) await restart(page);
    await setMode(page, "rotate");
    const before = (await state(page)).pieces[id].transform;
    const cameraBefore = await camera(page);
    await gesture(page, id, (degrees * Math.PI / 180) * 140, 0, 36);
    const after = (await state(page)).pieces[id].transform;
    expect(after.position).toEqual(before.position);
    expect(Math.hypot(...after.rotation)).toBeCloseTo(1, 9);
    const angle = quaternionAngle(before.rotation, after.rotation);
    if (degrees === 360) expect(angle).toBeLessThan(0.015);
    else expect(angle).toBeCloseTo(degrees * Math.PI / 180, 2);
    expect(await camera(page)).toEqual(cameraBefore);
    expect(quaternionAngle((await snapshot(page))[id].rotation, after.rotation)).toBeLessThan(0.00001);
  }
  await page.screenshot({ path: "test-results/arcball-360.png" });
});

test("diagonal arcball is cadence independent and canonical after keyboard edits and reload", async ({ page }) => {
  test.setTimeout(150_000);
  await load(page);
  await begin(page);
  const id = handBones[1].id;
  await setMode(page, "rotate");
  const start = (await state(page)).pieces[id].transform;
  await gesture(page, id, 90, -65, 1);
  const fast = (await state(page)).pieces[id].transform;
  expect(fast.position).toEqual(start.position);
  expect(quaternionAngle(fast.rotation, start.rotation)).toBeGreaterThan(0.3);
  await restart(page);
  await setMode(page, "rotate");
  await gesture(page, id, 90, -65, 30);
  const slow = (await state(page)).pieces[id].transform;
  expect(quaternionAngle(fast.rotation, slow.rotation)).toBeLessThan(0.002);
  await orbitEmpty(page);
  const cameraBefore = await camera(page);
  const positionBefore = slow.position;
  await gesture(page, id, -65, 40, 10);
  let rotated = (await state(page)).pieces[id].transform;
  expect(rotated.position).toEqual(positionBefore);
  expect(Math.hypot(...rotated.rotation)).toBeCloseTo(1, 9);
  expect(await camera(page)).toEqual(cameraBefore);
  await page.getByText("조각 회전 · 키보드 조작", { exact: true }).click();
  await page.getByRole("button", { name: "x축 시계 회전", exact: true }).click();
  await page.getByRole("button", { name: "y축 반시계 회전", exact: true }).click();
  await page.getByRole("button", { name: "z축 시계 회전", exact: true }).click();
  rotated = (await state(page)).pieces[id].transform;
  expect(Math.hypot(...rotated.rotation)).toBeCloseTo(1, 9);
  await continueSession(page);
  const restored = (await state(page)).pieces[id].transform;
  expect(restored).toEqual(rotated);
  expect(quaternionAngle((await snapshot(page))[id].rotation, restored.rotation)).toBeLessThan(0.00001);
  expect((await state(page)).interactionMode).toBe("rotate");
  await page.screenshot({ path: "test-results/arcball-restored.png" });
});

test("Shift moves temporarily, and cancellation or blur rolls back without locking the camera", async ({ page }) => {
  await load(page);
  await begin(page);
  await setMode(page, "rotate");
  const id = handBones[0].id;
  const initial = (await state(page)).pieces[id].transform;
  await page.keyboard.down("Shift");
  await gesture(page, id, 32, -22, 8);
  await page.keyboard.up("Shift");
  const moved = (await state(page)).pieces[id].transform;
  expect(moved.position).not.toEqual(initial.position);
  expect(quaternionAngle(moved.rotation, initial.rotation)).toBeLessThan(1e-7);
  expect((await state(page)).interactionMode).toBe("rotate");

  for (const cancel of ["pointercancel", "blur", "lostpointercapture"] as const) {
    const before = (await state(page)).pieces[id].transform;
    const p = await grabPoint(page, id);
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    await page.mouse.move(p.x + 70, p.y + 35, { steps: 8 });
    const live = (await snapshot(page))[id];
    expect(quaternionAngle(live.rotation, before.rotation)).toBeGreaterThan(0.1);
    // Pointer motion is transient. Canonical persistence is committed on release.
    expect((await state(page)).pieces[id].transform).toEqual(before);
    await page.evaluate((type) => {
      if (type === "blur") window.dispatchEvent(new Event("blur"));
      else document.querySelector("canvas")!.dispatchEvent(new PointerEvent(type, { pointerId: 1, bubbles: true }));
    }, cancel);
    await page.mouse.up();
    await page.waitForTimeout(120);
    expect((await state(page)).pieces[id].transform).toEqual(before);
    expect(quaternionAngle((await snapshot(page))[id].rotation, before.rotation)).toBeLessThan(0.00001);
    if (cancel === "blur") {
      await expect(page.locator(".app")).toHaveAttribute("data-screen", "paused");
      await page.evaluate(() => window.dispatchEvent(new Event("focus")));
      await page.getByRole("button", { name: /재개/ }).click();
    }
    expect((await stats(page)).controlsEnabled).toBe(true);
    await orbitEmpty(page);
  }
  await page.getByRole("button", { name: /시점 초기화/ }).click();
  await page.getByRole("button", { name: "조각 01 선택", exact: true }).click();
  await page.getByLabel("ENGLISH ANATOMICAL NAME").focus();
  const beforeTyping = (await state(page)).pieces[id].transform;
  const guideBefore = (await state(page)).guideEnabled;
  await page.keyboard.type("gxyzqe");
  await page.keyboard.press("ArrowLeft");
  expect((await state(page)).pieces[id].transform).toEqual(beforeTyping);
  expect((await state(page)).guideEnabled).toBe(guideBefore);
});
