import { describe, expect, it } from 'vitest';
import { E, N, S, W } from '../engine/dir';
import { searchClock, toDef } from './generate';
import { type ClockStageDef, ClockStageError, REST, parseClockStage, stageMap } from './model';
import { explore, nextAction, parWithoutRest, solveClock } from './solver';
import { act, cellOf, free, handCells, initialState, isWon, pack, reversedOf, turnOf, whyNot } from './tick';

const def = (map: string[], extra: Partial<ClockStageDef> = {}): ClockStageDef => ({ id: 't', title: 't', tip: 't', map, par: 0, solution: '', ...extra });
const stage = (map: string[], hands?: string[]) => parseClockStage(def(map, { hands }), 1);
const xy = (st: { width: number }, cell: number) => [cell % st.width, Math.floor(cell / st.width)];

describe('clock map', () => {
  it('reads the mouse, the door, blocks, hubs, hands and levers, and prints them back', () => {
    const map = ['S . r .', '. H . b', '. . L .', '# . . E'];
    const st = stage(map, ['1,1 E 2']);
    expect(xy(st, st.start)).toEqual([0, 0]);
    expect(xy(st, st.exit)).toEqual([3, 3]);
    expect(st.tiles[2]).toEqual({ t: 'block', color: 0 });
    expect(st.tiles[7]).toEqual({ t: 'block', color: 1 });
    expect(st.hands).toEqual([{ hub: 5, start: E, len: 2 }]);
    expect(stageMap(st)).toEqual({ map, hands: ['1,1 E 2'] });
  });

  it('rejects a hub without its hand, a hand without a hub and a second mouse', () => {
    expect(() => stage(['S . . .', '. H . .', '. . . .', '. . . E'])).toThrow(ClockStageError);
    expect(() => stage(['S . . .', '. . . .', '. . . .', '. . . E'], ['1,1 N 1'])).toThrow(/hub/);
    expect(() => stage(['S . . S', '. . . .', '. . . .', '. . . E'])).toThrow(/two mice/);
  });
});

describe('ticks', () => {
  it('moves the mouse one cell per tick, rests in place, and stops at walls and edges', () => {
    const st = stage(['S # . .', '. . . .', '. . . .', '. . . E']);
    const s0 = initialState(st);
    expect(act(st, s0, E)).toBe(-1);
    expect(act(st, s0, N)).toBe(-1);
    expect(xy(st, cellOf(act(st, s0, S)))).toEqual([0, 1]);
    const rested = act(st, s0, REST);
    expect(cellOf(rested)).toBe(st.start);
    expect(turnOf(rested)).toBe(1);
    expect(whyNot(st, s0, E)).toBe('wall');
    expect(whyNot(st, s0, N)).toBe('edge');
  });

  it('stands red blocks up on even ticks and blue ones on odd ticks', () => {
    const st = stage(['S r b .', '. . . .', '. . . .', '. . . E']);
    // Tick 1 (odd): red is down, so the mouse may step on it.
    const s1 = act(st, initialState(st), E);
    expect(xy(st, cellOf(s1))).toEqual([1, 0]);
    // Tick 2 (even): red stands up again, so the mouse must not stay; blue is down.
    expect(act(st, s1, REST)).toBe(-1);
    expect(whyNot(st, s1, REST)).toBe('block');
    expect(xy(st, cellOf(act(st, s1, E)))).toEqual([2, 0]);
  });

  it('turns every hand a quarter clockwise per tick and keeps the mouse out from under it', () => {
    const st = stage(['. . . .', '. H . .', '. . . .', 'S . . E'], ['1,1 N 2']);
    expect(handCells(st, 0, 0).map((c) => xy(st, c))).toEqual([[1, 0]]);
    expect(handCells(st, 0, 1).map((c) => xy(st, c))).toEqual([
      [2, 1],
      [3, 1],
    ]);
    expect(handCells(st, 0, 2).map((c) => xy(st, c))).toEqual([
      [1, 2],
      [1, 3],
    ]);
    expect(free(st, 13, 2)).toBe(false);
    // The mouse at (0,3) steps right onto (1,3) at tick 1: free. Resting there into tick 2: the hand sweeps in.
    const s1 = act(st, initialState(st), E);
    expect(s1).toBeGreaterThanOrEqual(0);
    expect(act(st, s1, REST)).toBe(-1);
    expect(whyNot(st, s1, REST)).toBe('hand');
  });

  it('turns the hands the other way after the mouse steps onto a lever, and back on the next lever', () => {
    const st = stage(['S L . .', '. H . .', '. . . .', '. . . E'], ['1,1 E 1']);
    const s1 = act(st, initialState(st), E);
    expect(reversedOf(s1)).toBe(1);
    expect(turnOf(s1)).toBe(1); // that tick still turned clockwise
    const s2 = act(st, s1, REST);
    expect(turnOf(s2)).toBe(0); // now it turns back
    expect(reversedOf(act(st, s2, REST))).toBe(1); // resting on the lever does not flip it again
    const s3 = act(st, s2, W);
    const s4 = act(st, s3, E);
    expect(reversedOf(s4)).toBe(0);
  });

  it('wins on arriving at the door', () => {
    const st = stage(['S E . .', '. . . .', '. . . .', '. . . .']);
    expect(isWon(st, act(st, initialState(st), E))).toBe(true);
    expect(pack(1, 1, 0)).toBe(act(st, initialState(st), E));
  });
});

describe('clock solver', () => {
  it('finds the fewest ticks, and the first action of a shortest way', () => {
    const st = stage(['S . . .', '. . . .', '. . . .', '. . . E']);
    const res = solveClock(st);
    expect(res.par).toBe(6);
    const g = explore(st);
    expect([E, S]).toContain(nextAction(g, g.start));
  });

  it('knows when a rest is needed to get there as fast', () => {
    // The red block is up on even ticks; it can only be crossed at an odd tick.
    const st = stage(['# # # #', 'S . r E', '# # # #', '# # # #']);
    expect(solveClock(st).par).toBe(4);
    expect(parWithoutRest(st)).toBe(null);
  });

  it('generates puzzles that are won in their par', () => {
    const found = searchClock({ id: 'g', title: 'g', tip: 'g', width: 5, height: 5, walls: [2, 4], blocks: [2, 4], hands: [2], par: [5, 8], target: 15, tries: 60, keep: 2 });
    expect(found.length).toBeGreaterThan(0);
    for (const c of found) {
      const back = parseClockStage(toDef(c.stage), 1);
      let s = initialState(back);
      for (const a of back.solution) s = act(back, s, a);
      expect(isWon(back, s)).toBe(true);
      expect(solveClock(back).par).toBe(back.par);
    }
  });
});
