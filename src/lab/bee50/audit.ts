/** npx vite-node src/lab/bee50/audit.ts — reproducible quality and actual bounded search timing. */
import { writeFileSync } from 'node:fs';
import { build } from 'esbuild';
import { chromium } from '@playwright/test';
import { stagesFor } from '../stages';
import { beeQuality } from '../../../scripts/bee-quality';
import { benchmark } from '../../../scripts/bee-benchmark';
import { arrowQuality } from './quality';
const stages = stagesFor('bee');
const quality = stages.slice(30).map(s => ({ id: s.id, title: s.title, cols: s.cols, rows: s.rows, par: s.par,
  gaps: s.terrain!.filter(v => !v).length, arrows: Object.keys(s.arrows ?? {}).length, ...beeQuality(s), ...arrowQuality(s) }));
const node = benchmark(stages);
const bundle = await build({ entryPoints: ['scripts/bee-benchmark.ts'], bundle: true, write: false,
  format: 'iife', globalName: 'BeeBenchmark', minify: true, target: 'es2022' });
const browser = await chromium.launch({ headless: true });
let throttled: ReturnType<typeof benchmark>;
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  throttled = await page.evaluate(stages => (globalThis as unknown as { BeeBenchmark: { benchmark: typeof benchmark } }).BeeBenchmark.benchmark(stages), stages);
} finally { await browser.close(); }
const result = { method: { generatorSeed: '0xbee50031', trialsPerStage: 20_000, randomSeed: '0xbeef0000 + stage.number', rounds: 20,
  browser: 'Chromium headless, viewport 390×844, CDP CPU slowdown 4×', nodeVersion: process.version }, quality, node, throttled };
writeFileSync('docs/discussion/new-worlds/bee50-audit.json', JSON.stringify(result, null, 2) + '\n');
for (const [label, samples] of [['Node', node], ['Chromium 4×', throttled]] as const) console.log(label, {
  maxEntryMs: Math.max(...samples.map(s => s.entryMs.max)), maxMoveMs: Math.max(...samples.map(s => s.moveMs.max)),
  entryUnknown: samples.reduce((n, s) => n + s.entryUnknown, 0), moveUnknown: samples.reduce((n, s) => n + s.moveUnknown, 0),
  maxMemo: Math.max(...samples.map(s => s.maxMemo)), maxVisited: Math.max(...samples.map(s => s.maxVisited)),
});
console.table(quality.map(s => ({ n: s.id, par: s.par, decisions: s.decisions, preserveExit: s.preserveExitDecisions, randomWins: s.wins })));
