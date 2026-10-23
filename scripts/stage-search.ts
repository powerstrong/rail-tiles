/**
 * Stage search: `npx vite-node scripts/stage-search.ts <concepts.ts> [id ...]`
 *
 * A concept is a StageDef whose map may hold `?` cells: each is randomly left empty or
 * filled with scenery, many times over. Every candidate is solved and scored like
 * autotune (1–3 ★★★ routes, sloppier ★★/★ clears exist, par in the concept's range,
 * a tidy shortest route), and the best few are printed as ready-to-paste StageDefs.
 *
 * Extra concept fields: `par: [min, max]`, `density` (chance a `?` becomes scenery),
 * `tries`, `seed`, `scenery` (glyphs to draw from).
 */
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { type Placement, type StageDef, parseStage } from '../src/engine/stage';
import { solve } from '../src/engine/solver';
import { TWO_STAR_SLACK } from '../src/engine/stars';
import { draw, solutionGrid } from './draw';

export interface Concept extends StageDef {
  par?: [number, number];
  density?: number;
  tries?: number;
  seed?: number;
  scenery?: string;
  keep?: number;
  /** Reject maps whose shortest routes do not use this piece (e.g. a crossing stage that must need its crossing). */
  mustUse?: 'cross';
}

const [file, ...ids] = process.argv.slice(2);
const LIMIT = Number(process.env.LIMIT ?? 2500);
const concepts: Concept[] = (await import(pathToFileURL(resolve(file)).href)).default;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const kinds = (r: Placement[]) => ({
  s: r.filter((p) => p.rail.kind === 'straight').length,
  c: r.filter((p) => p.rail.kind === 'curve').length,
  x: r.filter((p) => p.rail.kind === 'cross').length,
});

/** Direction changes along the route: lots of back-and-forth wiggles read as messy. */
function wiggle(r: Placement[]): number {
  let n = 0;
  for (let i = 2; i < r.length; i++) {
    const a = r[i - 2], b = r[i - 1], c = r[i];
    if (a.rail.kind === 'curve' && b.rail.kind === 'curve' && c.rail.kind === 'curve') n++;
  }
  return n;
}

interface Result {
  def: StageDef;
  par: number;
  three: number;
  sloppy: number;
  open: number;
  score: number;
  sol: Placement[];
  total: number;
}

const why: Record<string, number> = {};
const reject = (r: string) => ((why[r] = (why[r] ?? 0) + 1), null);

function evaluate(def: StageDef, parRange: [number, number], mustUse?: 'cross'): Result | null {
  const cross = def.inventory.cross ?? 0;
  let open;
  try {
    open = solve(parseStage({ ...def, inventory: { straight: 30, curve: 30, cross } }, 0), LIMIT, true);
  } catch {
    return reject('invalid');
  }
  if (open.truncated) return reject('too open');
  if (open.minRails === null || !open.routes) return reject('unsolvable');
  const par = open.minRails;
  if (par < parRange[0] || par > parRange[1]) return reject(`par ${par}`);
  const routes = open.routes.map((r) => ({ r, ...kinds(r) }));
  let best: Result | null = null;
  const shortest = routes.filter((x) => x.r.length === par);
  if (mustUse && shortest.some((x) => x.x === 0)) return reject('skips ' + mustUse);
  for (const sh of shortest) {
    for (let ds = 0; ds <= 3; ds++) {
      for (let dc = 0; dc <= 3; dc++) {
        const s = sh.s + ds;
        const c = sh.c + dc;
        const fits = routes.filter((x) => x.s <= s && x.c <= c && x.x <= cross);
        const three = fits.filter((x) => x.r.length <= par).length;
        const two = fits.filter((x) => x.r.length > par && x.r.length <= par + TWO_STAR_SLACK).length;
        const sloppy = fits.length - three;
        if (three < 1 || three > 3 || sloppy < 2 || two < 1 || fits.length > 120) continue;
        const score = (three === 1 ? 8 : three === 2 ? 4 : 0) + Math.min(sloppy, 6) - wiggle(sh.r) * 2.5 - (ds + dc) * 0.3;
        if (best && best.score >= score) continue;
        best = { def: { ...def, inventory: { straight: s, curve: c, cross } }, par, three, sloppy, open: open.count, score, sol: sh.r, total: fits.length };
      }
    }
  }
  return best ?? reject('stars');
}

for (const concept of concepts) {
  if (ids.length && !ids.includes(concept.id)) continue;
  const { par: parRange = [0, 99], density = 0.35, tries: conceptTries = 400, seed = 1, scenery = 'TTTRRMWH', keep = 3, mustUse, ...base } = concept;
  const tries = Number(process.env.TRIES ?? conceptTries);
  const rand = rng(seed * 7919 + concept.id.length);
  const seen = new Set<string>();
  const found: Result[] = [];
  for (let t = 0; t < tries; t++) {
    const map = base.map.map((row) =>
      row
        .split(' ')
        .map((g) => (g === '?' ? (rand() < density ? scenery[Math.floor(rand() * scenery.length)] : '.') : g))
        .join(' '),
    );
    const sig = map.join('|');
    if (seen.has(sig)) continue;
    seen.add(sig);
    const res = evaluate({ ...base, map, solution: map.map((r) => r.replace(/[^\s]/g, '.')) }, parRange, mustUse);
    if (res) found.push(res);
  }
  found.sort((a, b) => b.score - a.score);
  console.log(`\n== ${concept.id}: ${found.length} good of ${seen.size} maps`, JSON.stringify(why));
  for (const k of Object.keys(why)) delete why[k];
  for (const r of found.slice(0, keep)) {
    const stage = parseStage(r.def, 0);
    const check = solve(stage, 3000, true);
    const sol = check.routes!.find((x) => x.length === r.par)!;
    const optimal = check.routes!.filter((x) => x.length === r.par).length;
    console.log(`-- score ${r.score.toFixed(1)}  par ${r.par}  ★★★ ${optimal}  total ${check.count}  open ${r.open}  inv s${r.def.inventory.straight} c${r.def.inventory.curve}`);
    console.log(draw(stage, sol));
    console.log(
      JSON.stringify({ map: r.def.map, inventory: r.def.inventory, solution: solutionGrid(stage, sol), expected: [optimal, check.count] }),
    );
  }
}
