import { hashString, rng } from '../depot/generate';
import type { Dir } from '../engine/dir';
import { type ClockAudit, auditClock } from './audit';
import { type ClockStage, type ClockStageDef, type Hand, type Tile, actionName, stageMap } from './model';
import { explore, parWithoutRest, shortestFrom, solveClock } from './solver';
import { cellOf, free, handCells } from './tick';

/** What a generated clock tower puzzle should look like. */
export interface ClockSpec {
  id: string;
  title: string;
  tip: string;
  width: number;
  height: number;
  walls: [number, number];
  blocks?: [number, number];
  /** Length of each clock hand. */
  hands?: number[];
  levers?: number;
  par: [number, number];
  /** The answer must rest at least once (it cannot be done as fast without resting). */
  mustRest?: boolean;
  /** Bonus stage: ticks allowed beyond par. */
  slack?: number;
  maxOptimal?: number;
  target?: number;
  tries?: number;
  seed?: number;
  keep?: number;
}

export interface ClockCandidate {
  stage: ClockStage;
  audit: ClockAudit;
}

const pick = (rand: () => number, lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));

/** A random tower for `spec`, the mouse placed and no door yet (exit -1). */
export function randomTower(rand: () => number, spec: ClockSpec): ClockStage | null {
  const { width: w, height: h } = spec;
  const tiles: Tile[] = Array.from({ length: w * h }, () => ({ t: 'floor' }));
  const floor = () => {
    const cells = tiles.flatMap((t, i) => (t.t === 'floor' ? [i] : []));
    return cells.length ? cells[Math.floor(rand() * cells.length)] : -1;
  };
  const hands: Hand[] = [];
  for (const len of spec.hands ?? []) {
    // Hubs away from the edge, so the hand sweeps over the board most of the time.
    const inner = tiles.flatMap((t, i) => {
      const x = i % w;
      const y = Math.floor(i / w);
      return t.t === 'floor' && x > 0 && y > 0 && x < w - 1 && y < h - 1 ? [i] : [];
    });
    if (!inner.length) return null;
    const hub = inner[Math.floor(rand() * inner.length)];
    tiles[hub] = { t: 'hub' };
    hands.push({ hub, start: Math.floor(rand() * 4) as Dir, len });
  }
  for (let k = pick(rand, ...spec.walls); k > 0; k--) {
    const c = floor();
    if (c < 0) return null;
    tiles[c] = { t: 'wall' };
  }
  for (let k = spec.blocks ? pick(rand, ...spec.blocks) : 0; k > 0; k--) {
    const c = floor();
    if (c < 0) return null;
    tiles[c] = { t: 'block', color: rand() < 0.5 ? 0 : 1 };
  }
  for (let k = spec.levers ?? 0; k > 0; k--) {
    const c = floor();
    if (c < 0) return null;
    tiles[c] = { t: 'lever' };
  }
  const stage: ClockStage = { id: spec.id, number: 0, title: spec.title, tip: spec.tip, width: w, height: h, tiles, hands, start: -1, exit: -1, par: 0, solution: [] };
  // The mouse starts on plain floor that is free at tick 0 and the next one or two.
  const starts = tiles.flatMap((t, i) => (t.t === 'floor' && free(stage, i, 0) ? [i] : []));
  if (!starts.length) return null;
  stage.start = starts[Math.floor(rand() * starts.length)];
  return stage;
}

/** The same tower with the door on `cell`. */
export const withExit = (stage: ClockStage, cell: number): ClockStage => ({ ...stage, exit: cell, tiles: stage.tiles.map((t, i) => (i === cell ? ({ t: 'exit' } as const) : t)) });

/** The same tower with blocks, hands or levers taken out. */
export function without(stage: ClockStage, kind: 'block' | 'hand' | 'lever'): ClockStage {
  if (kind === 'hand') return { ...stage, hands: [], tiles: stage.tiles.map((t) => (t.t === 'hub' ? ({ t: 'wall' } as const) : t)) };
  return { ...stage, tiles: stage.tiles.map((t) => (t.t === kind ? ({ t: 'floor' } as const) : t)) };
}

/** Whether every kind of thing on the tower changes the answer (so none of it is scenery). */
export function everythingMatters(stage: ClockStage, par: number): boolean {
  if (stage.tiles.some((t) => t.t === 'block') && solveClock(without(stage, 'block')).par === par) return false;
  if (stage.hands.length && solveClock(without(stage, 'hand')).par === par) return false;
  if (stage.tiles.some((t) => t.t === 'lever')) {
    const p = solveClock(without(stage, 'lever')).par;
    if (p !== null && p <= par) return false;
  }
  return true;
}

/**
 * Builds random towers and, in each, tries every cell the mouse can reach `par` ticks away as
 * the door. Returns candidates closest to the target first; only puzzles where the blocks,
 * hands and levers on the map all change the answer.
 */
export function searchClock(spec: ClockSpec): ClockCandidate[] {
  const rand = rng(spec.seed ?? hashString(spec.id));
  const out: ClockCandidate[] = [];
  const tries = spec.tries ?? 600;
  const target = spec.target ?? 0;
  for (let t = 0; t < tries; t++) {
    const base = randomTower(rand, spec);
    if (!base) continue;
    const roam = explore(base);
    const cells = new Set([...roam.states].map(cellOf));
    for (const cell of cells) {
      if (base.tiles[cell].t !== 'floor' || cell === base.start) continue;
      const stage = withExit(base, cell);
      const audit = auditClock(stage);
      if (!audit || audit.par < spec.par[0] || audit.par > spec.par[1]) continue;
      if (spec.maxOptimal && audit.optimal > spec.maxOptimal) continue;
      if (Math.abs(audit.score - target) > 6) continue;
      if (spec.mustRest) {
        const p = parWithoutRest(stage);
        if (p !== null && p <= audit.par) continue;
      }
      if (!everythingMatters(stage, audit.par)) continue;
      stage.par = audit.par;
      stage.solution = shortestFrom(explore(stage), explore(stage).start)!;
      if (spec.slack !== undefined) stage.limit = audit.par + spec.slack;
      out.push({ stage, audit });
    }
  }
  out.sort((a, b) => Math.abs(a.audit.score - target) - Math.abs(b.audit.score - target));
  // One candidate per tower: different doors in one tower look alike.
  const seen = new Set<string>();
  return out
    .filter((c) => {
      const k = stageMap({ ...c.stage, exit: -1, tiles: c.stage.tiles.map((t) => (t.t === 'exit' ? ({ t: 'floor' } as const) : t)) }).map.join('/');
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, spec.keep ?? 6);
}

/** A stage as a definition for stages.ts. */
export function toDef(stage: ClockStage): ClockStageDef {
  const { map, hands } = stageMap(stage);
  const def: ClockStageDef = { id: stage.id, title: stage.title, tip: stage.tip, map, par: stage.par, solution: stage.solution.map(actionName).join('') };
  if (hands.length) def.hands = hands;
  if (stage.limit !== undefined) def.limit = stage.limit;
  return def;
}

export { handCells };
