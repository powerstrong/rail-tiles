import { ACTIONS, type Action, type ClockStage, REST } from './model';
import { type ClockState, act, cellOf, initialState, isWon } from './tick';

export interface ClockGraph {
  /** Every state reachable from the start. */
  states: Set<ClockState>;
  /** Possible actions out of each state: [action, next][]. Winning states have none. */
  edges: Map<ClockState, [Action, ClockState][]>;
  /** Fewest ticks from each state to the door (absent = it can never get there). */
  toWin: Map<ClockState, number>;
  start: ClockState;
}

/** Breadth-first map of the tower from `from`, then distances to the door by walking edges back. */
export function explore(stage: ClockStage, from: ClockState = initialState(stage), actions: readonly Action[] = ACTIONS): ClockGraph {
  const states = new Set([from]);
  const edges = new Map<ClockState, [Action, ClockState][]>();
  const queue = [from];
  for (let qi = 0; qi < queue.length; qi++) {
    const s = queue[qi];
    const list: [Action, ClockState][] = [];
    if (!isWon(stage, s)) {
      for (const a of actions) {
        const n = act(stage, s, a);
        if (n < 0) continue;
        list.push([a, n]);
        if (!states.has(n)) {
          states.add(n);
          queue.push(n);
        }
      }
    }
    edges.set(s, list);
  }
  const back = new Map<ClockState, ClockState[]>();
  for (const [s, list] of edges) for (const [, n] of list) (back.get(n) ?? back.set(n, []).get(n)!).push(s);
  const toWin = new Map<ClockState, number>();
  const wq: ClockState[] = [];
  for (const s of states) {
    if (isWon(stage, s)) {
      toWin.set(s, 0);
      wq.push(s);
    }
  }
  for (let i = 0; i < wq.length; i++) {
    const d = toWin.get(wq[i])!;
    for (const p of back.get(wq[i]) ?? []) {
      if (!toWin.has(p)) {
        toWin.set(p, d + 1);
        wq.push(p);
      }
    }
  }
  return { states, edges, toWin, start: from };
}

/** How many action sequences reach the door from `s` in exactly its distance. */
export function countShortest(g: ClockGraph, s: ClockState, memo = new Map<ClockState, number>()): number {
  const d = g.toWin.get(s);
  if (d === undefined) return 0;
  if (d === 0) return 1;
  const known = memo.get(s);
  if (known !== undefined) return known;
  let n = 0;
  for (const [, nx] of g.edges.get(s) ?? []) if (g.toWin.get(nx) === d - 1) n += countShortest(g, nx, memo);
  memo.set(s, n);
  return n;
}

/** The first action of a shortest way to the door from `s`, or null. Steps come before rests. */
export function nextAction(g: ClockGraph, s: ClockState): Action | null {
  const d = g.toWin.get(s);
  if (d === undefined || d === 0) return null;
  return g.edges.get(s)?.find(([, n]) => g.toWin.get(n) === d - 1)?.[0] ?? null;
}

export function shortestFrom(g: ClockGraph, s: ClockState): Action[] | null {
  if (!g.toWin.has(s)) return null;
  const out: Action[] = [];
  let k = s;
  while (g.toWin.get(k)! > 0) {
    const a = nextAction(g, k)!;
    out.push(a);
    k = g.edges.get(k)!.find(([b]) => b === a)![1];
  }
  return out;
}

export interface ClockSolution {
  par: number | null;
  optimal: number;
  first: Action[] | null;
  reachable: number;
}

export function solveClock(stage: ClockStage, actions?: readonly Action[]): ClockSolution {
  const g = explore(stage, initialState(stage), actions);
  const par = g.toWin.get(g.start) ?? null;
  return { par, optimal: par === null ? 0 : countShortest(g, g.start), first: shortestFrom(g, g.start), reachable: g.states.size };
}

/** Fewest ticks without ever resting (null if the door cannot be reached that way). */
export const parWithoutRest = (stage: ClockStage) => solveClock(stage, [0, 1, 2, 3]).par;

/** Rests along a shortest answer. */
export const restsIn = (answer: Action[]) => answer.filter((a) => a === REST).length;

/** Cells the mouse can ever stand on. */
export const reachableCells = (g: ClockGraph) => new Set([...g.states].map(cellOf));
