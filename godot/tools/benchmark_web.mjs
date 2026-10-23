#!/usr/bin/env node
/** Same-host reference only. Run the original production preview separately.
 * Uses the repository's existing Playwright dependency; never changes web files.
 * node godot/tools/benchmark_web.mjs http://127.0.0.1:4175
 */
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { cpus, platform, arch } from 'node:os';
import { fileURLToPath } from 'node:url';

const origin = process.argv[2] ?? 'http://127.0.0.1:4175';
const sampleFrames = 120;
const evidence = new URL('../build/evidence/', import.meta.url);
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.waitForSelector('.app[data-screen="title"]');
  await page.waitForSelector('.model-loading', { state: 'hidden' });
  const client = await page.context().newCDPSession(page);
  await client.send('Performance.enable');

  async function metrics() {
    return Object.fromEntries((await client.send('Performance.getMetrics')).metrics.map(({ name, value }) => [name, value]));
  }

  async function sample(phase) {
    await page.waitForTimeout(1000);
    const before = await metrics();
    const frames = await page.evaluate(async (count) => {
      const times = [];
      await new Promise((resolve) => {
        let previous;
        const frame = (now) => {
          if (previous !== undefined) times.push(now - previous);
          previous = now;
          if (times.length >= count) resolve();
          else requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      });
      return times;
    }, sampleFrames);
    const after = await metrics();
    const sorted = [...frames].sort((a, b) => a - b);
    const duration = frames.reduce((sum, value) => sum + value, 0);
    const delta = (name) => (after[name] ?? 0) - (before[name] ?? 0);
    return {
      phase, frames: sampleFrames,
      average_fps: sampleFrames * 1000 / duration,
      minimum_instantaneous_fps: 1000 / sorted.at(-1),
      mean_frame_ms: duration / sampleFrames,
      p95_frame_ms: sorted[Math.floor((sampleFrames - 1) * 0.95)],
      maximum_frame_ms: sorted.at(-1),
      cdp_main_thread_task_ms: delta('TaskDuration') * 1000,
      cdp_script_ms: delta('ScriptDuration') * 1000,
      cdp_layout_ms: delta('LayoutDuration') * 1000,
      cdp_style_ms: delta('RecalcStyleDuration') * 1000,
      js_heap_used_bytes: after.JSHeapUsedSize,
      js_heap_total_bytes: after.JSHeapTotalSize,
      gpu_frame_time_ms: null,
      physics_time_ms: null,
      notes: 'RAF is browser presentation cadence. CDP CPU durations are page main-thread totals over this sample, not Godot CPU process monitor time. JS heap is not total process/static memory.',
    };
  }

  const renderer = await page.evaluate(() => {
    const gl = document.querySelector('canvas')?.getContext('webgl2');
    if (!gl) return null;
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    return info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  });
  const results = {
    environment: {
      measured_utc: new Date().toISOString(), original_project: 'React production build',
      browser: await browser.version(), os: `${platform()} ${arch()}`, cpu: cpus()[0]?.model,
      viewport: [1920, 1080], renderer, source_origin: origin, sample_frames: sampleFrames,
      comparison_note: 'Same cloud host, but Chromium SwiftShader and Godot llvmpipe are different software graphics stacks. Original title renders assembled anatomy while Godot title is intentionally UI-only. CPU and memory definitions differ. These data do not establish hardware improvement percentages or Windows 60 FPS.',
    },
    title: await sample('title'),
  };
  const loadingStart = performance.now();
  await page.getByRole('button', { name: /^Start/ }).click();
  // The intro changes CSS continuously; use an actual forced pointer click so
  // Playwright does not wait for an animation that naturally ends in 6.7s.
  try {
    await page.getByRole('button', { name: /Skip intro/ }).click({ force: true, timeout: 4000 });
  } catch (error) {
    if (await page.locator('.app').getAttribute('data-screen') !== 'game') throw error;
  }
  await page.waitForSelector('.app[data-screen="game"]');
  results.title_to_game_skip_intro_ms = performance.now() - loadingStart;
  results.game_guide_on = await sample('game_guide_on');
  results.page_errors = errors;
  await mkdir(evidence, { recursive: true });
  const output = new URL('react-baseline.json', evidence);
  await writeFile(output, `${JSON.stringify(results, null, 2)}\n`);
  console.log(`WEB_BASELINE_RESULT: ${JSON.stringify(results)}`);
  console.log(`Saved ${fileURLToPath(output)}`);
  if (errors.length) process.exitCode = 1;
} finally {
  await browser.close();
}
