#!/usr/bin/env node
/** Production-only, real-input benchmark. No React stores or test scene probes are accessed.
 * Usage: node scripts/performance/benchmark-production.mjs --url http://127.0.0.1:4180 --phase before --runs 3
 */
import { chromium } from '@playwright/test';
import { OrthographicCamera, Vector3 } from 'three';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { cpus, totalmem, platform, release, arch } from 'node:os';
import { execFileSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import path from 'node:path';
import { RENDERING_CONFIG } from '../../src/data/config/rendering.ts';

const args = Object.fromEntries(process.argv.slice(2).reduce((out, item, index, all) => {
  if (item.startsWith('--')) out.push([item.slice(2), all[index + 1]]);
  return out;
}, []));
const origin = args.url || 'http://127.0.0.1:4180';
const phase = args.phase || 'before';
const runs = Number(args.runs || 3);
const duration = Number(args.duration || 3000);
const output = path.resolve(args.output || `docs/web-performance/evidence/${phase}`);
const tickHz = Number(execFileSync('getconf', ['CLK_TCK'], { encoding: 'utf8' }).trim());
const hand = JSON.parse(await readFile(new URL('../../src/data/hand.json', import.meta.url), 'utf8'));
const browserArgs = ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1920,1080'];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const safeRead = async (file) => { try { return (await readFile(file, 'utf8')).trim(); } catch { return null; } };
await mkdir(output, { recursive: true });

async function processTree(rootPid) {
  const processes = [];
  for (const name of await readdir('/proc')) {
    if (!/^\d+$/.test(name)) continue;
    try {
      const text = await readFile(`/proc/${name}/stat`, 'utf8');
      const fields = text.slice(text.lastIndexOf(')') + 2).split(' ');
      processes.push({ pid: Number(name), ppid: Number(fields[1]), ticks: Number(fields[11]) + Number(fields[12]), rss: Number(fields[21]) * 4096, start: fields[19] });
    } catch { /* Processes can exit during enumeration. */ }
  }
  const included = new Set([rootPid]);
  for (let pass = 0; pass < 8; pass++) for (const process of processes) if (included.has(process.ppid)) included.add(process.pid);
  return processes.filter((process) => included.has(process.pid));
}

function auditInit() {
  const audit = window.__webAudit = { draws: 0, drawFrames: 0, clears: 0, rafSerial: 0, drawnSerial: -1, rafTimes: [], longTasks: [], visibility: [] };
  const raf = (time) => { audit.rafSerial++; audit.rafTimes.push(time); if (audit.rafTimes.length > 20000) audit.rafTimes.shift(); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
  for (const Type of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
    if (!Type) continue;
    for (const name of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced', 'clear']) {
      const proto = Type.prototype;
      if (!Object.hasOwn(proto, name) || typeof proto[name] !== 'function') continue;
      const original = proto[name];
      proto[name] = function (...parameters) {
        if (name === 'clear') audit.clears++;
        else {
          audit.draws++;
          if (audit.drawnSerial !== audit.rafSerial) { audit.drawnSerial = audit.rafSerial; audit.drawFrames++; }
        }
        return original.apply(this, parameters);
      };
    }
  }
  try { new PerformanceObserver((list) => audit.longTasks.push(...list.getEntries().map(({ startTime, duration, name }) => ({ startTime, duration, name })))).observe({ type: 'longtask', buffered: true }); } catch {}
  document.addEventListener('visibilitychange', () => audit.visibility.push({ time: performance.now(), state: document.visibilityState }));
}

async function auditSnapshot(page) {
  return page.evaluate(() => {
    const a = window.__webAudit;
    return { time: performance.now(), draws: a.draws, drawFrames: a.drawFrames, clears: a.clears, rafTimes: a.rafTimes.slice(), longTasks: a.longTasks.slice(), visibility: document.visibilityState, focused: document.hasFocus(), screen: document.querySelector('.app')?.dataset.screen, introCaption: document.querySelector('.intro-subtitle')?.textContent, domElements: document.getElementsByTagName('*').length };
  });
}

async function run(index) {
  const server = await chromium.launchServer({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: false, args: browserArgs, env: { ...process.env, DISPLAY: process.env.DISPLAY || ':99', XDG_CACHE_HOME: '/workspace/.cache/chromium-audit' } });
  const browser = await chromium.connect(server.wsEndpoint());
  const browserPid = server.process().pid;
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
  await context.addInitScript(auditInit);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const client = await context.newCDPSession(page);
  await client.send('Performance.enable');
  await client.send('Network.enable');
  let networkBytes = 0;
  client.on('Network.loadingFinished', ({ encodedDataLength }) => networkBytes += encodedDataLength);
  const metrics = async () => Object.fromEntries((await client.send('Performance.getMetrics')).metrics.map(({ name, value }) => [name, value]));
  const results = { run: index, phase, origin, startedUtc: new Date().toISOString(), scenarios: {}, errors };
  async function sample(name, length = duration, action) {
    const begin = await auditSnapshot(page);
    const before = await metrics();
    let previous = new Map();
    let cpuTicks = 0, peakRss = 0, processCount = 0;
    let polling = true;
    const first = await processTree(browserPid);
    previous = new Map(first.map((process) => [`${process.pid}:${process.start}`, process.ticks]));
    const procStart = performance.now();
    const poll = async () => {
      while (polling) {
        const tree = await processTree(browserPid);
        for (const process of tree) {
          const key = `${process.pid}:${process.start}`;
          if (previous.has(key)) cpuTicks += Math.max(0, process.ticks - previous.get(key));
          previous.set(key, process.ticks);
        }
        peakRss = Math.max(peakRss, tree.reduce((sum, process) => sum + process.rss, 0));
        processCount = Math.max(processCount, tree.length);
        await sleep(250);
      }
    };
    const sampler = poll();
    try { await Promise.all([sleep(length), action ? action(length) : Promise.resolve()]); }
    finally { polling = false; await sampler; }
    const procWall = performance.now() - procStart;
    const end = await auditSnapshot(page);
    const after = await metrics();
    const delta = (key) => (after[key] || 0) - (before[key] || 0);
    const times = end.rafTimes.filter((time) => time >= begin.time && time <= end.time);
    const intervals = times.slice(1).map((time, n) => time - times[n]);
    const sorted = [...intervals].sort((a, b) => a - b);
    const tasks = end.longTasks.filter((task) => task.startTime >= begin.time && task.startTime < end.time);
    const wall = end.time - begin.time;
    const item = {
      wallMs: wall, procSampleWallMs: procWall,
      browserProcessCpuMs: cpuTicks * 1000 / tickHz,
      browserProcessCpuPercentOneCore: cpuTicks * 1000 / tickHz / procWall * 100,
      browserProcessPeakRssBytes: peakRss, browserProcessCount: processCount,
      pageTaskMs: delta('TaskDuration') * 1000, pageScriptMs: delta('ScriptDuration') * 1000,
      pageLayoutMs: delta('LayoutDuration') * 1000, pageStyleMs: delta('RecalcStyleDuration') * 1000,
      pageJsHeapBytes: after.JSHeapUsedSize,
      webglDrawCalls: end.draws - begin.draws, webglDrawCallsPerSecond: (end.draws - begin.draws) * 1000 / wall,
      webglDrawBearingRafFrames: end.drawFrames - begin.drawFrames,
      webglDrawBearingFramesPerSecond: (end.drawFrames - begin.drawFrames) * 1000 / wall,
      rafCallbacks: times.length, rafCadenceFps: intervals.length ? intervals.length * 1000 / (times.at(-1) - times[0]) : null,
      rafFrameP95Ms: sorted.length ? sorted[Math.floor((sorted.length - 1) * .95)] : null,
      rafFrameMaxMs: sorted.at(-1) ?? null,
      longTasks: tasks, longTaskCount: tasks.length, longTaskTotalMs: tasks.reduce((sum, task) => sum + task.duration, 0),
      visibilityStart: begin.visibility, visibilityEnd: end.visibility, focusStart: begin.focused, focusEnd: end.focused,
      screenStart: begin.screen, screenEnd: end.screen,
      introCaptionStart: begin.introCaption, introCaptionEnd: end.introCaption,
      domElements: end.domElements,
    };
    results.scenarios[name] = item;
    console.log(JSON.stringify({ run: index, scenario: name, cpuOneCore: item.browserProcessCpuPercentOneCore, taskMs: item.pageTaskMs, drawCalls: item.webglDrawCalls, visibility: item.visibilityEnd }));
    await writeFile(path.join(output, `production-run-${index}.json`), JSON.stringify(results, null, 2));
    return item;
  }
  try {
    const navigationStarted = performance.now();
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
    await page.locator('.app[data-screen="title"]').waitFor({ timeout: 90000 });
    await page.locator('.model-loading').waitFor({ state: 'hidden', timeout: 90000 });
    await sleep(1500);
    results.navigationToTitleReadyMs = performance.now() - navigationStarted;
    results.browser = await browser.version();
    results.renderer = await page.evaluate(() => {
      const gl = document.querySelector('canvas')?.getContext('webgl2');
      const info = gl?.getExtension('WEBGL_debug_renderer_info');
      return gl ? gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) : null;
    });
    await page.screenshot({ path: path.join(output, `title-${index}.png`) });
    await sample('title_idle');
    if (phase === 'after') {
      await page.getByRole('button', { name: 'Start', exact: true }).click();
      await page.locator('.app[data-screen="menu"]').waitFor();
    }
    const playStart = performance.now();
    await page.getByRole('button', { name: phase === 'after' ? 'Start HAND' : /^Start/ }).first().click();
    await page.locator('canvas').waitFor({timeout:90000});
    await page.locator('.model-loading').waitFor({state:'hidden',timeout:90000});
    results.startToModelsReadyMs = performance.now() - playStart;
    await page.locator('.app[data-screen="game"]').waitFor({ timeout: 90000 });
    await page.locator('.model-loading').waitFor({ state: 'hidden', timeout: 90000 });
    results.startToPlayableNaturalIntroMs = performance.now() - playStart;
    results.renderer = await page.evaluate(() => {
      const gl=document.querySelector('canvas')?.getContext('webgl2');
      const extension=gl?.getExtension('WEBGL_debug_renderer_info');
      return gl ? gl.getParameter(extension?extension.UNMASKED_RENDERER_WEBGL:gl.RENDERER):null;
    });
    await sleep(1500);
    await page.screenshot({ path: path.join(output, `game-${index}.png`) });
    await sample('game_stationary_guide_on');

    const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('bone-puzzle-3d:hand:v1') || 'null'));
    async function reset() {
      const button = page.getByRole('button', { name: /Restart/ }).first();
      if (await button.count()) await button.click();
      else throw new Error('Restart control was not found; adapt benchmark for changed UI');
      await page.locator('.app[data-screen="stageIntro"]').waitFor({ timeout: 15000 });
      await page.getByRole('button', { name: /Skip intro/ }).click({ force: true });
      await page.locator('.app[data-screen="game"]').waitFor({ timeout: 15000 });
      if(phase==='after'){
        const guide=page.getByRole('button',{name:'조립 가이드',exact:true});
        if(await guide.getAttribute('aria-pressed')!=='true')await guide.click();
        await page.getByRole('button',{name:'이동 모드',exact:true}).click();
      }
      await sleep(1600);
    }
    // Measure the same warm, active falling interval in both implementations.
    // Shader compilation can skip the baseline's cold wall-clock intro phases.
    await page.getByRole('button', { name: /Restart/ }).first().click();
    const introTimeline=[];
    let fallingObserved=false;
    for(let poll=0;poll<150;poll++){
      const current=await auditSnapshot(page);
      introTimeline.push({screen:current.screen,caption:current.introCaption,time:current.time});
      if(current.introCaption?.includes('Every structure begins')){fallingObserved=true;break;}
      if(current.screen==='game')break;
      await sleep(75);
    }
    results.warmIntroTimeline=introTimeline;
    if(fallingObserved){
      const falling=await sample('intro_falling',700);
      if(!falling.introCaptionEnd?.includes('Every structure begins'))
        results.scenarios.intro_falling={unsupported:true,reason:'Frame stall crossed the falling phase boundary; mixed-phase CPU is not attributed to falling',observed:falling};
    }else results.scenarios.intro_falling={unsupported:true,reason:'Warm intro did not expose an observable falling interval; timeline retained'};
    await page.locator('.app[data-screen="game"]').waitFor({timeout:90000});
    async function pointForBone(index = 6) {
      const box = await page.locator('canvas').boundingBox();
      const camera = new OrthographicCamera(-box.width / 2, box.width / 2, box.height / 2, -box.height / 2, .1, 100);
      if(phase==='after'){
        const view=RENDERING_CONFIG.views.gameplay;
        const target=new Vector3(...view.target);
        camera.position.copy(target).add(new Vector3(...view.offset));camera.zoom=Math.min(box.height/view.height,box.width/view.width);camera.lookAt(target);
      }else{
        camera.position.set(0,9,24);camera.zoom=Math.min(box.height/13,box.width/13.2);camera.lookAt(new Vector3(0,.1,0));
      }
      camera.updateProjectionMatrix();camera.updateMatrixWorld();
      const position = new Vector3(...hand.bones[index].initialTransform.position).project(camera);
      return { x: box.x + (position.x + 1) * box.width / 2, y: box.y + (1 - position.y) * box.height / 2 };
    }
    await reset();
    const bonePoint = await pointForBone();
    const beforeDrag = await stored();
    await page.mouse.move(bonePoint.x, bonePoint.y);
    await sleep(250);
    await page.mouse.down();
    await sample('pointer_drag', duration, async (length) => {
      const start = performance.now(); let i = 0;
      while (performance.now() - start < length - 100) {
        const angle = i++ * .12;
        await page.mouse.move(bonePoint.x + 50 + Math.sin(angle) * 35, bonePoint.y - 20 + Math.cos(angle) * 30);
        await sleep(25);
      }
      await page.mouse.move(bonePoint.x + 60, bonePoint.y - 35);
    });
    await page.mouse.up();
    await sleep(200);
    const afterDrag = await stored();
    results.pointerDragChangedBoneIds = hand.bones.filter((bone) => JSON.stringify(beforeDrag?.state?.pieces?.[bone.id]?.transform) !== JSON.stringify(afterDrag?.state?.pieces?.[bone.id]?.transform)).map((bone) => bone.id);
    if (!results.pointerDragChangedBoneIds.length) throw new Error(`Real pointer drag did not move any persisted bone at ${JSON.stringify(bonePoint)}`);
    await reset();
    const canvas = await page.locator('canvas').boundingBox();
    const empty = { x: canvas.x + canvas.width * .83, y: canvas.y + canvas.height * .24 };
    await page.mouse.move(empty.x, empty.y); await page.mouse.down();
    await sample('camera_orbit', duration, async (length) => {
      const start = performance.now(); let i = 0;
      while (performance.now() - start < length - 100) { await page.mouse.move(empty.x + Math.sin(i * .08) * 75, empty.y + Math.cos(i++ * .08) * 50); await sleep(25); }
    });
    await page.mouse.up();
    await reset();
    const guideButton = page.getByRole('button', { name: '조립 가이드', exact:true });
    if (await guideButton.count()) {
      if (/ON/i.test(await guideButton.first().innerText())) await guideButton.first().click();
      await sleep(500);
      await sample('game_stationary_guide_off');
    } else results.scenarios.game_stationary_guide_off = { unsupported: true, reason: 'Baseline has opacity control but no guide visibility toggle' };
    await reset();
    await page.getByRole('button',{name:'조각 07 선택',exact:true}).click();
    await sample('keyboard_rotation',duration,async(length)=>{
      const started=performance.now();
      for(let i=0;i<13;i++){
        await sleep(Math.max(0,started+(i+1)*length/13-performance.now()));
        await page.keyboard.press(i%2?'q':'e');
      }
    });
    if(phase==='after'){
      await reset();
      await page.getByRole('button',{name:'회전 모드',exact:true}).click();
      const p=await pointForBone();const before=await stored();
      await page.mouse.move(p.x,p.y);await page.mouse.down();
      await sample('pointer_rotation',duration,async(length)=>{
        const started=performance.now();
        for(let i=0;i<30;i++){
          await sleep(Math.max(0,started+(i+1)*length/30-performance.now()));
          await page.mouse.move(p.x+(i+1)*3,p.y-Math.sin(i*.15)*30);
        }
      });
      await page.mouse.up();await sleep(150);const after=await stored();
      results.pointerRotationChangedBoneIds=hand.bones.filter(b=>JSON.stringify(before.state.pieces[b.id].transform.rotation)!==JSON.stringify(after.state.pieces[b.id].transform.rotation)).map(b=>b.id);
      if(!results.pointerRotationChangedBoneIds.length)throw new Error('Real pointer rotation did not change a saved quaternion');
      for(const id of results.pointerRotationChangedBoneIds)if(JSON.stringify(before.state.pieces[id].transform.position)!==JSON.stringify(after.state.pieces[id].transform.position))throw new Error('Pointer rotation translated its bone');
    }else results.scenarios.pointer_rotation={unsupported:true,reason:'Original version has no direct pointer rotation; no before CPU value is invented'};
    await reset();
    await client.send('Emulation.setFocusEmulationEnabled',{enabled:false});
    const background = await context.newPage();
    await background.goto('about:blank'); await background.bringToFront(); await sleep(1000);
    if (await page.evaluate(() => !document.hasFocus())) await sample('game_background_idle');
    else results.scenarios.game_background_idle = { unsupported: true, reason: 'Browser did not expose real focus loss; lifecycle freezing is not substituted' };
    await background.close(); await page.bringToFront();
    results.network = await page.evaluate(() => ({ navigation: performance.getEntriesByType('navigation').map((entry) => entry.toJSON()), resources: performance.getEntriesByType('resource').map((entry) => entry.toJSON()) }));
    results.network.cdpEncodedBytes = networkBytes;
    results.finishedUtc = new Date().toISOString();
    await writeFile(path.join(output, `production-run-${index}.json`), JSON.stringify(results, null, 2));
    return results;
  } catch (error) {
    results.failure = String(error);
    results.failureDom = await page.locator('body').innerText().catch(() => 'unavailable');
    await page.screenshot({ path: path.join(output, `failure-${index}.png`) }).catch(() => {});
    await writeFile(path.join(output, `production-run-${index}.json`), JSON.stringify(results, null, 2));
    throw error;
  } finally { await browser.close(); await server.close(); }
}

const configuration = {
  measuredUtc: new Date().toISOString(), origin, phase, runs, sampleDurationMs: duration,
  os: `${platform()} ${release()} ${arch()}`, cpuModel: cpus()[0]?.model, hostLogicalCpuCount: cpus().length, hostTotalMemoryBytes: totalmem(),
  cgroupCpuMax: await safeRead('/sys/fs/cgroup/cpu.max'), cgroupMemoryMax: await safeRead('/sys/fs/cgroup/memory.max'),
  clockTicksPerSecond: tickHz, viewport: [1920, 1080], dpr: 1, browserExecutable: process.env.CHROMIUM_PATH || '/usr/bin/chromium', browserArgs,
  headless: false, display: process.env.DISPLAY || ':99',
  notes: [
    'OS CPU is sampled over the complete Chromium process tree, including renderer/GPU/utility children. 100 percent means one logical core; shared RSS is summed and can double-count shared pages.',
    'CDP TaskDuration is page main-thread task time, reported separately from OS browser CPU.',
    'WebGL draw calls are counted by wrappers installed before application startup. Draw-bearing RAF frames approximate render cadence; RAF callbacks alone are not actual 3D rendered FPS.',
    'The audit RAF loop and draw wrappers add equal instrumentation overhead to before and after. Long tasks use PerformanceObserver.',
    'Each run uses a new browser/context. UI Restart and Skip Intro restore initial geometry/camera before manipulation scenarios. No production testhooks or internal stores are used.',
    'SwiftShader is a software graphics backend. These measurements do not establish native GPU performance or a guaranteed improvement percentage.',
    'Background scenario is an actual foreground-tab switch with CDP focus emulation disabled. document.hidden may remain false in this environment; focus and visibility are recorded, never forged.',
  ],
};
await writeFile(path.join(output, 'production-config.json'), JSON.stringify(configuration, null, 2));
const results = [];
for (let index = 1; index <= runs; index++) results.push(await run(index));
const numericKeys = ['browserProcessCpuMs', 'browserProcessCpuPercentOneCore', 'browserProcessPeakRssBytes', 'pageTaskMs', 'pageScriptMs', 'webglDrawCallsPerSecond', 'webglDrawBearingFramesPerSecond', 'rafCadenceFps', 'rafFrameP95Ms', 'longTaskCount', 'longTaskTotalMs', 'pageJsHeapBytes'];
const medians = {};
for (const name of Object.keys(results[0].scenarios)) {
  medians[name] = {};
  for (const key of numericKeys) {
    const values = results.map((result) => result.scenarios[name]?.[key]).filter((value) => typeof value === 'number' && Number.isFinite(value)).sort((a, b) => a - b);
    if (values.length) medians[name][key] = values[Math.floor(values.length / 2)];
  }
}
await writeFile(path.join(output, 'production-summary.json'), JSON.stringify({ phase, origin, runs, medians, firstPlayableMs: results.map((result) => result.startToPlayableNaturalIntroMs), errors: results.flatMap((result) => result.errors) }, null, 2));
console.log('BENCHMARK_COMPLETE ' + path.join(output, 'production-summary.json'));
