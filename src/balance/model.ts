/** A candy is always on the left (0) or right (1) plate of its own scale. */
export type Side = 0 | 1;
export type State = Side[];
export interface Candy { weight: number; scale: number; group: number }
export interface BalanceStage {
  id: string; title: string; label: string; number: number;
  candies: Candy[];
  /** One immovable weight per side, per scale. Zero means no weight. */
  fixed: [number, number][];
  start: State; par: number; solution: number[];
  discovery: string;
}
export const actions = (stage: BalanceStage): number[] => [...new Set(stage.candies.map(c => c.group))];
export function move(stage: BalanceStage, state: State, group: number): State {
  return state.map((side, i) => stage.candies[i].group === group ? (1 - side) as Side : side);
}
export function totals(stage: BalanceStage, state: State): [number, number][] {
  const result = stage.fixed.map(([left, right]): [number, number] => [left, right]);
  stage.candies.forEach((c, i) => { result[c.scale][state[i]] += c.weight; });
  return result;
}
export const isWon = (stage: BalanceStage, state: State): boolean => totals(stage, state).every(([a, b]) => a === b);
export const stateKey = (state: State): string => state.join('');
/** Exact breadth-first search, using the same single-press rule as the UI.
 * At most 2^8 reachable states in the shipped puzzles. Every edge is its own inverse. */
export function solve(stage: BalanceStage, start: State = stage.start): number[] | null {
  const queue: { state: State; path: number[] }[] = [{ state: start, path: [] }];
  const seen = new Set([stateKey(start)]), groups = actions(stage);
  for (let index = 0; index < queue.length; index++) {
    const { state, path } = queue[index];
    if (isWon(stage, state)) return path;
    for (const group of groups) {
      const next = move(stage, state, group), key = stateKey(next);
      if (seen.has(key)) continue;
      seen.add(key); queue.push({ state: next, path: [...path, group] });
    }
  }
  return null;
}
