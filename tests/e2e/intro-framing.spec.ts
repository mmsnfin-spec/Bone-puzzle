import { test, expect } from "@playwright/test";
import { load, menu, snapshot } from "./helpers";

for (const viewport of [{ width: 1920, height: 1080 }, { width: 1920, height: 900 }]) {
  test(`whole intro remains visible through every phase at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await load(page);
    await menu(page);
    await page.getByRole("button", { name: "Start HAND", exact: true }).click();
    await page.waitForFunction(() => Boolean(window.__boneProbe) && Object.keys(window.__boneProbe.snapshot()).length === 27);
    const phases = new Set<string>();
    const clipped: string[] = [];
    while (await page.locator(".app").getAttribute("data-screen") === "stageIntro") {
      const caption = await page.locator(".intro-subtitle").textContent();
      const phase = await page.getByLabel("HAND", { exact: true }).count() ? "typography" : caption || "settling";
      if (!phases.has(phase)) await page.screenshot({ path: `test-results/intro-${viewport.height}-phase-${phases.size}.png` });
      phases.add(phase);
      for (const [id, piece] of Object.entries(await snapshot(page))) {
        const b = piece.bounds;
        if (b.left < 0 || b.right > viewport.width || b.top < 60 || b.bottom > viewport.height - 120)
          clipped.push(`${phase}: ${id} ${JSON.stringify(b)}`);
      }
      await page.waitForTimeout(75);
    }
    expect(phases.size).toBe(4);
    expect(clipped.slice(0, 5), "model bounds must stay above the subtitle and skip controls").toEqual([]);
  });
}
