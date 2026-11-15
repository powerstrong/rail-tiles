import { BeeSearch } from './beeSearch';
import { act, actions, isWon, keyOf, type Stage, type State } from './model';
export type Reachability = 'possible' | 'impossible' | 'unknown';
export interface StateGraph {
  /** Complete graph fields are used only by rabbits; bee proofs live in the memo below. */
  states: Map<string, State>;
  edges: Map<string, [number, string][]>;
  toWin: Set<string>;
  truncated: boolean;
  bee?: BeeSearch;
  beeBudget?: number;
}
/** Forward play only: retracing is recovery, not proof that the current flower path can finish. */
export function forward(s: Stage, v: State, action: number): State | null {
  const next = act(s, v, action);
  return next && (s.kind !== 'bee' || next.length > v.length) ? next : null;
}
/** Rabbits use a complete small graph. Bees query a bounded, memoized forward search. */
export function explore(s: Stage, budget?: number): StateGraph {
  if (s.kind === 'bee') {
    const bee = new BeeSearch(s);
    return { states: new Map(), edges: new Map(), toWin: new Set(), truncated: false, bee, beeBudget: budget ?? 6_000 };
  }
  const start = keyOf(s.start), states = new Map([[start, s.start]]);
  const edges: StateGraph['edges'] = new Map(), back = new Map<string, string[]>();
  const queue = [start];
  let truncated = false;
  for (let head = 0; head < queue.length; head++) {
    const key = queue[head], v = states.get(key)!, list: [number, string][] = [];
    if (!isWon(s, v)) for (const action of actions(s, v)) {
      const next = forward(s, v, action);
      if (!next) continue;
      const nk = keyOf(next);
      if (!states.has(nk)) {
        if (states.size >= (budget ?? 50_000)) { truncated = true; continue; }
        states.set(nk, next); queue.push(nk);
      }
      list.push([action, nk]);
      back.set(nk, [...(back.get(nk) ?? []), key]);
    }
    edges.set(key, list);
  }
  const wins = [...states].filter(([, v]) => isWon(s, v)).map(([key]) => key);
  const toWin = new Set(wins);
  for (let head = 0; head < wins.length; head++) for (const parent of back.get(wins[head]) ?? []) {
    if (!toWin.has(parent)) { toWin.add(parent); wins.push(parent); }
  }
  return { states, edges, toWin, truncated };
}
export function reachability(graph: StateGraph | null, state: State): Reachability {
  if (graph?.bee) return graph.bee.query(state, graph.beeBudget).answer;
  const key = keyOf(state);
  if (graph?.toWin.has(key)) return 'possible';
  return graph && !graph.truncated && graph.states.has(key) ? 'impossible' : 'unknown';
}
export function lastSolvable(graph: StateGraph | null, history: State[]): number {
  // A batched pointer gesture can skip renders of intermediate prefixes. Check those
  // too, sharing ONE recovery budget instead of starting an 8ms search per prefix.
  const deadline = graph?.bee ? performance.now() + 8 : 0;
  let budget = graph?.beeBudget ?? 6_000;
  for (let i = history.length - 1; i >= 0; i--) {
    if (!graph?.bee) {
      if (reachability(graph, history[i]) === 'possible') return i;
      continue;
    }
    const search = graph.bee, cached = search.memo.get(search.key(history[i]));
    if (cached !== undefined) { if (cached !== -1) return i; continue; }
    const remaining = deadline - performance.now();
    if (budget <= 0 || remaining <= 0) continue;
    const result = search.query(history[i], budget, remaining);
    budget -= search.visited;
    if (result.answer === 'possible') return i;
  }
  return -1;
}
