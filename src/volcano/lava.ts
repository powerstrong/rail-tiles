import { DX, DY } from '../engine/dir';
import type { VolcanoStage } from './model';

/** Cells lava can flow over (stones aside). Houses burn when reached but pass nothing on. */
const flows = (stage: VolcanoStage, cell: number) => {
  const t = stage.tiles[cell].t;
  return t === 'grass' || t === 'egg' || t === 'crater';
};
const enterable = (stage: VolcanoStage, cell: number) => flows(stage, cell) || stage.tiles[cell].t === 'house';
/** Stones go on grass, but not on the hot ground right next to a crater. */
export const placeable = (stage: VolcanoStage, cell: number) => stage.tiles[cell].t === 'grass' && !isHot(stage, cell);
export function isHot(stage: VolcanoStage, cell: number): boolean {
  return neighbours(stage, cell).some((nb) => stage.tiles[nb].t === 'crater');
}

function neighbours(stage: VolcanoStage, cell: number): number[] {
  const x = cell % stage.width;
  const y = Math.floor(cell / stage.width);
  const out: number[] = [];
  for (let d = 0; d < 4; d++) {
    const nx = x + DX[d];
    const ny = y + DY[d];
    if (nx >= 0 && ny >= 0 && nx < stage.width && ny < stage.height) out.push(ny * stage.width + nx);
  }
  return out;
}

export interface Flow {
  /** Step at which lava reaches each cell (0 at a crater), or -1. */
  time: number[];
  burned: number[];
  hatched: number[];
  won: boolean;
}

/** Breadth-first flood from one crater, up to its volume. Returns distance and parent maps. */
function floodFrom(stage: VolcanoStage, crater: number, stones: ReadonlySet<number>) {
  const n = stage.tiles.length;
  const dist = new Array<number>(n).fill(-1);
  const parent = new Array<number>(n).fill(-1);
  const volume = stage.tiles[crater].t === 'crater' ? (stage.tiles[crater] as { volume: number }).volume : 0;
  dist[crater] = 0;
  const queue = [crater];
  for (let q = 0; q < queue.length; q++) {
    const c = queue[q];
    if (dist[c] >= volume || (c !== crater && !flows(stage, c))) continue;
    for (const nb of neighbours(stage, c)) {
      if (dist[nb] !== -1 || stones.has(nb) || !enterable(stage, nb)) continue;
      dist[nb] = dist[c] + 1;
      parent[nb] = c;
      queue.push(nb);
    }
  }
  return { dist, parent };
}

/** Where the lava goes with these stones down. */
export function flow(stage: VolcanoStage, stones: ReadonlySet<number>): Flow {
  const time = new Array<number>(stage.tiles.length).fill(-1);
  for (const c of stage.craters) {
    const { dist } = floodFrom(stage, c, stones);
    dist.forEach((d, i) => {
      if (d >= 0 && (time[i] < 0 || d < time[i])) time[i] = d;
    });
  }
  const burned = stage.houses.filter((h) => time[h] >= 0);
  const hatched = stage.eggs.filter((e) => time[e] >= 0);
  return { time, burned, hatched, won: burned.length === 0 && hatched.length === stage.eggs.length };
}

/** The grass cells on the shortest lava path to a burning house (any stone set must cover one). */
function cutCandidates(stage: VolcanoStage, stones: ReadonlySet<number>): number[] | null {
  let best: number[] | null = null;
  for (const c of stage.craters) {
    const { dist, parent } = floodFrom(stage, c, stones);
    for (const h of stage.houses) {
      if (dist[h] < 0) continue;
      const cells: number[] = [];
      for (let p = parent[h]; p !== c && p >= 0; p = parent[p]) if (placeable(stage, p)) cells.push(p);
      if (!best || cells.length < best.length) best = cells;
    }
  }
  return best;
}

export interface LavaSolution {
  par: number | null;
  /** Distinct fewest-stone answers. */
  optimal: number;
  solutions: number[][];
  /** Stone sets of size par that save every house but leave an egg cold. */
  coldSets: number;
  /** Stone sets tried while searching. */
  explored: number;
}

/**
 * Fewest stones that win. Any winning stone set must cover a cell of every lava path to a
 * house, so branching on the cells of one shortest burning path finds every minimal answer.
 * Stones only ever shrink the lava, so a set that leaves an egg cold is a dead end.
 */
export function solveLava(stage: VolcanoStage, maxStones = 12): LavaSolution {
  let explored = 0;
  for (let k = 0; k <= maxStones; k++) {
    const seen = new Set<string>();
    const found = new Map<string, number[]>();
    const cold = new Set<string>();
    const go = (stones: Set<number>, left: number) => {
      const key = [...stones].sort((a, b) => a - b).join(',');
      if (seen.has(key)) return;
      seen.add(key);
      explored++;
      const f = flow(stage, stones);
      if (f.hatched.length < stage.eggs.length) {
        if (f.burned.length === 0 && left === 0) cold.add(key);
        return;
      }
      if (f.burned.length === 0) {
        if (left === 0) found.set(key, [...stones].sort((a, b) => a - b));
        return;
      }
      if (left === 0) return;
      const cand = cutCandidates(stage, stones);
      if (!cand) return;
      for (const c of cand) {
        stones.add(c);
        go(stones, left - 1);
        stones.delete(c);
      }
    };
    go(new Set(), k);
    if (found.size) return { par: k, optimal: found.size, solutions: [...found.values()], coldSets: cold.size, explored };
  }
  return { par: null, optimal: 0, solutions: [], coldSets: 0, explored };
}

/**
 * Hint: a misplaced stone to lift (`remove`), or the next stone of the answer closest to what
 * is on the board now.
 */
export function hintLava(solutions: number[][], stones: ReadonlySet<number>): { cell: number; remove: boolean } | null {
  if (!solutions.length) return null;
  const best = solutions.reduce((a, b) => (b.filter((c) => stones.has(c)).length > a.filter((c) => stones.has(c)).length ? b : a));
  const wrong = [...stones].find((c) => !best.includes(c));
  if (wrong !== undefined) return { cell: wrong, remove: true };
  const next = best.find((c) => !stones.has(c));
  return next === undefined ? null : { cell: next, remove: false };
}

// ---------------------------------------------------------------- race (bonus) stages

export interface RaceState {
  lava: ReadonlySet<number>;
  stones: ReadonlySet<number>;
}

export const raceStart = (stage: VolcanoStage): RaceState => ({ lava: new Set(stage.craters), stones: new Set() });

/** Cells the lava could still reach (ignoring time), from where it is now. */
function reachable(stage: VolcanoStage, s: RaceState): Set<number> {
  const seen = new Set(s.lava);
  const queue = [...s.lava];
  for (let q = 0; q < queue.length; q++) {
    const c = queue[q];
    if (!flows(stage, c)) continue;
    for (const nb of neighbours(stage, c)) {
      if (seen.has(nb) || s.stones.has(nb) || !enterable(stage, nb)) continue;
      seen.add(nb);
      queue.push(nb);
    }
  }
  return seen;
}

export interface RaceStep {
  state: RaceState;
  /** Cells the lava spread to this turn. */
  spread: number[];
  burned: boolean;
  /** No house can be reached any more. */
  safe: boolean;
}

/** The lava creeps one cell further in every open direction. */
export function spreadOnce(stage: VolcanoStage, s: RaceState): { state: RaceState; spread: number[] } {
  const lava = new Set(s.lava);
  const spread: number[] = [];
  for (const c of s.lava) {
    if (!flows(stage, c)) continue;
    for (const nb of neighbours(stage, c)) {
      if (lava.has(nb) || s.stones.has(nb) || !enterable(stage, nb)) continue;
      lava.add(nb);
      spread.push(nb);
    }
  }
  return { state: { lava, stones: s.stones }, spread };
}

/** Put a stone on `cell`, then the lava spreads one cell further. */
export function raceStep(stage: VolcanoStage, s: RaceState, cell: number): RaceStep | null {
  if (!placeable(stage, cell) || s.lava.has(cell) || s.stones.has(cell)) return null;
  const { state, spread } = spreadOnce(stage, { lava: s.lava, stones: new Set(s.stones).add(cell) });
  const lava = state.lava;
  const burned = stage.houses.some((h) => lava.has(h));
  const reach = reachable(stage, state);
  return { state, spread, burned, safe: !burned && stage.houses.every((h) => !reach.has(h)) };
}

const raceKey = (s: RaceState) => [...s.stones].sort((a, b) => a - b).join(',') + '|' + [...s.lava].sort((a, b) => a - b).join(',');

export interface RaceSolution {
  par: number | null;
  /** The stones of one fastest rescue, in order. */
  first: number[] | null;
  explored: number;
}

/** Fewest stones that seal the lava in, by breadth-first search over (stones, lava). */
export function solveRace(stage: VolcanoStage, from: RaceState = raceStart(stage), maxStones = 10): RaceSolution {
  if (stage.houses.every((h) => !reachable(stage, from).has(h))) return { par: 0, first: [], explored: 0 };
  let level: { s: RaceState; path: number[] }[] = [{ s: from, path: [] }];
  const seen = new Set([raceKey(from)]);
  let explored = 0;
  for (let depth = 1; depth <= maxStones && level.length; depth++) {
    const next: typeof level = [];
    for (const { s, path } of level) {
      const reach = reachable(stage, s);
      for (const c of reach) {
        const r = raceStep(stage, s, c);
        if (!r || r.burned) continue;
        explored++;
        if (r.safe) return { par: depth, first: [...path, c], explored };
        const key = raceKey(r.state);
        if (seen.has(key)) continue;
        seen.add(key);
        next.push({ s: r.state, path: [...path, c] });
      }
    }
    level = next;
  }
  return { par: null, first: null, explored };
}
