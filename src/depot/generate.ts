import { type DirName, dirFromName } from '../engine/dir';
import { auditDepot, type DepotAudit } from './audit';
import { type DepotStage, type DepotStageDef, GONE, type LocoGlyph, type Tile, type Vehicle, cellOf, moveName, parseDepotStage } from './model';
import { type DepotState, applyMove, occupancy } from './slide';
import { explore, shortestFrom } from './solver';

/** What a generated depot puzzle should look like. */
export interface DepotSpec {
  id: string;
  title: string;
  tip: string;
  width: number;
  height: number;
  /** Locomotives and the side of the yard their gate is on. */
  locos: { glyph: LocoGlyph; exit: DirName }[];
  wagons: [number, number];
  /** Share of wagons that are 3 long (freight). */
  long?: number;
  blocks?: [number, number];
  /** A button and a barrier on the red locomotive's way out. */
  crossing?: boolean;
  par: [number, number];
  difficulty?: [number, number];
  /** Bonus stage: moves allowed beyond par. */
  slack?: number;
  /** Keep the button and barrier uncovered at the start, so a first look shows them. */
  clearMarks?: boolean;
  /** The answer must move a freight wagon (for the stage that brings them in). */
  mustMoveFreight?: boolean;
  /** Score to aim for when picking one candidate. */
  target?: number;
  tries?: number;
  seed?: number;
  keep?: number;
}

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const hashString = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

const pick = (rand: () => number, lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));

/** A random yard for `spec` with every vehicle somewhere (or null when the pieces did not fit). */
export function randomYard(rand: () => number, spec: DepotSpec): DepotStage | null {
  const { width: w, height: h } = spec;
  const tiles: Tile[] = Array.from({ length: w * h }, () => ({ t: 'track' }));
  const vehicles: Vehicle[] = [];
  const start: number[] = [];
  const taken = new Set<number>();
  /** Lines that must stay clear across: the locomotives' rows and columns. */
  const locoLines: { horizontal: boolean; line: number }[] = [];
  const stage = (): DepotStage => ({
    id: spec.id,
    number: 0,
    title: spec.title,
    tip: spec.tip,
    width: w,
    height: h,
    tiles,
    vehicles,
    start,
    buttons: tiles.flatMap((t, i) => (t.t === 'button' ? [i] : [])),
    barriers: tiles.flatMap((t, i) => (t.t === 'barrier' ? [i] : [])),
    par: 0,
    solution: [],
  });
  const fits = (v: Vehicle, off: number) => {
    for (let k = 0; k < v.len; k++) {
      const c = cellOf(stage(), v, off, k);
      if (taken.has(c) || tiles[c].t === 'block') return false;
    }
    return true;
  };
  const add = (v: Vehicle, off: number) => {
    vehicles.push(v);
    start.push(off);
    for (let k = 0; k < v.len; k++) taken.add(cellOf(stage(), v, off, k));
  };

  for (const [n, loco] of spec.locos.entries()) {
    const exit = dirFromName(loco.exit);
    const horizontal = exit === 1 || exit === 3;
    const size = horizontal ? w : h;
    const v: Vehicle = { glyph: loco.glyph, kind: 'loco', horizontal, line: 0, len: 2, exit, color: n };
    let placed = false;
    for (let t = 0; t < 30 && !placed; t++) {
      v.line = pick(rand, 1, (horizontal ? h : w) - 2);
      // Start away from the gate so there is a way to clear.
      const off = exit === 1 || exit === 2 ? pick(rand, 0, Math.max(0, size - 4)) : pick(rand, Math.min(2, size - 2), size - 2);
      if (locoLines.some((l) => l.horizontal === horizontal && l.line === v.line) || !fits(v, off)) continue;
      add(v, off);
      locoLines.push({ horizontal, line: v.line });
      placed = true;
    }
    if (!placed) return null;
  }
  const onLocoLine = (c: number) => locoLines.some((l) => (l.horizontal ? Math.floor(c / w) === l.line : c % w === l.line));

  if (spec.crossing) {
    // The barrier sits between the red locomotive and its gate; the button anywhere off its line.
    const red = vehicles[0];
    const size = red.horizontal ? w : h;
    const ahead = red.exit === 1 || red.exit === 2 ? Array.from({ length: size - start[0] - 2 }, (_, k) => start[0] + 2 + k) : Array.from({ length: start[0] }, (_, k) => k);
    const spots = ahead.map((p) => (red.horizontal ? red.line * w + p : p * w + red.line)).filter((c) => !taken.has(c));
    if (!spots.length) return null;
    tiles[spots[pick(rand, 0, spots.length - 1)]] = { t: 'barrier' };
    const free = tiles.flatMap((t, c) => (t.t === 'track' && !taken.has(c) && !onLocoLine(c) ? [c] : []));
    if (!free.length) return null;
    tiles[free[pick(rand, 0, free.length - 1)]] = { t: 'button' };
  }

  const [bMin, bMax] = spec.blocks ?? [0, 0];
  for (let n = pick(rand, bMin, bMax), t = 0; n > 0 && t < 60; t++) {
    const c = pick(rand, 0, w * h - 1);
    if (taken.has(c) || tiles[c].t !== 'track' || onLocoLine(c)) continue;
    tiles[c] = { t: 'block', deco: rand() < 0.5 ? 'tower' : 'crates' };
    n--;
  }

  const count = pick(rand, spec.wagons[0], spec.wagons[1]);
  let coaches = 0;
  let freights = 0;
  for (let t = 0; vehicles.length < spec.locos.length + count && t < 400; t++) {
    const len = rand() < (spec.long ?? 0.3) ? 3 : 2;
    const horizontal = rand() < 0.5;
    const line = pick(rand, 0, (horizontal ? h : w) - 1);
    // A wagon running along a locomotive's own line could never get out of its way.
    if (locoLines.some((l) => l.horizontal === horizontal && l.line === line)) continue;
    const off = pick(rand, 0, (horizontal ? w : h) - len);
    const v: Vehicle = { glyph: '', kind: len === 3 ? 'freight' : 'coach', horizontal, line, len, color: len === 3 ? freights : coaches };
    if (!fits(v, off)) continue;
    if (len === 3) freights++;
    else coaches++;
    add(v, off);
  }
  if (vehicles.length < spec.locos.length + spec.wagons[0]) return null;
  // Letters in reading order of each wagon's first cell, so maps read naturally.
  const wagonOrder = vehicles
    .map((v, i) => ({ i, cell: cellOf(stage(), v, start[i], 0) }))
    .filter(({ i }) => vehicles[i].kind !== 'loco')
    .sort((a, b) => a.cell - b.cell);
  const order = [...vehicles.keys()].filter((i) => vehicles[i].kind === 'loco').concat(wagonOrder.map((x) => x.i));
  const sorted = order.map((i, n) => ({ ...vehicles[i], glyph: vehicles[i].kind === 'loco' ? vehicles[i].glyph : 'ABCDEFGHIJKLMNOP'[n - spec.locos.length] }));
  const starts = order.map((i) => start[i]);
  let c2 = 0;
  let c3 = 0;
  for (const v of sorted) if (v.kind !== 'loco') v.color = v.kind === 'freight' ? c3++ : c2++;
  vehicles.splice(0, vehicles.length, ...sorted);
  start.splice(0, start.length, ...starts);
  return stage();
}

export interface DepotCandidate {
  stage: DepotStage;
  audit: DepotAudit;
}

/** Whether some barrier sits on the red locomotive's line between it and its gate. */
export function barrierAhead(stage: DepotStage, s: DepotState): boolean {
  const red = stage.vehicles[0];
  const at = s[0];
  if (at === GONE) return false;
  const high = red.exit === 1 || red.exit === 2;
  return stage.barriers.some((c) => {
    const x = c % stage.width;
    const y = Math.floor(c / stage.width);
    if ((red.horizontal ? y : x) !== red.line) return false;
    const p = red.horizontal ? x : y;
    return high ? p >= at + red.len : p < at;
  });
}

/**
 * Explores a yard's every layout and offers those that need between `par[0]` and `par[1]` moves
 * as puzzles (every move can be undone, so any layout of the yard is a fair start).
 */
export function startsFor(yard: DepotStage, spec: DepotSpec, rand: () => number, sample = 40, maxStates = 120_000): DepotCandidate[] {
  const g = explore(yard, maxStates);
  if (g.truncated) return [];
  const [lo, hi] = spec.par;
  const keys = [...g.toWin].filter(([k, d]) => d >= lo && d <= hi && !g.states.get(k)!.includes(GONE)).map(([k]) => k);
  // The farthest layouts first (the hardest the yard offers), then a random sample of the rest.
  keys.sort((a, b) => g.toWin.get(b)! - g.toWin.get(a)!);
  const chosen = new Set(keys.slice(0, sample / 2));
  for (let t = 0; t < sample * 2 && chosen.size < Math.min(sample, keys.length); t++) chosen.add(keys[Math.floor(rand() * keys.length)]);
  const out: DepotCandidate[] = [];
  const marks = [...yard.buttons, ...yard.barriers];
  for (const key of chosen) {
    const s = g.states.get(key)!;
    // A crossing only counts while a barrier still lies ahead of the red locomotive.
    if (yard.barriers.length && !barrierAhead(yard, s)) continue;
    if (spec.clearMarks) {
      const occ = occupancy(yard, s);
      if (marks.some((c) => occ[c] >= 0)) continue;
    }
    const audit = auditDepot(yard, g, key);
    if (!audit) continue;
    if (spec.difficulty && (audit.score < spec.difficulty[0] || audit.score > spec.difficulty[1])) continue;
    const moves = shortestFrom(g, key)!;
    if (spec.mustMoveFreight && !moves.some((m) => yard.vehicles[m.vehicle].kind === 'freight')) continue;
    const limit = spec.slack !== undefined ? audit.par + spec.slack : undefined;
    out.push({ stage: { ...yard, start: s, par: audit.par, solution: moves, limit }, audit });
  }
  return out;
}

/** The stage as a definition to paste into stages.ts. */
export function toDef(stage: DepotStage): DepotStageDef {
  const occ = occupancy(stage, stage.start);
  const under: Record<string, '+' | '='> = {};
  const map: string[] = [];
  for (let y = 0; y < stage.height; y++) {
    const row: string[] = [];
    for (let x = 0; x < stage.width; x++) {
      const c = y * stage.width + x;
      const t = stage.tiles[c];
      if (occ[c] >= 0) {
        row.push(stage.vehicles[occ[c]].glyph);
        if (t.t === 'button' || t.t === 'barrier') under[`${x},${y}`] = t.t === 'button' ? '+' : '=';
      } else row.push(t.t === 'track' ? '.' : t.t === 'button' ? '+' : t.t === 'barrier' ? '=' : t.deco === 'tower' ? 't' : 'x');
    }
    map.push(row.join(' '));
  }
  const exits: DepotStageDef['exits'] = {};
  for (const v of stage.vehicles) if (v.kind === 'loco') exits[v.glyph as LocoGlyph] = (['N', 'E', 'S', 'W'] as const)[v.exit!];
  let s: DepotState = stage.start;
  const solution = stage.solution.map((m) => {
    const name = moveName(stage, s[m.vehicle], m);
    s = applyMove(s, m);
    return name;
  });
  return {
    id: stage.id,
    title: stage.title,
    tip: stage.tip,
    map,
    exits,
    ...(Object.keys(under).length ? { under } : {}),
    par: stage.par,
    solution,
    ...(stage.limit !== undefined ? { limit: stage.limit } : {}),
  };
}

/**
 * Searches random yards for `spec` and returns the candidates found: closest to `target` first
 * (fewer equally short answers breaking ties), or hardest first without a target.
 */
export function searchDepot(spec: DepotSpec, rand: () => number = rng(spec.seed ?? hashString(spec.id))): DepotCandidate[] {
  const found: DepotCandidate[] = [];
  for (let t = 0; t < (spec.tries ?? 300); t++) {
    const yard = randomYard(rand, spec);
    if (!yard) continue;
    found.push(...startsFor(yard, spec, rand));
  }
  const rank = (c: DepotCandidate) => (spec.target === undefined ? -c.audit.score : Math.abs(c.audit.score - spec.target) + Math.log2(c.audit.optimal) * 0.05);
  return found.sort((a, b) => rank(a) - rank(b));
}

// ---------------------------------------------------------------- daily puzzle

export const DEPOT_DAILY_PREFIX = 'depot-daily-';

type DailyShape = Omit<DepotSpec, 'id' | 'title' | 'tip'>;
const plain: DailyShape = { width: 6, height: 6, locos: [{ glyph: 'r', exit: 'E' }], wagons: [6, 8], long: 0.3, blocks: [0, 1], par: [6, 9] };
/** One shape per weekday, Sunday first: Wednesday has a crossing, the weekend two locomotives. */
const DAILY_SHAPES: DailyShape[] = [
  { ...plain, locos: [{ glyph: 'r', exit: 'E' }, { glyph: 'b', exit: 'S' }], crossing: true, wagons: [5, 7], par: [8, 11] },
  plain,
  { ...plain, blocks: [1, 2], par: [7, 10] },
  { ...plain, crossing: true, par: [7, 10] },
  { ...plain, wagons: [7, 9], par: [7, 10] },
  { ...plain, locos: [{ glyph: 'r', exit: 'E' }, { glyph: 'b', exit: 'N' }], par: [7, 10] },
  { ...plain, locos: [{ glyph: 'r', exit: 'E' }, { glyph: 'b', exit: 'S' }], par: [8, 11] },
];

/** The depot puzzle for a calendar date (YYYY-MM-DD). The same everywhere; built in a worker. */
export function dailyDepotDef(date: string): DepotStageDef {
  const rand = rng(hashString(`depot:${date}`));
  const [, m, d] = date.split('-').map(Number);
  const shape = DAILY_SHAPES[new Date(`${date}T12:00:00`).getDay()];
  const two = shape.locos.length > 1;
  const spec: DepotSpec = {
    ...shape,
    id: `${DEPOT_DAILY_PREFIX}${date}`,
    title: `${m}월 ${d}일 차고지`,
    tip: `오늘의 퍼즐 · ${two ? '기관차 두 대를' : '기관차를'} ${shape.crossing ? '건널목을 지나 ' : ''}차고 밖으로 내보내요.`,
  };
  for (let t = 0; t < 300; t++) {
    const yard = randomYard(rand, spec);
    if (!yard) continue;
    // A small budget per yard keeps a phone quick: yards with huge mazes are skipped.
    const found = startsFor(yard, spec, rand, 16, 20_000);
    if (found.length) return toDef(found.reduce((a, b) => (b.audit.score > a.audit.score ? b : a)).stage);
  }
  throw new Error(`no depot puzzle for ${date}`);
}

export function dailyDepotStage(def: DepotStageDef): DepotStage {
  return { ...parseDepotStage(def, 0), label: '오늘의 퍼즐' };
}
