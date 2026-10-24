import { test, expect } from "@playwright/test";
import { begin, camera, grabPoint, handBones, load, quaternionAngle, snapshot, state } from "./helpers";

test("select each bone and rotate it using the visible selection panel action", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await load(page);
  await begin(page);
  for (const bone of [handBones[0], handBones[5]]) {
    const point = await grabPoint(page, bone.id);
    await page.mouse.click(point.x, point.y);
    const panel = page.getByRole("region", { name: "선택한 뼈 학습" });
    await panel.getByRole("button", { name: "마우스로 회전", exact: true }).click();
    await expect(page.getByRole("button", { name: "회전 모드", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(panel).toContainText("왼쪽 버튼을 누른 채 드래그");
    const before = await snapshot(page);
    const view = await camera(page);
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    await page.mouse.move(point.x + 110, point.y - 70, { steps: 16 });
    await page.mouse.up();
    await expect.poll(async () => quaternionAngle((await state(page)).pieces[bone.id].transform.rotation, before[bone.id].rotation)).toBeGreaterThan(0.5);
    const after = await snapshot(page);
    expect(after[bone.id].position).toEqual(before[bone.id].position);
    expect(await camera(page)).toEqual(view);
    for (const other of handBones.filter((other) => other.id !== bone.id)) {
      expect(after[other.id].position).toEqual(before[other.id].position);
      expect(after[other.id].rotation).toEqual(before[other.id].rotation);
    }
  }
  await page.screenshot({ path: "test-results/selected-bone-mouse-rotation-1920.png" });
});
