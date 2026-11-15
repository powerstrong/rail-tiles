import { forward } from './reachability';
import { actions, isWon, keyOf, type Stage, type State } from './model';
export interface SearchResult { path: number[] | null; visited: number; exhausted: boolean }
/** Bounded BFS for push, simultaneous motion and flood puzzles. Runs in a Worker in the UI. */
export function breadthFirst(s: Stage, start: State, budget = 160_000): SearchResult {
  const nodes: { v: State; parent: number; action: number }[] = [{ v: start, parent: -1, action: -1 }];
  const seen = new Set([keyOf(start)]);
  for (let head = 0; head < nodes.length; head++) {
    const { v } = nodes[head];
    if (isWon(s, v)) {
      const path: number[] = [];
      for (let i = head; nodes[i].parent >= 0; i = nodes[i].parent) path.push(nodes[i].action);
      return { path: path.reverse(), visited: seen.size, exhausted: false };
    }
    for (const action of actions(s, v)) {
      const next = forward(s, v, action);
      if (!next) continue;
      const key = keyOf(next);
      if (seen.has(key)) continue;
      if (seen.size >= budget) return { path: null, visited: seen.size, exhausted: true };
      seen.add(key); nodes.push({ v: next, parent: head, action });
    }
  }
  return { path: null, visited: seen.size, exhausted: false };
}
function depthFirst(s: Stage, start: State, budget: number): SearchResult {
  const seen = new Set<string>(); let visited = 0;
  const walk = (v: State): number[] | null => {
    if (isWon(s, v)) return [];
    if (++visited > budget) return null;
    const key = keyOf(v);
    if (seen.has(key)) return null;
    seen.add(key);
    for (const action of actions(s, v)) {
      const next = forward(s, v, action);
      if (!next) continue;
      const tail = walk(next);
      if (tail) return [action, ...tail];
      if (visited > budget) return null;
    }
    return null;
  };
  return { path: walk(start), visited, exhausted: visited > budget };
}
export function solve(s: Stage, v: State, budget = 160_000): SearchResult {
  if (isWon(s, v)) return { path: [], visited: 0, exhausted: false };
  return s.kind === 'bee' ? depthFirst(s, v, budget) : breadthFirst(s, v, budget);
}
