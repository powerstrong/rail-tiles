import type { CargoStage, Move } from './model';
import { type Rules, type YardState, initialState, isWon, keyOf, move, movesFrom } from './yard';

export interface YardGraph {
  /** A state for every key the yard can reach (the first one met). */
  states: YardState[];
  ids: Map<string, number>;
  /** Moves out of each state that change something: [move, next id]. Won states have none. */
  edges: [Move, number][][];
  /** Fewest moves to clear from each state (-1 = never). */
  toWin: Int32Array;
  rules: Rules;
}

/** Breadth-first map of the yard from the start (or `from`), then distances to a clear walked back. */
export function explore(stage: CargoStage, rules: Rules = {}, from: YardState = initialState(stage), cap = 400_000): YardGraph | null {
  const ids = new Map<string, number>([[keyOf(from, rules), 0]]);
  const states = [from];
  const edges: [Move, number][][] = [];
  const won: number[] = [];
  for (let i = 0; i < states.length; i++) {
    const s = states[i];
    const list: [Move, number][] = [];
    if (isWon(stage, s, rules)) won.push(i);
    else {
      for (const m of movesFrom(s)) {
        const n = move(stage, s, m, rules)!.next;
        const key = keyOf(n, rules);
        let id = ids.get(key);
        if (id === undefined) {
          id = states.length;
          ids.set(key, id);
          states.push(n);
          if (states.length > cap) return null;
        }
        if (id !== i) list.push([m, id]);
      }
    }
    edges.push(list);
  }
  const back: number[][] = states.map(() => []);
  edges.forEach((list, i) => list.forEach(([, n]) => back[n].push(i)));
  const toWin = new Int32Array(states.length).fill(-1);
  const q = [...won];
  for (const w of won) toWin[w] = 0;
  for (let qi = 0; qi < q.length; qi++) {
    for (const p of back[q[qi]]) {
      if (toWin[p] < 0) {
        toWin[p] = toWin[q[qi]] + 1;
        q.push(p);
      }
    }
  }
  return { states, ids, edges, toWin, rules };
}

/** Distance to a clear from any state of the stage (looked up by key), or -1. */
export function distance(g: YardGraph, s: YardState): number {
  const id = g.ids.get(keyOf(s, g.rules));
  return id === undefined ? -1 : g.toWin[id];
}

/** Distinct shortest move sequences from state `id` (moves to the same yard count once). */
export function countShortest(g: YardGraph, id = 0, memo = new Map<number, number>()): number {
  const d = g.toWin[id];
  if (d < 0) return 0;
  if (d === 0) return 1;
  const known = memo.get(id);
  if (known !== undefined) return known;
  // Moves to the same state are one choice (two empty wagons, say).
  const seen = new Set<number>();
  let n = 0;
  for (const [, nx] of g.edges[id]) {
    if (g.toWin[nx] === d - 1 && !seen.has(nx)) {
      seen.add(nx);
      n += countShortest(g, nx, memo);
    }
  }
  memo.set(id, n);
  return n;
}

/** First move of a shortest way to a clear from the player's actual state, or null. */
export function nextMove(stage: CargoStage, g: YardGraph, s: YardState): Move | null {
  const d = distance(g, s);
  if (d <= 0) return null;
  for (const m of movesFrom(s)) {
    const n = move(stage, s, m, g.rules)!.next;
    if (distance(g, n) === d - 1) return m;
  }
  return null;
}

export function shortestFrom(stage: CargoStage, g: YardGraph, s: YardState): Move[] | null {
  if (distance(g, s) < 0) return null;
  const out: Move[] = [];
  let k = s;
  for (let m = nextMove(stage, g, k); m; m = nextMove(stage, g, k)) {
    out.push(m);
    k = move(stage, k, m, g.rules)!.next;
  }
  return out;
}

export interface CargoSolution {
  par: number | null;
  optimal: number;
  first: Move[] | null;
  reachable: number;
}

export function solveCargo(stage: CargoStage, rules: Rules = {}): CargoSolution | null {
  const g = explore(stage, rules);
  if (!g) return null;
  const par = g.toWin[0] < 0 ? null : g.toWin[0];
  return { par, optimal: par === null ? 0 : countShortest(g), first: shortestFrom(stage, g, g.states[0]), reachable: g.states.length };
}
