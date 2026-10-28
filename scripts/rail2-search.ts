/**
 * Train world season 2 stage search: `npx vite-node scripts/rail2-search.ts <specs.ts> [id ...]`
 *
 * Draws random boards with scenery and the season 2 gimmicks a spec asks for (gates and
 * buttons, rivers with a drawbridge and its lever, water towers, turntables, freight wagons),
 * solves them, hands out a rail inventory the way the daily puzzle does (one or two ★★★
 * routes, a few sloppier ★★/★ ones) and keeps boards whose shortest route really uses
 * the gimmicks and whose audited difficulty (scripts/audit.ts) is in range.
 */
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { DIR_NAMES, type Dir, DX, DY, opposite } from '../src/engine/dir';
import { RAIL_GLYPHS, type Rail, normalizeRot } from '../src/engine/rail';
import { simulate } from '../src/engine/simulate';
import { solve } from '../src/engine/solver';
import { type Placement, type Stage, type StageDef, cellAt, cellKey, parseStage } from '../src/engine/stage';
import { audit, difficultyScore } from './audit';

export interface Rail2Spec {
  id: string;
  size: [number, number];
  /** Scenery share of the board. */
  scenery?: [number, number];
  /** Colours with one button and one gate each. */
  gates?: number;
  /** Rivers, each with a drawbridge and a lever of its own colour. */
  bridges?: number;
  /** Drawbridges start down (the lever raises them). */
  bridgesDown?: boolean;
  towers?: number;
  /** Water as a share of the shortest route's length without towers (default 0.55..0.75). */
  waterShare?: [number, number];
  turntables?: number;
  wagons?: number;
  passengers?: number;
  par: [number, number];
  difficulty: [number, number];
  /** Gimmicks the ★★★ route must use: gate, bridge, tower, turntable. */
  must?: ('gate' | 'bridge' | 'tower' | 'turntable')[];
  oneShot?: boolean;
  boss?: boolean;
  seed?: number;
  keep?: number;
}

const [file, ...ids] = process.argv.slice(2);
const specs: Rail2Spec[] = (await import(pathToFileURL(resolve(file)).href)).default;
const SECONDS = Number(process.env.SECONDS ?? 60);
const ROUTE_LIMIT = 1500;

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

const GLYPH_OF = new Map(Object.entries(RAIL_GLYPHS).map(([g, r]) => [`${r.kind}${r.rot}`, g]));
const glyphOf = (rail: Rail) => GLYPH_OF.get(`${rail.kind}${normalizeRot(rail.kind, rail.rot)}`)!;
const DECOS = ['T', 'T', 'T', 'R', 'R', 'M', 'H'];

function draw(spec: Rail2Spec, rand: () => number): StageDef | null {
  const [w, h] = spec.size;
  const g: string[][] = Array.from({ length: h }, () => Array<string>(w).fill('.'));
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)];
  const inner = (n: number) => 1 + Math.floor(rand() * (n - 2));
  const sides: Dir[] = [0, 1, 2, 3];
  const startSide = pick(sides);
  const goalSide = pick(sides.filter((d) => d !== startSide));
  const onEdge = (side: Dir) =>
    side === 0 ? { x: inner(w), y: 0 } : side === 2 ? { x: inner(w), y: h - 1 } : side === 3 ? { x: 0, y: inner(h) } : { x: w - 1, y: inner(h) };
  const start = onEdge(startSide);
  const goal = onEdge(goalSide);
  if (Math.abs(start.x - goal.x) + Math.abs(start.y - goal.y) < Math.min(w, h) - 1) return null;
  const startDir = opposite(startSide);
  const goalDir = opposite(goalSide);
  g[start.y][start.x] = 'S';
  g[goal.y][goal.x] = 'G';
  const reserved = new Set([`${start.x + DX[startDir]},${start.y + DY[startDir]}`, `${goal.x + DX[goalDir]},${goal.y + DY[goalDir]}`]);
  const free = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && g[y][x] === '.' && !reserved.has(`${x},${y}`);
  const freeCell = () => {
    for (let t = 0; t < 60; t++) {
      const x = Math.floor(rand() * w);
      const y = Math.floor(rand() * h);
      if (free(x, y)) return { x, y };
    }
    return null;
  };

  // Rivers first: a line of water across part of the board with a drawbridge in it.
  for (let b = 0; b < (spec.bridges ?? 0); b++) {
    const color = b + 1;
    const horizontal = rand() < 0.5;
    const len = horizontal ? w : h;
    const at = 1 + Math.floor(rand() * ((horizontal ? h : w) - 2));
    const from = Math.floor(rand() * 2);
    const to = len - Math.floor(rand() * 2);
    const bridgeAt = from + 1 + Math.floor(rand() * Math.max(1, to - from - 2));
    for (let k = from; k < to; k++) {
      const x = horizontal ? k : at;
      const y = horizontal ? at : k;
      if (!free(x, y)) continue;
      g[y][x] = k === bridgeAt ? (horizontal ? `║${color}` : `═${color}`) : 'W';
    }
    if (!g.flat().includes(horizontal ? `║${color}` : `═${color}`)) return null;
    const lever = freeCell();
    if (!lever) return null;
    g[lever.y][lever.x] = `L${color}`;
  }
  for (let c = 0; c < (spec.gates ?? 0); c++) {
    const color = (spec.bridges ?? 0) + c + 1;
    const gate = freeCell();
    const button = freeCell();
    if (!gate || !button || (gate.x === button.x && gate.y === button.y)) return null;
    g[gate.y][gate.x] = `D${color}`;
    g[button.y][button.x] = `K${color}`;
  }
  for (let k = 0; k < (spec.turntables ?? 0); k++) {
    const c = freeCell();
    if (!c) return null;
    g[c.y][c.x] = rand() < 0.5 ? '↻' : '↺';
  }
  for (let k = 0; k < (spec.towers ?? 0); k++) {
    const c = freeCell();
    if (!c) return null;
    g[c.y][c.x] = 'F';
  }
  for (const [n, glyph] of [[spec.wagons ?? 0, 'O'], [spec.passengers ?? 0, 'P']] as const) {
    for (let k = 0; k < n; k++) {
      const c = freeCell();
      if (!c) return null;
      g[c.y][c.x] = glyph;
    }
  }
  const [lo, hi] = spec.scenery ?? [0.16, 0.28];
  const target = Math.round(w * h * (lo + rand() * (hi - lo)));
  for (let placed = 0, tries = 0; placed < target && tries < 200; tries++) {
    const c = freeCell();
    if (!c) break;
    g[c.y][c.x] = pick(DECOS);
    placed++;
  }
  const map = g.map((row) => row.join(' '));
  const blank = g.map((row) => row.map(() => '.').join(' '));
  return {
    id: spec.id,
    title: '',
    tip: '',
    map,
    start: DIR_NAMES[startDir],
    goal: DIR_NAMES[goalDir],
    inventory: { straight: 30, curve: 30 },
    solution: blank,
    ...(spec.bridgesDown && spec.bridges ? { open: Array.from({ length: spec.bridges }, (_, i) => i + 1) } : {}),
    ...(spec.towers ? { water: 99 } : {}),
    ...(spec.oneShot ? { oneShot: true } : {}),
    ...(spec.boss ? { boss: true } : {}),
  };
}

/** Cells the train drives through along this route, in order. */
function driven(stage: Stage, route: Placement[]): string[] {
  const t = simulate(stage, Object.fromEntries(route.map((p) => [cellKey(p.x, p.y), p.rail])));
  return t.steps.flatMap((s) => (s.kind === 'rail' ? [cellKey(s.x, s.y)] : []));
}

function uses(stage: Stage, route: Placement[], what: string): boolean {
  return driven(stage, route).some((k) => {
    const [x, y] = k.split(',').map(Number);
    const c = cellAt(stage, x, y)!;
    if (what === 'turntable') return c.type === 'turntable';
    if (what === 'bridge') return c.type === 'drawbridge';
    if (c.type !== 'empty' || !c.mark) return false;
    return (what === 'gate' && c.mark.kind === 'gate') || (what === 'tower' && c.mark.kind === 'tower');
  });
}

const kinds = (r: Placement[]) => ({ s: r.filter((p) => p.rail.kind === 'straight').length, c: r.filter((p) => p.rail.kind === 'curve').length });

for (const spec of specs) {
  if (ids.length && !ids.includes(spec.id)) continue;
  const rand = rng((spec.seed ?? 1) * 7919 + spec.id.length * 977);
  const found: { def: StageDef; score: number; rank: number; par: number; routes: number; optimal: number }[] = [];
  const seen = new Set<string>();
  const t0 = Date.now();
  let drawn = 0;
  while (Date.now() - t0 < SECONDS * 1000) {
    let def = draw(spec, rand);
    if (!def || seen.has(def.map.join('|'))) continue;
    seen.add(def.map.join('|'));
    drawn++;
    let stage: Stage;
    try {
      stage = parseStage(def, 0);
      // Water: a share of the route the train would need with no limit at all.
      if (spec.towers) {
        const dryStage = parseStage({ ...def, map: def.map.map((r) => r.replace(/F/g, '.')), water: undefined }, 0);
        const dry = solve(dryStage, 1);
        if (dry.minRails === null || !dry.first) continue;
        const moves = driven(dryStage, dry.first).length + 1;
        const [a, b] = spec.waterShare ?? [0.55, 0.75];
        def = { ...def, water: Math.max(3, Math.round(moves * (a + rand() * (b - a)))) };
        stage = parseStage(def, 0);
      }
    } catch {
      continue;
    }
    const open = solve(stage, ROUTE_LIMIT, true);
    if (open.minRails === null || open.truncated || !open.routes) continue;
    const par = open.minRails;
    if (par < spec.par[0] || par > spec.par[1]) continue;
    const routes = open.routes.map((r) => ({ r, ...kinds(r) }));
    const shortest = routes.filter((x) => x.r.length === par);
    if (spec.must?.some((m) => !shortest.every((x) => uses(stage, x.r, m)))) continue;
    // Hand out what one shortest route needs plus a little slack; keep the best spread.
    let best: { def: StageDef; rank: number; routes: number; optimal: number } | null = null;
    for (const sh of shortest) {
      if (sh.c < 2) continue;
      for (let ds = 0; ds <= 3; ds++) {
        for (let dc = 0; dc <= 3; dc++) {
          const inv = { straight: sh.s + ds, curve: sh.c + dc };
          const fits = routes.filter((x) => x.s <= inv.straight && x.c <= inv.curve);
          const three = fits.filter((x) => x.r.length <= par).length;
          const more = fits.length - three;
          if (three < 1 || three > 2 || more < 2 || fits.length > 60) continue;
          const rank = (three === 1 ? 5 : 0) + Math.min(more, 8) + rand();
          if (best && best.rank >= rank) continue;
          const sol = def.map.map((row) => row.split(' ').map(() => '.'));
          for (const p of sh.r) sol[p.y][p.x] = glyphOf(p.rail);
          best = { def: { ...def, inventory: inv, solution: sol.map((row) => row.join(' ')) }, rank, routes: fits.length, optimal: three };
        }
      }
    }
    if (!best) continue;
    const st = parseStage(best.def, 0);
    const score = difficultyScore(audit(st));
    if (score < spec.difficulty[0] || score > spec.difficulty[1]) continue;
    const mid = (spec.difficulty[0] + spec.difficulty[1]) / 2;
    found.push({ def: best.def, score, par, routes: best.routes, optimal: best.optimal, rank: best.rank - Math.abs(score - mid) * 0.5 });
  }
  found.sort((a, b) => b.rank - a.rank);
  console.log(`\n== ${spec.id}: ${found.length} good of ${drawn} boards in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  for (const f of found.slice(0, spec.keep ?? 2)) {
    console.log(`-- difficulty ${f.score.toFixed(1)}  par ${f.par}  ★★★ ${f.optimal}/${f.routes}`);
    console.log(f.def.map.map((r) => '    ' + r).join('\n'));
    console.log(JSON.stringify({ ...f.def, difficulty: Number(f.score.toFixed(1)) }));
  }
}
