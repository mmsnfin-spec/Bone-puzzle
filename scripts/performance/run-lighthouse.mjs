#!/usr/bin/env node
/** Install audit tooling outside the app: npm install --prefix /workspace/tooling/web-audit --cache /workspace/.cache/npm lighthouse
 * node scripts/performance/run-lighthouse.mjs --url URL --phase before --label deployed --runs 3
 */
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const argv = process.argv.slice(2);
const options = {};
for (let index = 0; index < argv.length; index++) if (argv[index].startsWith('--')) options[argv[index].slice(2)] = argv[++index];
const origin = options.url || 'http://127.0.0.1:4180';
const phase = options.phase || 'before';
const label = options.label || 'local';
const runs = Number(options.runs || 3);
const output = path.resolve(options.output || `docs/web-performance/evidence/${phase}`);
const cli = process.env.LIGHTHOUSE_CLI || '/workspace/tooling/web-audit/node_modules/lighthouse/cli/index.js';
await mkdir(output, { recursive: true });
const flags = ['--headless', '--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const summaries = [];
for (let run = 1; run <= runs; run++) {
  const base = path.join(output, `lighthouse-${label}-${run}`);
  const parameters = [cli, origin, '--preset=desktop', '--output=json', '--output=html', `--output-path=${base}`, '--save-assets', '--screenEmulation.width=1920', '--screenEmulation.height=1080', '--screenEmulation.deviceScaleFactor=1', '--screenEmulation.mobile=false', `--chrome-flags=${flags.join(' ')}`];
  console.log(`LIGHTHOUSE_START ${label} ${run}/${runs} ${origin}`);
  const transcript = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, parameters, { env: { ...process.env, CHROME_PATH: process.env.CHROMIUM_PATH || '/usr/bin/chromium', XDG_CACHE_HOME: '/workspace/.cache/chromium-audit' }, stdio: ['ignore', 'pipe', 'pipe'] });
    let text = '';
    child.stdout.on('data', (data) => { text += data.toString(); });
    child.stderr.on('data', (data) => { text += data.toString(); });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, text }));
  });
  await writeFile(`${base}.log`, transcript.text);
  if (transcript.code !== 0) {
    summaries.push({ run, url: origin, failed: true, exitCode: transcript.code, log: `${base}.log` });
    await writeFile(path.join(output, `lighthouse-${label}-summary.json`), JSON.stringify({ phase, origin, label, runs: summaries }, null, 2));
    throw new Error(`Lighthouse failed (${transcript.code}); inspect ${base}.log`);
  }
  const report = JSON.parse(await readFile(`${base}.report.json`, 'utf8'));
  const number = (id) => report.audits[id]?.numericValue ?? null;
  const audits = Object.fromEntries(Object.entries(report.audits).filter(([, audit]) => audit.details || audit.score !== 1).map(([id, audit]) => [id, { title: audit.title, score: audit.score, displayValue: audit.displayValue, numericValue: audit.numericValue, details: audit.details }]));
  const item = {
    run, requestedUrl: report.requestedUrl, finalDisplayedUrl: report.finalDisplayedUrl, lighthouseVersion: report.lighthouseVersion, fetchTime: report.fetchTime,
    scores: Object.fromEntries(Object.entries(report.categories).map(([id, category]) => [id, category.score])),
    metrics: { fcpMs: number('first-contentful-paint'), lcpMs: number('largest-contentful-paint'), tbtMs: number('total-blocking-time'), cls: number('cumulative-layout-shift'), speedIndexMs: number('speed-index'), interactiveMs: number('interactive') },
    configSettings: report.configSettings, environment: report.environment, runWarnings: report.runWarnings,
    fullReport: path.basename(`${base}.report.json`), diagnostics: audits,
  };
  summaries.push(item);
  await writeFile(path.join(output, `lighthouse-${label}-summary.json`), JSON.stringify({ phase, origin, label, runs: summaries }, null, 2));
  console.log(JSON.stringify({ label, run, scores: item.scores, metrics: item.metrics }));
}
const median = (list) => { const values = list.filter((x) => typeof x === 'number').sort((a, b) => a - b); return values[Math.floor(values.length / 2)] ?? null; };
const medians = {
  scores: Object.fromEntries(Object.keys(summaries[0].scores).map((key) => [key, median(summaries.map((item) => item.scores[key]))])),
  metrics: Object.fromEntries(Object.keys(summaries[0].metrics).map((key) => [key, median(summaries.map((item) => item.metrics[key]))])),
};
await writeFile(path.join(output, `lighthouse-${label}-summary.json`), JSON.stringify({ phase, origin, label, runs: summaries, medians }, null, 2));
console.log('LIGHTHOUSE_COMPLETE ' + JSON.stringify({ label, medians }));
