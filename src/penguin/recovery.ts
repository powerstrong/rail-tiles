import { stateKey, type IceState } from './slide';
import type { IceGraph } from './solver';

/** Missing entries prove failure only after the entire graph was explored. */
export function iceReachability(graph: IceGraph | null, state: IceState): 'possible' | 'impossible' | 'unknown' {
  const key = stateKey(state);
  if (graph?.toWin.has(key)) return 'possible';
  return graph && !graph.truncated && graph.states.has(key) ? 'impossible' : 'unknown';
}
export function lastSolvableIce(graph: IceGraph | null, history: IceState[]): number {
  for (let i = history.length - 1; i >= 0; i--) if (iceReachability(graph, history[i]) === 'possible') return i;
  return -1;
}
