/**
 * Volcano stage search: `npx vite-node scripts/lava-search.ts <specs.ts> [id ...]`
 *
 * Draws random boards for each LavaSpec (src/volcano/generate.ts), finds the fewest stones,
 * and keeps boards with one clear best answer, a stone count and difficulty in range.
 */
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { auditLava } from '../src/volcano/audit';
import { type LavaSpec, drawVolcano, rng } from '../src/volcano/generate';
import { flow, isHot, placeable, solveLava, solveRace } from '../src/volcano/lava';
import { NO_LIMIT, type VolcanoStage, type VolcanoStageDef, cellName, parseVolcanoStage } from '../src/volcano/model';

const [file, ...ids] = process.argv.slice(2);
const specs: LavaSpec[] = (await import(pathToFileURL(resolve(file)).href)).default;
const SECONDS = Number(process.env.SECONDS ?? 60);

/** Stones needed to wall in all of these cells (craters: only if no egg is left cold). */
function ringCost(stage: VolcanoStage, cells: number[], craters: boolean): number {
  // Stones never go next to a crater (hot ground), so only a ring of houses is a shortcut.
  if (craters) return Infinity;
  const ring = new Set<number>();
  for (const c of cells) {
    const x = c % stage.width;
    const y = Math.floor(c / stage.width);
    for (const [a, b] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (a < 0 || b < 0 || a >= stage.width || b >= stage.height) continue;
      const t = stage.tiles[b * stage.width + a].t;
      if (placeable(stage, b * stage.width + a)) ring.add(b * stage.width + a);
      else if (t === 'egg' || t === 'crater' || (t === 'grass' && isHot(stage, b * stage.width + a))) return Infinity;
    }
  }
  return ring.size;
}

for (const spec of specs) {
  if (ids.length && !ids.includes(spec.id)) continue;
  const rand = rng((spec.seed ?? 1) * 7919 + spec.id.length * 53);
  const found: { def: VolcanoStageDef; score: number; rank: number; open: number; cold: number }[] = [];
  const seen = new Set<string>();
  const t0 = Date.now();
  while (Date.now() - t0 < SECONDS * 1000) {
    const def = drawVolcano(spec, rand);
    if (!def || seen.has(def.map.join('|'))) continue;
    seen.add(def.map.join('|'));
    let stage: VolcanoStage;
    try {
      stage = parseVolcanoStage(def, 0);
    } catch {
      continue;
    }
    let par: number | null;
    let solution: number[];
    if (spec.race) {
      if (stage.tiles.length > 36) continue;
      const r = solveRace(stage, undefined, spec.par[1]);
      if (r.par === null) continue;
      par = r.par;
      solution = r.first!;
      // The race must be harder than simply walling it off at leisure.
      const calm = solveLava(stage, spec.par[1]);
      if (calm.par === null || calm.par >= r.par) continue;
    } else {
      const s = solveLava(stage, spec.par[1]);
      if (s.par === null || s.optimal > (spec.maxOptimal ?? 1)) continue;
      par = s.par;
      solution = s.solutions[0];
      if (spec.mustLimit) {
        const open = { ...stage, tiles: stage.tiles.map((t) => (t.t === 'crater' ? { ...t, volume: NO_LIMIT } : t)) };
        if (flow(open, new Set(solution)).won) continue;
      }
    }
    if (par < spec.par[0] || par > spec.par[1]) continue;
    // Walling in every crater, or every house, must not be an easy way to ★★★.
    if (!spec.race && Math.min(ringCost(stage, stage.craters, true), ringCost(stage, stage.houses, false)) < par + (spec.ring ?? 1)) continue;
    const full = { ...def, par, solution: solution.map((c) => cellName(stage, c)) };
    const a = auditLava(parseVolcanoStage(full, 0));
    if (!a || a.score < spec.difficulty[0] || a.score > spec.difficulty[1]) continue;
    const mid = (spec.difficulty[0] + spec.difficulty[1]) / 2;
    const clutter = def.map.join(' ').split(' ').filter((g) => g === 'R' || g === '~').length / (spec.size[0] * spec.size[1]);
    const rank = -Math.abs(a.score - mid) * 0.3 - clutter * 6 + Math.min(a.coldSets, 6) * 0.2;
    found.push({ def: full, score: a.score, rank, open: a.open, cold: a.coldSets });
  }
  found.sort((x, y) => y.rank - x.rank);
  console.log(`\n== ${spec.id}: ${found.length} good of ${seen.size} boards in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  for (const f of found.slice(0, spec.keep ?? 2)) {
    console.log(`-- difficulty ${f.score.toFixed(1)}  par ${f.def.par}  open ${f.open}  cold ${f.cold}`);
    console.log(f.def.map.map((r) => '    ' + r).join('\n'));
    console.log(JSON.stringify({ map: f.def.map, par: f.def.par, solution: f.def.solution, difficulty: Number(f.score.toFixed(1)) }));
  }
}
