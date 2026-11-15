import { act, actions, isWon, keyOf, type Stage, type State } from './model';
export type Reachability = 'possible' | 'impossible' | 'unknown';
export interface StateGraph {
  states: Map<string, State>;
  edges: Map<string, [number, string][]>;
  toWin: Set<string>;
  truncated: boolean;
}
/** Forward play only: retracing is recovery, not proof that the current flower path can finish. */
export function forward(s: Stage, v: State, action: number): State | null {
  const next = act(s, v, action);
  return next && (s.kind !== 'bee' || next.length > v.length) ? next : null;
}
/** Build once on entry. The published bee boards have fewer than 1,500 states each. */
export function explore(s: Stage, budget = 50_000): StateGraph {
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
        if (states.size >= budget) { truncated = true; continue; }
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
  const key = keyOf(state);
  if (graph?.toWin.has(key)) return 'possible';
  return graph && !graph.truncated && graph.states.has(key) ? 'impossible' : 'unknown';
}
export function lastSolvable(graph: StateGraph | null, history: State[]): number {
  for (let i = history.length - 1; i >= 0; i--) if (reachability(graph, history[i]) === 'possible') return i;
  return -1;
}
