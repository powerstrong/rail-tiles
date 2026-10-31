import type { Dir } from '../engine/dir';
import { hashString, rng } from '../depot/generate';
import { type SpaceAudit, auditSpace } from './audit';
import { type SpaceStage, type SpaceStageDef, type Tile, pressName, stageMap } from './model';
import { stateKey, stepCell } from './gravity';
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
