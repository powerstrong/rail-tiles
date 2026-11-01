import type { Dir } from '../engine/dir';
import { hashString, rng } from '../depot/generate';
import { type SpaceAudit, auditSpace } from './audit';
import { type SpaceStage, type SpaceStageDef, type Tile, parseSpaceStage, pressName, stageMap } from './model';
import { ALL_DIRS } from '../engine/dir';
import { after, stateKey, stepCell } from './gravity';
import { distancesTo, mapStates, shortestFrom } from './solver';

/** What a generated gravity puzzle should look like. */
export interface SpaceSpec {
  id: string;
  title: string;
  tip: string;
  width: number;
  height: number;
  capsules: number;
  walls: [number, number];
  /** Share of walls drawn as asteroids instead of station panels. */
  rocks?: number;
  pads?: [number, number];
  /** Wormhole pairs. */
  holes?: number;
  par: [number, number];
  /** Bonus stage: presses allowed beyond par. */
  slack?: number;
  /** A player who only pulls the capsules closer to their docks must not manage ★★★. */
  beatNaive?: boolean;
  /** At most this many shortest answers (fewer = one clear idea). */
  maxOptimal?: number;
  /** Score to aim for when picking one candidate. */
  target?: number;
  tries?: number;
  seed?: number;
  keep?: number;
}

export interface SpaceCandidate {
  stage: SpaceStage;
  audit: SpaceAudit;
}

const pick = (rand: () => number, lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));

/** A random station for `spec`, with the capsules placed and no docks yet. */
export function randomStation(rand: () => number, spec: SpaceSpec): SpaceStage | null {
  const { width: w, height: h } = spec;
  const tiles: Tile[] = Array.from({ length: w * h }, () => ({ t: 'floor' }));
  const free = () => {
    const cells = tiles.flatMap((t, i) => (t.t === 'floor' ? [i] : []));
    return cells.length ? cells[Math.floor(rand() * cells.length)] : -1;
  };
  for (let k = pick(rand, ...spec.walls); k > 0; k--) {
    const c = free();
    if (c < 0) return null;
    tiles[c] = { t: 'wall', deco: rand() < (spec.rocks ?? 0.5) ? 'rock' : 'panel' };
  }
  for (let k = spec.pads ? pick(rand, ...spec.pads) : 0; k > 0; k--) {
    const c = free();
    if (c < 0) return null;
    tiles[c] = { t: 'pad', dir: Math.floor(rand() * 4) as Dir };
  }
  for (let p = 0; p < (spec.holes ?? 0); p++) {
    const a = free();
    if (a < 0) return null;
    tiles[a] = { t: 'hole', pair: p, twin: -1 };
    const b = free();
    if (b < 0) return null;
    tiles[a] = { t: 'hole', pair: p, twin: b };
    tiles[b] = { t: 'hole', pair: p, twin: a };
  }
  // Every booster must be able to push somewhere, and wormhole ends sit apart.
  const usable = tiles.every((t, i) => {
    if (t.t === 'pad') return stepCell({ width: w, height: h, tiles } as SpaceStage, i, t.dir) >= 0;
    if (t.t === 'hole') return Math.abs((i % w) - (t.twin % w)) + Math.abs(Math.floor(i / w) - Math.floor(t.twin / w)) >= 3;
    return true;
  });
  if (!usable) return null;
  const start: number[] = [];
  for (let k = 0; k < spec.capsules; k++) {
    const options = tiles.flatMap((t, i) => (t.t === 'floor' && !start.includes(i) ? [i] : []));
    if (!options.length) return null;
    start.push(options[Math.floor(rand() * options.length)]);
  }
  return {
    id: spec.id,
    number: 0,
    title: spec.title,
    tip: spec.tip,
    width: w,
    height: h,
    tiles,
    capsules: start.map((_, k) => k),
    start,
    docks: [],
    par: 0,
    solution: [],
  };
}

/**
 * The fewest presses a naive player can manage: one who always presses a way that brings the
 * capsules closer to their docks (all distances added up) when some press does, and only then
 * presses anything else. Infinity when that player cannot dock them within `cap` presses. A
 * stage this player wins in par asks for no real thinking.
 */
export function naivePresses(stage: SpaceStage, cap = 30): number {
  const dist = (st: number[]) =>
    st.reduce((t, c, k) => t + Math.abs((c % stage.width) - (stage.docks[k] % stage.width)) + Math.abs(Math.floor(c / stage.width) - Math.floor(stage.docks[k] / stage.width)), 0);
  const goal = stateKey(stage.docks);
  let frontier = [stage.start];
  const seen = new Set([stateKey(stage.start)]);
  for (let depth = 1; depth <= cap && frontier.length; depth++) {
    const next: number[][] = [];
    for (const s of frontier) {
      const k = stateKey(s);
      const moves = ALL_DIRS.map((d) => after(stage, s, d)).filter((n) => stateKey(n) !== k);
      const closer = moves.filter((n) => dist(n) < dist(s));
      for (const n of closer.length ? closer : moves) {
        const nk = stateKey(n);
        if (nk === goal) return depth;
        if (!seen.has(nk)) {
          seen.add(nk);
          next.push(n);
        }
      }
    }
    frontier = next;
  }
  return Infinity;
}

/** The same station with its docks on `cells`. */
export function withDocks(stage: SpaceStage, cells: number[]): SpaceStage {
  const tiles = [...stage.tiles];
  cells.forEach((c, k) => (tiles[c] = { t: 'dock', capsule: stage.capsules[k] }));
  return { ...stage, tiles, docks: [...cells] };
}

/** The same station with pads or wormholes turned to plain floor. */
export function without(stage: SpaceStage, kind: 'pad' | 'hole'): SpaceStage {
  return { ...stage, tiles: stage.tiles.map((t) => (t.t === kind ? ({ t: 'floor' } as const) : t)) };
}

/** Fewest presses to win, or null. */
function parOf(stage: SpaceStage): number | null {
  const m = mapStates(stage, 200_000);
  if (m.truncated) return null;
  return distancesTo(m.edges, stateKey(stage.docks)).get(m.startKey) ?? null;
}

/**
 * Builds random stations and, in each, offers capsule layouts reachable in `par` presses as the
 * dock spots (so every candidate can be won). Returns candidates closest to the target first;
 * with boosters or wormholes on the map, only puzzles that cannot be won as fast without them.
 */
export function searchSpace(spec: SpaceSpec): SpaceCandidate[] {
  const rand = rng(spec.seed ?? hashString(spec.id));
  const out: SpaceCandidate[] = [];
  const tries = spec.tries ?? 400;
  const target = spec.target ?? 0;
  const keep = spec.keep ?? 6;
  for (let t = 0; t < tries; t++) {
    const base = randomStation(rand, spec);
    if (!base) continue;
    const m = mapStates(base, 120_000);
    if (m.truncated) continue;
    // Depth of every layout from the start.
    const depth = new Map([[m.startKey, 0]]);
    const q = [m.startKey];
    for (let i = 0; i < q.length; i++) {
      for (const [, nk] of m.edges.get(q[i]) ?? []) {
        if (!depth.has(nk)) {
          depth.set(nk, depth.get(q[i])! + 1);
          q.push(nk);
        }
      }
    }
    const goals = [...m.states].filter(([k, s]) => {
      const d = depth.get(k)!;
      return d >= spec.par[0] && d <= spec.par[1] && s.every((c) => base.tiles[c].t === 'floor' && !base.start.includes(c));
    });
    for (let g = 0; g < Math.min(goals.length, 12); g++) {
      const [goalKey, cells] = goals[Math.floor(rand() * goals.length)];
      const stage = withDocks(base, cells);
      const toWin = distancesTo(m.edges, goalKey);
      const audit = auditSpace(stage, { ...m, toWin });
      if (!audit) continue;
      if (spec.maxOptimal && audit.optimal > spec.maxOptimal) continue;
      if (spec.beatNaive && naivePresses(stage) <= audit.par) continue;
      stage.par = audit.par;
      stage.solution = shortestFrom({ edges: m.edges, toWin }, m.startKey)!;
      if (spec.slack !== undefined) stage.limit = audit.par + spec.slack;
      out.push({ stage, audit });
    }
    // Keep the pool small: only the closest few are worth the mechanic check.
    if (out.length > keep * 8) {
      out.sort((a, b) => Math.abs(a.audit.score - target) - Math.abs(b.audit.score - target));
      out.length = keep * 4;
    }
  }
  out.sort((a, b) => Math.abs(a.audit.score - target) - Math.abs(b.audit.score - target));
  const kept: SpaceCandidate[] = [];
  for (const c of out) {
    if (kept.length >= keep) break;
    const needs = (kind: 'pad' | 'hole') => {
      if (!c.stage.tiles.some((t) => t.t === kind)) return true;
      const p = parOf(without(c.stage, kind));
      return p === null || p > c.audit.par;
    };
    if (needs('pad') && needs('hole')) kept.push(c);
  }
  return kept;
}

/** A stage as a definition for stages.ts. */
export function toDef(stage: SpaceStage): SpaceStageDef {
  const def: SpaceStageDef = {
    id: stage.id,
    title: stage.title,
    tip: stage.tip,
    map: stageMap(stage),
    par: stage.par,
    solution: stage.solution.map(pressName).join(''),
  };
  if (stage.limit !== undefined) def.limit = stage.limit;
  return def;
}

// ---------------------------------------------------------------- daily puzzle

export const SPACE_DAILY_PREFIX = 'space-daily-';

type DailyShape = Omit<SpaceSpec, 'id' | 'title' | 'tip'>;
const two: DailyShape = { width: 6, height: 6, capsules: 2, walls: [4, 7], par: [7, 10], target: 24, beatNaive: true, maxOptimal: 6 };
/** One shape per weekday, Sunday first: boosters midweek, wormholes at the weekend. */
const DAILY_SHAPES: { shape: DailyShape; what: string }[] = [
  { shape: { ...two, walls: [3, 5], pads: [1, 2], holes: 1, par: [8, 11], target: 27 }, what: '부스터와 웜홀을 지나' },
  { shape: { ...two, width: 5, height: 5, walls: [3, 5], par: [6, 9], target: 20 }, what: '' },
  { shape: two, what: '' },
  { shape: { ...two, width: 5, height: 5, walls: [2, 4], pads: [2, 3], par: [6, 9], target: 21 }, what: '부스터를 타고' },
  { shape: { ...two, walls: [3, 6], pads: [2, 3], target: 25 }, what: '부스터를 타고' },
  { shape: { ...two, walls: [3, 5], holes: 1, target: 25 }, what: '웜홀을 지나' },
  { shape: { ...two, walls: [3, 5], holes: 2, par: [8, 11], target: 27 }, what: '웜홀 두 쌍을 지나' },
];

/** The space puzzle for a calendar date (YYYY-MM-DD). The same everywhere; built in a worker. */
export function dailySpaceDef(date: string): SpaceStageDef {
  const [, m, d] = date.split('-').map(Number);
  const { shape, what } = DAILY_SHAPES[new Date(`${date}T12:00:00`).getDay()];
  for (let round = 0; round < 40; round++) {
    const found = searchSpace({
      ...shape,
      id: `${SPACE_DAILY_PREFIX}${date}`,
      title: `${m}월 ${d}일 정거장`,
      tip: `오늘의 퍼즐 · 두 캡슐을 ${what ? `${what} ` : ''}자기 색 도킹장으로!`,
      seed: hashString(`space:${date}:${round}`),
      tries: 40,
      keep: 1,
    });
    if (found.length) return toDef(found[0].stage);
  }
  throw new Error(`no space puzzle for ${date}`);
}

export function dailySpaceStage(def: SpaceStageDef): SpaceStage {
  return { ...parseSpaceStage(def, 0), label: '오늘의 퍼즐' };
}
