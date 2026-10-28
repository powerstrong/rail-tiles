import type { Dir } from '../engine/dir';
import type { PenguinStage, Push } from './model';
import { type IceState, initialState, isWon, slide, stateKey } from './slide';

export interface IceGraph {
  /** Every state reachable from the start, by key. */
  states: Map<string, IceState>;
  /** Pushes that change the state: key → [push, next key][] */
  edges: Map<string, [Push, string][]>;
  /** Fewest pushes from each state to a win (absent = can never win). */
  toWin: Map<string, number>;
  startKey: string;
  /** True when exploration stopped at the state budget. */
  truncated: boolean;
}

const DIRS: Dir[] = [0, 1, 2, 3];

export function legalPushes(stage: PenguinStage, s: IceState): { push: Push; next: IceState }[] {
  const out: { push: Push; next: IceState }[] = [];
  for (let penguin = 0; penguin < s.pos.length; penguin++) {
    for (const dir of DIRS) {
      const r = slide(stage, s, { penguin, dir });
      if (r.outcome === 'moved') out.push({ push: { penguin, dir }, next: r.state });
    }
  }
  return out;
}

/** Breadth-first map of the whole puzzle, then distances to a win by walking edges backwards. */
export function explore(stage: PenguinStage, maxStates = 400_000, from: IceState = initialState(stage)): IceGraph {
  const startKey = stateKey(from);
  const states = new Map<string, IceState>([[startKey, from]]);
  const edges = new Map<string, [Push, string][]>();
  const queue = [startKey];
  let truncated = false;
  for (let qi = 0; qi < queue.length; qi++) {
    const key = queue[qi];
    const s = states.get(key)!;
    const list: [Push, string][] = [];
    if (!isWon(stage, s)) {
      for (const { push, next } of legalPushes(stage, s)) {
        const nk = stateKey(next);
        list.push([push, nk]);
        if (!states.has(nk)) {
          if (states.size >= maxStates) {
            truncated = true;
            continue;
          }
          states.set(nk, next);
          queue.push(nk);
        }
      }
    }
    edges.set(key, list);
  }
  const back = new Map<string, string[]>();
  for (const [k, list] of edges) for (const [, nk] of list) (back.get(nk) ?? back.set(nk, []).get(nk)!).push(k);
  const toWin = new Map<string, number>();
  const wq: string[] = [];
  for (const [k, s] of states) if (isWon(stage, s)) {
    toWin.set(k, 0);
    wq.push(k);
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

export interface IceSolution {
  /** Fewest pushes, or null when the puzzle cannot be won. */
  par: number | null;
  /** How many different push sequences win in exactly `par` pushes. */
  optimal: number;
  /** One shortest solution. */
  first: Push[] | null;
  reachable: number;
  truncated: boolean;
}

export function solveIce(stage: PenguinStage, maxStates = 400_000): IceSolution {
  const g = explore(stage, maxStates);
  const par = g.toWin.get(g.startKey) ?? null;
  if (par === null) return { par: null, optimal: 0, first: null, reachable: g.states.size, truncated: g.truncated };
  // Count shortest sequences: edges that step exactly one closer to a win.
  const memo = new Map<string, number>();
  const count = (k: string): number => {
    const d = g.toWin.get(k)!;
    if (d === 0) return 1;
    if (memo.has(k)) return memo.get(k)!;
    let n = 0;
    for (const [, nk] of g.edges.get(k) ?? []) if (g.toWin.get(nk) === d - 1) n += count(nk);
    memo.set(k, n);
    return n;
  };
  const first: Push[] = [];
  let k = g.startKey;
  while (g.toWin.get(k)! > 0) {
    const d = g.toWin.get(k)!;
    const [push, nk] = g.edges.get(k)!.find(([, n]) => g.toWin.get(n) === d - 1)!;
    first.push(push);
    k = nk;
  }
  return { par, optimal: count(g.startKey), first, reachable: g.states.size, truncated: g.truncated };
}

/** The next push of a shortest win from `state` (the hint), or null if it can no longer be won. */
export function hintFrom(stage: PenguinStage, state: IceState): Push | null {
  const g = explore(stage, 200_000, state);
  const d = g.toWin.get(g.startKey);
  if (d === undefined || d === 0) return null;
  const hit = g.edges.get(g.startKey)!.find(([, n]) => g.toWin.get(n) === d - 1);
  return hit ? hit[0] : null;
}
