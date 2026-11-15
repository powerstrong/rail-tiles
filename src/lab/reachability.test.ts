import { describe, expect, it } from 'vitest';
import { act, actions, isWon, keyOf, type Stage, type State } from './model';
import { explore, forward, lastSolvable, reachability } from './reachability';
import { BeeSearch } from './beeSearch';
import { beeIntro } from './beeIntros';
import { stagesFor } from './stages';

// Intentionally no masks, memoization, degree tests, or connectivity pruning.
function oracle(stage: Stage, state: State): boolean {
  return isWon(stage, state) || actions(stage, state).some(a => {
    const next = forward(stage, state, a);
    return next !== null && oracle(stage, next);
  });
}
describe('flower-path proof and recovery', () => {
  it('agrees with independent exhaustive search in every state of small branching boards', () => {
    for (const [cols, rows, holes, goal] of [[3, 3, [], 8], [4, 3, [5], 11], [4, 4, [], 15]] as const) {
      const stage: Stage = { id: 'oracle', kind: 'bee', number: 1, title: '', cols, rows,
        terrain: Array.from({ length: cols * rows }, (_, i) => +!(holes as readonly number[]).includes(i)),
        start: [0], goal: [goal], solution: [], par: 0 };
      const search = new BeeSearch(stage), stack = [stage.start], seen = new Set<string>();
      while (stack.length) {
        const state = stack.pop()!, key = keyOf(state);
        if (seen.has(key)) continue;
        seen.add(key);
        expect(search.query(state, 50_000, Infinity).answer, key).toBe(oracle(stage, state) ? 'possible' : 'impossible');
        if (!isWon(stage, state)) for (const a of actions(stage, state)) {
          const next = forward(stage, state, a); if (next) stack.push(next);
        }
      }
    }
  });
  for (const stage of stagesFor('bee')) it(`${stage.id}: proves every answer prefix and verifies every returned witness`, () => {
    const graph = explore(stage);
    let state = stage.start;
    for (const action of stage.solution) {
      expect(reachability(graph, state)).toBe('possible');
      const answer = graph.bee!.query(state);
      expect(isWon(stage, answer.path!.reduce((v, a) => forward(stage, v, a)!, state))).toBe(true);
      for (const alternative of actions(stage, state)) {
        const next = forward(stage, state, alternative);
        if (!next) continue;
        const result = graph.bee!.query(next, 40_000, Infinity);
        expect(result.answer).not.toBe('unknown');
        if (result.path) expect(isWon(stage, result.path.reduce((v, a) => forward(stage, v, a)!, next))).toBe(true);
      }
      state = act(stage, state, action)!;
      expect(act(stage, state, state[state.length - 2])).toEqual(state.slice(0, -1));
    }
    expect(reachability(graph, state)).toBe('possible');
    if (stage.number <= 3) {
      expect(stage).toEqual(beeIntro(stage.number));
      let v = stage.start;
      while (!isWon(stage, v)) {
        const next = actions(stage, v).map(a => forward(stage, v, a)).filter(v => v !== null);
        expect(next).toHaveLength(1); v = next[0];
      }
    }
  });
  it('keeps an exceeded work/time/memory budget unknown and recovers the last proven prefix', () => {
    const stage = stagesFor('bee')[9], search = new BeeSearch(stage);
    expect(search.query(stage.start, 0, Infinity).answer).toBe('unknown');
    expect(reachability(explore(stage, 1), stage.start)).toBe('unknown');
    expect(search.query(stage.start, 50_000, 0).answer).toBe('unknown');
    expect(search.memo.size).toBe(0);
    expect(search.query(stage.start, 1, Infinity).answer).toBe('unknown');
    expect(search.memo.has(search.key(stage.start))).toBe(false);
    for (let i = 0; i < 50_000; i++) search.memo.set(-i - 1, -1);
    expect(search.query(stage.start, 50_000, Infinity).answer).toBe('unknown');
    search.memo.clear();
    expect(search.query(stage.start, 50_000, Infinity).answer).toBe('possible');
    const graph = explore(stage);
    let state = stage.start;
    expect(reachability(graph, state)).toBe('possible');
    for (const action of stage.solution) {
      const dead = actions(stage, state).map(a => forward(stage, state, a)).find(v => v && reachability(graph, v) === 'impossible');
      if (dead) {
        const history = dead.map((_, i) => dead.slice(0, i + 1));
        const at = lastSolvable(graph, history);
        expect(at).toBe(state.length - 1);
        // Intermediate pointer moves may be batched before the next React render.
        const batched = explore(stage);
        reachability(batched, stage.start);
        expect(lastSolvable(batched, history)).toBe(at);
        expect(reachability(graph, history[at])).toBe('possible');
        expect(reachability(null, dead)).toBe('unknown');
        expect(lastSolvable(null, history)).toBe(-1);
        return;
      }
      state = forward(stage, state, action)!;
      expect(reachability(graph, state)).toBe('possible');
    }
    throw Error('fixture must have a decisive branch');
  });
  it('merges different path orders and preserves the upper bits on 6×6 boards', () => {
    const stage: Stage = { ...beeIntro(1), cols: 6, rows: 6, terrain: Array(36).fill(1), goal: [35] };
    const search = new BeeSearch(stage);
    const a = [0, 1, 2, 8, 7, 6, 12, 13, 14], b = [0, 6, 12, 13, 7, 1, 2, 8, 14];
    expect(search.key(a)).toBe(search.key(b));
    const first = search.query(a, 50_000, Infinity);
    expect(first.answer).not.toBe('unknown');
    expect(search.query(b, 0, Infinity)).toEqual(first);
    expect(search.key([0, 32, 35])).not.toBe(search.key([0, 35]));
    // A legal path crossing cells 31–35 must still provide a replayable proof.
    const snake = Array.from({ length: 6 }, (_, y) => Array.from({ length: 6 }, (_, x) => y * 6 + (y % 2 ? 5 - x : x))).flat();
    const full = { ...stage, goal: [snake.at(-1)!] }, high = new BeeSearch(full);
    const answer = high.query(snake.slice(0, 31), 50_000, Infinity);
    expect(answer.answer).toBe('possible');
    expect(isWon(full, answer.path!.reduce((v, a) => forward(full, v, a)!, snake.slice(0, 31)))).toBe(true);
  });
});
