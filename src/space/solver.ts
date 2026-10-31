import { ALL_DIRS, type Dir } from '../engine/dir';
import type { SpaceStage } from './model';
import { type SpaceState, after, initialState, isWon, stateKey } from './gravity';

export interface SpaceGraph {
  /** Every state reachable from the start, by key. */
  states: Map<string, SpaceState>;
  /** Presses that change each state: key → [press, next key][] */
  edges: Map<string, [Dir, string][]>;
  /** Fewest presses from each state to a win (absent = can never win from there). */
  toWin: Map<string, number>;
  startKey: string;
  /** True when exploration stopped at the state budget. */
  truncated: boolean;
}

/** Breadth-first map of every state the station can reach, without stopping at a win. */
export function mapStates(stage: SpaceStage, maxStates = 400_000, from: SpaceState = initialState(stage)) {
  const startKey = stateKey(from);
  const states = new Map<string, SpaceState>([[startKey, from]]);
  const edges = new Map<string, [Dir, string][]>();
  const queue = [startKey];
  let truncated = false;
  for (let qi = 0; qi < queue.length; qi++) {
    const key = queue[qi];
    const s = states.get(key)!;
    const list: [Dir, string][] = [];
    for (const d of ALL_DIRS) {
      const next = after(stage, s, d);
      const nk = stateKey(next);
      if (nk === key) continue;
      if (!states.has(nk)) {
        if (states.size >= maxStates) {
          truncated = true;
          continue;
        }
        states.set(nk, next);
        queue.push(nk);
      }
      list.push([d, nk]);
    }
    edges.set(key, list);
  }
  return { states, edges, startKey, truncated };
}

/** Fewest presses from every state to `goalKey`, walking the edges backwards. */
export function distancesTo(edges: Map<string, [Dir, string][]>, goalKey: string): Map<string, number> {
  const back = new Map<string, string[]>();
  for (const [k, list] of edges) for (const [, nk] of list) (back.get(nk) ?? back.set(nk, []).get(nk)!).push(k);
  const dist = new Map<string, number>();
  if (!edges.has(goalKey)) return dist;
  dist.set(goalKey, 0);
  const q = [goalKey];
  for (let i = 0; i < q.length; i++) {
    const d = dist.get(q[i])!;
    for (const pk of back.get(q[i]) ?? []) {
      if (!dist.has(pk)) {
        dist.set(pk, d + 1);
        q.push(pk);
      }
    }
  }
  return dist;
}

export function explore(stage: SpaceStage, maxStates?: number, from?: SpaceState): SpaceGraph {
  const m = mapStates(stage, maxStates, from);
  const toWin = distancesTo(m.edges, stateKey(stage.docks));
  return { ...m, toWin };
}

/** How many press sequences win from `key` in exactly its distance (memoised per graph). */
export function countShortest(g: Pick<SpaceGraph, 'edges' | 'toWin'>, key: string, memo = new Map<string, number>()): number {
  const d = g.toWin.get(key);
  if (d === undefined) return 0;
  if (d === 0) return 1;
  const known = memo.get(key);
  if (known !== undefined) return known;
  let n = 0;
  for (const [, nk] of g.edges.get(key) ?? []) if (g.toWin.get(nk) === d - 1) n += countShortest(g, nk, memo);
  memo.set(key, n);
  return n;
}

/** One shortest win from `key`, or null. */
export function shortestFrom(g: Pick<SpaceGraph, 'edges' | 'toWin'>, key: string): Dir[] | null {
  if (!g.toWin.has(key)) return null;
  const out: Dir[] = [];
  let k = key;
  while (g.toWin.get(k)! > 0) {
    const d = g.toWin.get(k)!;
    const [p, nk] = g.edges.get(k)!.find(([, n]) => g.toWin.get(n) === d - 1)!;
    out.push(p);
    k = nk;
  }
  return out;
}

export interface SpaceSolution {
  /** Fewest presses, or null when the puzzle cannot be won. */
  par: number | null;
  /** How many press sequences win in exactly `par` presses. */
  optimal: number;
  first: Dir[] | null;
  reachable: number;
  truncated: boolean;
}

export function solveSpace(stage: SpaceStage, maxStates?: number): SpaceSolution {
  const g = explore(stage, maxStates);
  const par = g.toWin.get(g.startKey) ?? null;
  return {
    par,
    optimal: par === null ? 0 : countShortest(g, g.startKey),
    first: shortestFrom(g, g.startKey),
    reachable: g.states.size,
    truncated: g.truncated,
  };
}

/**
 * The first press of a shortest win from `state`, or null when there is none (the capsules
 * got into a spot they cannot dock from). Breadth-first from `state`, stopping at the win.
 */
export function hintFrom(stage: SpaceStage, state: SpaceState, maxStates = 400_000): Dir | null {
  if (isWon(stage, state)) return null;
  const goal = stateKey(stage.docks);
  const seen = new Set([stateKey(state)]);
  let frontier: { s: SpaceState; first: Dir }[] = [];
  for (const d of ALL_DIRS) {
    const next = after(stage, state, d);
    const k = stateKey(next);
    if (k === goal) return d;
    if (seen.has(k)) continue;
    seen.add(k);
    frontier.push({ s: next, first: d });
  }
  while (frontier.length && seen.size < maxStates) {
    const ahead: typeof frontier = [];
    for (const { s, first } of frontier) {
      for (const d of ALL_DIRS) {
        const next = after(stage, s, d);
        const k = stateKey(next);
        if (k === goal) return first;
        if (seen.has(k)) continue;
        seen.add(k);
        ahead.push({ s: next, first });
      }
    }
    frontier = ahead;
  }
  return null;
}
