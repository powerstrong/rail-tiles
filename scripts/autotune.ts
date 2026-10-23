/**
 * Stage autotune: `npx vite-node scripts/autotune.ts <drafts.ts> [id ...]`
 *
 * The drafts file default-exports StageDef drafts (inventory.cross is kept; straight/curve
 * and solution are ignored). For each map, every winning route is enumerated with plenty
 * of rails, then inventories near one shortest route's own piece counts are scored:
 * we want 1–3 routes at par (★★★) and some sloppier ones (★★/★) so stars mean something.
 * Prints the best few inventories, the shortest solution grid and the pinned test entry.
 */
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { type Placement, type StageDef, parseStage } from '../src/engine/stage';
import { solve } from '../src/engine/solver';
import { TWO_STAR_SLACK } from '../src/engine/stars';
import { draw, solutionGrid } from './draw';

const [file, ...ids] = process.argv.slice(2);
if (!file) throw new Error('usage: autotune <drafts.ts> [id ...]');
const drafts: StageDef[] = (await import(pathToFileURL(resolve(file)).href)).default;

const kinds = (r: Placement[]) => ({
  s: r.filter((p) => p.rail.kind === 'straight').length,
  c: r.filter((p) => p.rail.kind === 'curve').length,
  x: r.filter((p) => p.rail.kind === 'cross').length,
});

for (const def of drafts) {
  if (ids.length && !ids.includes(def.id)) continue;
  const cross = def.inventory.cross ?? 0;
  const open = solve(parseStage({ ...def, inventory: { straight: 30, curve: 30, cross } }, 0), 30000, true);
  console.log(`\n== ${def.id}: open routes ${open.count}${open.truncated ? '+ (TOO OPEN)' : ''}, fewest rails ${open.minRails}`);
  if (!open.routes?.length || open.minRails === null) {
    console.log('   UNSOLVABLE');
    continue;
  }
  const par = open.minRails;
  const routes = open.routes.map((r) => ({ r, ...kinds(r) }));
  const options = new Map<string, { s: number; c: number; three: number; two: number; one: number; sol: Placement[] }>();
  for (const sh of routes.filter((x) => x.r.length === par)) {
    for (let ds = 0; ds <= 4; ds++) {
      for (let dc = 0; dc <= 4; dc++) {
        const s = sh.s + ds;
        const c = sh.c + dc;
        if (options.has(`${s},${c}`)) continue;
        const fits = routes.filter((x) => x.s <= s && x.c <= c && x.x <= cross);
        const three = fits.filter((x) => x.r.length <= par).length;
        const two = fits.filter((x) => x.r.length > par && x.r.length <= par + TWO_STAR_SLACK).length;
        options.set(`${s},${c}`, { s, c, three, two, one: fits.length - three - two, sol: sh.r });
      }
    }
  }
  const good = [...options.values()]
    .filter((o) => o.three >= 1 && o.three <= 3)
    // Sloppier clears must exist; then as few perfect answers as possible; then a few sloppy ones, tight inventory.
    .sort(
      (a, b) =>
        Number(a.two + a.one < 2) - Number(b.two + b.one < 2) ||
        a.three - b.three ||
        Math.min(b.two + b.one, 4) - Math.min(a.two + a.one, 4) ||
        a.s + a.c - (b.s + b.c),
    );
  for (const o of good.slice(0, 6)) {
    console.log(`   inv s${o.s} c${o.c}${cross ? ` x${cross}` : ''}: ★★★ ${o.three}  ★★ ${o.two}  ★ ${o.one}  (total ${o.three + o.two + o.one})`);
  }
  const pick = good[0];
  if (!pick) {
    console.log('   no inventory gives 1–3 optimal routes');
    continue;
  }
  const stage = parseStage({ ...def, inventory: { straight: pick.s, curve: pick.c, cross } }, 0);
  // The listed solution must fit the chosen inventory and be a shortest route.
  const check = solve(stage, 2000, true);
  const sol = check.routes!.find((r) => r.length === par)!;
  console.log(draw(stage, sol));
  console.log(`   inventory: { straight: ${pick.s}, curve: ${pick.c}${cross ? `, cross: ${cross}` : ''} },`);
  console.log(`   solution: ${JSON.stringify(solutionGrid(stage, sol))}`);
  console.log(`   EXPECTED: '${def.id}': [${check.routes!.filter((r) => r.length === par).length}, ${check.count}],`);
}
