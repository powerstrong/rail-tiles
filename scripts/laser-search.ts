/**
 * Laser stage search: `npx vite-node scripts/laser-search.ts <specs.ts> [id ...]`
 *
 * Draws random boards for each LaserSpec (src/machine/generate.ts), tries every mirror
 * setting, and keeps boards with exactly one fewest-taps answer, a tap count and difficulty
 * in range, most mirrors actually in the light, and the features the spec says must matter.
 */
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { auditLaser } from '../src/machine/audit';
import { light } from '../src/machine/beam';
import { type LaserSpec, constructLaserBoard, drawLaserBoard, rng } from '../src/machine/generate';
import { type MachineStage, type MachineStageDef, parseMachineStage } from '../src/machine/model';
import { popcount, solveLaser } from '../src/machine/solver';

const [file, ...ids] = process.argv.slice(2);
const specs: LaserSpec[] = (await import(pathToFileURL(resolve(file)).href)).default;
const SECONDS = Number(process.env.SECONDS ?? 60);

/** Cells the beams of this lighting touch (centres reached). */
function touched(stage: MachineStage, l: ReturnType<typeof light>): Set<number> {
  const s = new Set<number>();
  for (const seg of l.segments) {
    for (const [x, y] of [[seg.x1, seg.y1], [seg.x2, seg.y2]]) {
      if (Number.isInteger(x - 0.5) && Number.isInteger(y - 0.5)) s.add(Math.floor(y) * stage.width + Math.floor(x));
    }
  }
  return s;
}

for (const spec of specs) {
  if (ids.length && !ids.includes(spec.id)) continue;
  const rand = rng((spec.seed ?? 1) * 7919 + spec.id.length * 131);
  const found: { def: MachineStageDef; score: number; rank: number; par: number; turnable: number; near: number }[] = [];
  const seen = new Set<string>();
  const t0 = Date.now();
  while (Date.now() - t0 < SECONDS * 1000) {
    const def = process.env.RANDOM ? drawLaserBoard(spec, rand) : constructLaserBoard(spec, rand, light, parseMachineStage);
    if (!def || seen.has(def.map.join('|'))) continue;
    seen.add(def.map.join('|'));
    let stage: MachineStage;
    try {
      stage = parseMachineStage(def, 0);
    } catch {
      continue;
    }
    const sol = solveLaser(stage);
    if (sol.par === null || sol.par < spec.par[0] || sol.par > spec.par[1] || sol.optimal !== 1) continue;
    if (sol.turnable - sol.par < (spec.decoys ?? 1)) continue;
    const win = sol.wins.find((w) => popcount(w) === sol.par)!;
    const lit = light(stage, stage.start ^ win);
    const hit = touched(stage, lit);
    const turnable = stage.devices.filter((_, i) => (stage.turnable >> i) & 1);
    if (turnable.filter((c) => hit.has(c)).length < Math.ceil(turnable.length * 0.6)) continue;
    if (spec.must?.includes('half') && !stage.devices.some((c) => hit.has(c) && stage.tiles[c].t === 'mirror' && (stage.tiles[c] as { half: boolean }).half)) continue;
    if (spec.must?.includes('door') && (!lit.doorsOpen || light(stage, stage.start).doorsOpen || !stage.tiles.some((t, i) => t.t === 'door' && hit.has(i)))) continue;
    if (spec.must?.includes('filter') && !lit.segments.some((s) => stage.tiles[Math.floor(s.y1) * stage.width + Math.floor(s.x1)]?.t === 'filter')) continue;
    const a = auditLaser(stage)!;
    if (a.score < spec.difficulty[0] || a.score > spec.difficulty[1]) continue;
    const walls = def.map.join(' ').split(' ').filter((g) => g === '#').length;
    const rank = -Math.abs(a.score - (spec.difficulty[0] + spec.difficulty[1]) / 2) * 0.3 - walls * 0.15 + Math.log2(1 + a.nearMisses) * 0.5;
    const solution: number[] = [];
    for (let i = 0; i < stage.devices.length; i++) if ((win >> i) & 1) solution.push(i);
    found.push({ def: { ...def, par: sol.par, solution }, score: a.score, rank, par: sol.par, turnable: a.turnable, near: a.nearMisses });
  }
  found.sort((a, b) => b.rank - a.rank);
  console.log(`\n== ${spec.id}: ${found.length} good of ${seen.size} boards in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  for (const f of found.slice(0, spec.keep ?? 2)) {
    console.log(`-- difficulty ${f.score.toFixed(1)}  taps ${f.par}  mirrors ${f.turnable}  near misses ${f.near}`);
    console.log(f.def.map.map((r) => '    ' + r).join('\n'));
    console.log(JSON.stringify({ map: f.def.map, lasers: f.def.lasers, par: f.par, solution: f.def.solution, battery: f.def.battery, boss: f.def.boss, difficulty: Number(f.score.toFixed(1)) }));
  }
}
