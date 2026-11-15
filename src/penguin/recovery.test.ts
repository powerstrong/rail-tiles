import { describe, expect, it } from 'vitest';
import { ICE_STAGES } from './stages';
import { initialState, slide, stateKey } from './slide';
import { explore, legalPushes } from './solver';
import { iceReachability, lastSolvableIce } from './recovery';

describe('penguin dead-end recovery', () => {
  const stage = ICE_STAGES[0], start = initialState(stage), graph = explore(stage);
  it('detects the first upward slide and recovers past multiple unsolvable moves', () => {
    const first = slide(stage, start, { penguin: 0, dir: 0 });
    expect(first.outcome).toBe('moved');
    expect(iceReachability(graph, first.state)).toBe('impossible');
    const second = legalPushes(stage, first.state)[0].next;
    expect(iceReachability(graph, second)).toBe('impossible');
    expect(lastSolvableIce(graph, [start, first.state, second])).toBe(0);
    expect(lastSolvableIce(graph, [start])).toBe(0);
    expect(iceReachability(graph, start)).toBe('possible');
  });
  it('includes every penguin, fish and broken tile in the lookup key', () => {
    const base = { pos: [1, 2], fish: 0, broken: 0 };
    expect(new Set([base, { ...base, pos: [1, 3] }, { ...base, fish: 1 }, { ...base, broken: 1 }].map(stateKey)).size).toBe(4);
  });
  it('never treats unavailable or incomplete exploration as proof of failure', () => {
    expect(iceReachability(null, start)).toBe('unknown');
    expect(iceReachability(explore(stage, 1), start)).toBe('unknown');
    expect(lastSolvableIce(null, [start])).toBe(-1);
  });
});
