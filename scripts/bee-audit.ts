/** Reproduce quality + Node/Chromium (4× CPU slowdown) performance. npm run lab:bee-audit */
import { writeFileSync } from 'node:fs';
import { build } from 'esbuild';
import { chromium } from '@playwright/test';
import { stagesFor } from '../src/lab/stages';
import { beeQuality } from './bee-quality';
import { benchmark } from './bee-benchmark';
const stages = stagesFor('bee');
const quality = stages.map(s => ({ id: s.id, cols: s.cols, rows: s.rows, par: s.par,
  gaps: s.terrain!.filter(v => !v).length, ...beeQuality(s) }));
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
  throttled = await page.evaluate(stages => {
    const bench = (globalThis as unknown as { BeeBenchmark: { benchmark: typeof benchmark } }).BeeBenchmark;
    return bench.benchmark(stages);
  }, stages);
} finally { await browser.close(); }
const result = { method: { trialsPerStage: 20_000, seed: '0xbeef0000 + stage.number', rounds: 20,
  browser: 'Chromium headless, viewport 390×844, CDP CPU slowdown 4×', nodeVersion: process.version }, quality, node, throttled };
writeFileSync('docs/bee-5x5-audit.json', JSON.stringify(result, null, 2) + '\n');
for (const [label, samples] of [['Node', node], ['Chromium 4×', throttled]] as const) console.log(label, {
  maxEntryMs: Math.max(...samples.map(s => s.entryMs.max)), maxMoveMs: Math.max(...samples.map(s => s.moveMs.max)),
  entryUnknown: samples.reduce((n, s) => n + s.entryUnknown, 0), moveUnknown: samples.reduce((n, s) => n + s.moveUnknown, 0),
  maxMemo: Math.max(...samples.map(s => s.maxMemo)), maxVisited: Math.max(...samples.map(s => s.maxVisited)),
});
console.log('Wrote docs/bee-5x5-audit.json');
