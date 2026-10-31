import { type DepotStage, GONE, type Move } from './model';
import { type DepotState, type Run, applyMove, initialState, isWon, legalMoves, stateKey } from './slide';

export interface DepotGraph {
  /** Every state reachable from the start, by key. */
  states: Map<string, DepotState>;
  /** Moves out of each state: key → [move, next key][] */
  edges: Map<string, [Move, string][]>;
  /** Fewest moves from each state to a win (absent = can never win). */
  toWin: Map<string, number>;
  startKey: string;
  /** True when exploration stopped at the state budget. */
  truncated: boolean;
}

/** Breadth-first map of the whole puzzle, then distances to a win by walking edges backwards. */
export function explore(stage: DepotStage, maxStates = 300_000, from: DepotState = initialState(stage)): DepotGraph {
  const startKey = stateKey(from);
  const states = new Map<string, DepotState>([[startKey, from]]);
  const edges = new Map<string, [Move, string][]>();
  const queue = [startKey];
  let truncated = false;
  for (let qi = 0; qi < queue.length; qi++) {
    const key = queue[qi];
    const s = states.get(key)!;
    const list: [Move, string][] = [];
    if (!isWon(stage, s)) {
      for (const m of legalMoves(stage, s)) {
        const next = applyMove(s, m);
        const nk = stateKey(next);
        if (!states.has(nk)) {
          if (states.size >= maxStates) {
            truncated = true;
            continue;
          }
          states.set(nk, next);
          queue.push(nk);
        }
        list.push([m, nk]);
      }
    }
    edges.set(key, list);
  }
  const back = new Map<string, string[]>();
  for (const [k, list] of edges) for (const [, nk] of list) (back.get(nk) ?? back.set(nk, []).get(nk)!).push(k);
  const toWin = new Map<string, number>();
  const wq: string[] = [];
  for (const [k, s] of states) {
    if (isWon(stage, s)) {
      toWin.set(k, 0);
      wq.push(k);
    }
  }
  for (let i = 0; i < wq.length; i++) {
    const d = toWin.get(wq[i])!;
    for (const pk of back.get(wq[i]) ?? []) {
      if (!toWin.has(pk)) {
        toWin.set(pk, d + 1);
        wq.push(pk);
      }
    }
  }
  return { states, edges, toWin, startKey, truncated };
}

/** How many move sequences win from `key` in exactly its distance (memoised per graph). */
export function countShortest(g: DepotGraph, key: string, memo = new Map<string, number>()): number {
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
export function shortestFrom(g: DepotGraph, key: string): Move[] | null {
  if (!g.toWin.has(key)) return null;
  const out: Move[] = [];
  let k = key;
  while (g.toWin.get(k)! > 0) {
    const d = g.toWin.get(k)!;
    const [m, nk] = g.edges.get(k)!.find(([, n]) => g.toWin.get(n) === d - 1)!;
    out.push(m);
    k = nk;
  }
  return out;
}

export interface DepotSolution {
  /** Fewest moves, or null when the puzzle cannot be won. */
  par: number | null;
  /** How many move sequences win in exactly `par` moves. */
  optimal: number;
  first: Move[] | null;
  reachable: number;
  truncated: boolean;
}

export function solveDepot(stage: DepotStage, maxStates?: number): DepotSolution {
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
 * The next move of the cheapest win from `state` (the hint), or null if there is none, counting
 * moves as the screen does (slide.ts `addRun`) with `run` the open run, if any.
 * Searches forward by cost and stops at the first win, carrying each layout's first move, so it
 * only looks as far as the answer instead of mapping the whole yard. Exact because only the open
 * run can be carried on or cancelled; deeper in the search, two drags of one vehicle in a row are
 * never needed (one drag reaches the same places) and a cancel only undoes a move.
 */
export function hintFrom(stage: DepotStage, state: DepotState, run: Run | null = null, maxStates = 300_000): Move | null {
  if (isWon(stage, state)) return null;
  type Entry = { s: DepotState; first: Move | null };
  const seen = new Set([stateKey(state)]);
  // Layouts by how many moves they add to the count, searched cheapest first.
  const free: Entry[] = [{ s: state, first: null }];
  let frontier = free;
  let carry: Entry[] = [];
  if (run && state[run.vehicle] !== GONE) {
    // Moving the vehicle dragged last joins its run (costs nothing); rolling it back to where the
    // run began cancels that move (one fewer).
    const back = stateKey(run.before);
    for (const m of legalMoves(stage, state)) {
      if (m.vehicle !== run.vehicle) continue;
      const next = applyMove(state, m);
      if (isWon(stage, next)) return m;
      const k = stateKey(next);
      if (seen.has(k)) continue;
      seen.add(k);
      if (k === back) {
        frontier = [{ s: next, first: m }];
        carry = free;
      } else free.push({ s: next, first: m });
    }
  }
  while (frontier.length && seen.size < maxStates) {
    const ahead = carry;
    carry = [];
    for (const { s, first } of frontier) {
      for (const m of legalMoves(stage, s)) {
        const next = applyMove(s, m);
        if (isWon(stage, next)) return first ?? m;
        const k = stateKey(next);
        if (seen.has(k)) continue;
        seen.add(k);
        ahead.push({ s: next, first: first ?? m });
      }
    }
    frontier = ahead;
  }
  return null;
}
