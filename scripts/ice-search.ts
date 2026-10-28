/**
 * Penguin stage search: `npx vite-node scripts/ice-search.ts <specs.ts> [id ...]`
 *
 * Each spec describes the stage it wants (board size, penguins, which ice features, the
 * push count and the difficulty range). Random boards are drawn, solved by breadth-first
 * search, audited, and the best fits are printed as ready-to-paste PenguinStageDefs.
 *
 * Spec fields: id, size [w, h], penguins, fish, snow, water, cracks, currents, igloos (pairs),
 * rocks [min, max], par [min, max], difficulty [min, max], must (beat kinds the shortest win
 * has to use: 'igloo' | 'snow' | 'turn' | 'crack' | 'stopper'), tries, seed, keep.
 */
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { DX, DY } from '../src/engine/dir';
import { auditIce } from '../src/penguin/audit';
import { type IceSpec, drawBoard as draw, rng } from '../src/penguin/generate';
import { type PenguinStageDef, parsePenguinStage, pushName } from '../src/penguin/model';
import { initialState, slide } from '../src/penguin/slide';
import { solveIce } from '../src/penguin/solver';

const [file, ...ids] = process.argv.slice(2);
const specs: IceSpec[] = (await import(pathToFileURL(resolve(file)).href)).default;
const SECONDS = Number(process.env.SECONDS ?? 120);

interface Found {
  def: PenguinStageDef;
  score: number;
  par: number;
  optimal: number;
  reachable: number;
  traps: number;
  rank: number;
}

for (const spec of specs) {
  if (ids.length && !ids.includes(spec.id)) continue;
  const rand = rng((spec.seed ?? 1) * 7919 + spec.id.length * 31);
  const found: Found[] = [];
  const seen = new Set<string>();
  const t0 = Date.now();
  let tried = 0;
  const tries = spec.tries ?? 100000;
  while (tried < tries && Date.now() - t0 < SECONDS * 1000) {
    tried++;
    const def = draw(spec, rand);
    if (!def || seen.has(def.map.join('|'))) continue;
    seen.add(def.map.join('|'));
    let stage;
    try {
      stage = parsePenguinStage(def, 0);
    } catch {
      continue;
    }
    const sol = solveIce(stage, 120_000);
    if (sol.truncated || sol.par === null || sol.par < spec.par[0] || sol.par > spec.par[1]) continue;
    if (sol.optimal > (spec.maxOptimal ?? 2)) continue;
    // The shortest win must actually use the features this stage teaches.
    if (spec.must?.length) {
      let s = initialState(stage);
      const kinds = new Set<string>();
      for (const p of sol.first!) {
        const r = slide(stage, s, p);
        for (const b of r.beats) kinds.add(b.kind);
        // A penguin used as a stopper: it stops right next to another penguin.
        const at = r.state.pos[p.penguin];
        if (r.state.pos.some((q, k) => k !== p.penguin && Math.abs((q % stage.width) - (at % stage.width)) + Math.abs(Math.floor(q / stage.width) - Math.floor(at / stage.width)) === 1)) {
          const nx = (at % stage.width) + DX[p.dir];
          const ny = Math.floor(at / stage.width) + DY[p.dir];
          if (r.state.pos.includes(ny * stage.width + nx)) kinds.add('stopper');
        }
        s = r.state;
      }
      if (!spec.must.every((m) => kinds.has(m))) continue;
    }
    const a = auditIce(stage);
    if (!a || a.score < spec.difficulty[0] || a.score > spec.difficulty[1]) continue;
    const mid = (spec.difficulty[0] + spec.difficulty[1]) / 2;
    // Prefer one clear answer, a score near the target, and a board that is not cluttered.
    const clutter = def.map.join(' ').split(' ').filter((g) => g !== '.').length / (spec.size[0] * spec.size[1]);
    const rank = (sol.optimal === 1 ? 4 : 0) - Math.abs(a.score - mid) * 0.3 - clutter * 4 + a.trapSteps * 0.3;
    found.push({ def: { ...def, par: sol.par, solution: sol.first!.map(pushName) }, score: a.score, par: sol.par, optimal: sol.optimal, reachable: a.reachable, traps: a.trapSteps, rank });
  }
  found.sort((x, y) => y.rank - x.rank);
  console.log(`\n== ${spec.id}: ${found.length} good of ${seen.size} boards in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  for (const f of found.slice(0, spec.keep ?? 2)) {
    console.log(`-- difficulty ${f.score.toFixed(1)}  par ${f.par}  optimal ${f.optimal}  states ${f.reachable}  traps ${f.traps}`);
    console.log(f.def.map.map((r) => '    ' + r).join('\n'));
    console.log(JSON.stringify({ map: f.def.map, igloos: f.def.igloos, par: f.par, solution: f.def.solution, difficulty: Number(f.score.toFixed(1)) }));
  }
}
