import { describe, expect, it } from 'vitest';
import { act, isWon, keyOf } from './model';
import { explore, forward, lastSolvable, reachability } from './reachability';
import { solve } from './solver';
import { beeIntro } from './beeIntros';
import { stagesFor } from './stages';

describe('complete flower-path validation', () => {
  for (const stage of stagesFor('bee')) it(`${stage.id}: all reachable states agree with independent forward search`, () => {
    const graph = explore(stage);
    expect(graph.truncated).toBe(false);
    expect(graph.toWin.has(keyOf(stage.start))).toBe(true);
    for (const [key, state] of graph.states) {
      const answer = solve(stage, state);
      expect(answer.exhausted).toBe(false);
      expect(graph.toWin.has(key), `${stage.id}: ${key}`).toBe(answer.path !== null);
      if (answer.path) expect(isWon(stage, answer.path.reduce((v, a) => forward(stage, v, a)!, state))).toBe(true);
      if (state.length > 1) {
        expect(act(stage, state, state[state.length - 2])).toEqual(state.slice(0, -1));
        if (state.length > 2) expect(act(stage, state, state[0])).toBeNull();
      }
    }
    if (stage.number <= 3) {
      expect(stage).toEqual(beeIntro(stage.number));
      expect(graph.states.size).toBe(graph.toWin.size);
      expect((graph.edges.get(keyOf(stage.start)) ?? []).length).toBeGreaterThan(0);
    }
  });
  it('keeps unknown distinct from a proven dead end and recovers to the last viable prefix', () => {
    const stage = stagesFor('bee').find(s => explore(s).states.size > explore(s).toWin.size)!;
    const graph = explore(stage);
    const dead = [...graph.states.values()].sort((a, b) => b.length - a.length).find(v => !graph.toWin.has(keyOf(v)))!;
    const history = dead.map((_, i) => dead.slice(0, i + 1));
    const at = lastSolvable(graph, history);
    expect(at).toBeGreaterThanOrEqual(0);
    expect(at).toBeLessThan(history.length - 1);
    expect(reachability(graph, history[at])).toBe('possible');
    expect(history.slice(at + 1).every(v => reachability(graph, v) === 'impossible')).toBe(true);
    expect(reachability(null, dead)).toBe('unknown');
    expect(reachability(explore(stage, 1), stage.start)).toBe('unknown');
    expect(lastSolvable(null, history)).toBe(-1);
  });
});
