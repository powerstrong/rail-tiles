import { describe, expect, it } from 'vitest';
import { E, N, S, W } from '../engine/dir';
import { type SpaceStageDef, SpaceStageError, parseSpaceStage, stageMap } from './model';
import { type SpaceState, after, initialState, isWon, press, resolve } from './gravity';
import { hintFrom, solveSpace } from './solver';
import { searchSpace, toDef } from './generate';

const def = (map: string[], extra: Partial<SpaceStageDef> = {}): SpaceStageDef => ({ id: 't', title: 't', tip: 't', map, par: 0, solution: '', ...extra });
const stage = (map: string[]) => parseSpaceStage(def(map), 1);
const xy = (st: { width: number }, s: SpaceState) => s.map((c) => [c % st.width, Math.floor(c / st.width)]);

describe('space map', () => {
  it('reads capsules, docks, walls, boosters and wormholes', () => {
    const st = stage([
      'R . # 1', //
      '. > o .',
      'B . 1 b',
      'r . . .',
    ]);
    expect(st.capsules).toEqual([0, 1]);
    expect(xy(st, st.start)).toEqual([
      [0, 0],
      [0, 2],
    ]);
    expect(xy(st, st.docks)).toEqual([
      [0, 3],
      [3, 2],
    ]);
    expect(st.tiles[5]).toEqual({ t: 'pad', dir: E });
    expect(st.tiles[3]).toEqual({ t: 'hole', pair: 0, twin: 10 });
    expect(st.tiles[10]).toEqual({ t: 'hole', pair: 0, twin: 3 });
    expect(stageMap(st)).toEqual(['R . # 1', '. > o .', 'B . 1 b', 'r . . .']);
  });

  it('rejects a capsule without a dock, a lone wormhole and a stray glyph', () => {
    expect(() => stage(['R . . .', '. . . .', '. . . .', '. . . .'])).toThrow(SpaceStageError);
    expect(() => stage(['R r 1 .', '. . . .', '. . . .', '. . . .'])).toThrow(/wormhole/);
    expect(() => stage(['R r ? .', '. . . .', '. . . .', '. . . .'])).toThrow(/unknown/);
  });
});

describe('gravity', () => {
  it('pulls every capsule one cell at once', () => {
    const st = stage([
      'R . . .', //
      '. . . .',
      '. B . .',
      'r b . .',
    ]);
    expect(xy(st, after(st, initialState(st), E))).toEqual([
      [1, 0],
      [2, 2],
    ]);
  });

  it('stops a capsule at a wall or the edge while the others go on', () => {
    const st = stage([
      'R # . .', //
      'B . . .',
      '. . . .',
      'r b . .',
    ]);
    expect(xy(st, after(st, initialState(st), E))).toEqual([
      [0, 0],
      [1, 1],
    ]);
    expect(xy(st, after(st, initialState(st), N))).toEqual([
      [0, 0],
      [0, 1],
    ]);
  });

  it('moves a line of capsules together, and stops all of it when the front one is stuck', () => {
    const st = stage([
      'R B . #', //
      '. . . .',
      '. . . .',
      'r b . .',
    ]);
    const s1 = after(st, initialState(st), E);
    expect(xy(st, s1)).toEqual([
      [1, 0],
      [2, 0],
    ]);
    // B is against the wall now, so R stays behind it.
    expect(after(st, s1, E)).toEqual(s1);
  });

  it('gives the same result whichever capsule comes first in the list', () => {
    const a = stage(['B R . .', '. . . .', '. . . .', 'r b . .']);
    const b = stage(['R B . .', '. . . .', '. . . .', 'r b . .']);
    expect(xy(a, after(a, initialState(a), W))).toEqual([
      [1, 0],
      [0, 0],
    ]);
    expect(xy(b, after(b, initialState(b), E))).toEqual([
      [1, 0],
      [2, 0],
    ]);
  });

  it('never lets two capsules into one cell or through each other', () => {
    expect(resolve([0, 2], [1, 1])).toEqual([false, false]);
    expect(resolve([0, 1], [1, 0])).toEqual([false, false]);
    // A ring of four can turn together.
    expect(resolve([0, 1, 5, 4], [1, 5, 4, 0])).toEqual([true, true, true, true]);
    // A capsule waiting behind a stuck one stays.
    expect(resolve([0, 1, 2], [1, 2, -1])).toEqual([false, false, false]);
  });

  it('pushes a capsule that flies onto a booster one more cell its way', () => {
    const st = stage([
      'R v . .', //
      '. . . .',
      '. . . .',
      'r . . .',
    ]);
    const p = press(st, initialState(st), E);
    expect(p.frames.map((f) => f.kind)).toEqual(['gravity', 'boost']);
    expect(xy(st, p.next)).toEqual([[1, 1]]);
  });

  it('does not push a capsule that was already standing on the booster', () => {
    const st = stage([
      '. v . .', //
      '. . . .',
      '. . . .',
      'r . . R',
    ]);
    // R is not on the pad; put it there by flying in, then press into a wall.
    let s = initialState(st);
    s = after(st, s, N);
    s = after(st, s, N);
    s = after(st, s, N); // R at (3,0)
    s = after(st, s, W); // R onto (2,0)
    s = after(st, s, W); // onto the pad at (1,0): pushed down to (1,1)
    expect(xy(st, s)).toEqual([[1, 1]]);
    // Back up onto the pad from below: it flies on, the pad pushes it down again.
    expect(xy(st, after(st, s, N))).toEqual([[1, 1]]);
  });

  it('sends a capsule through a wormhole to its twin, unless the twin is taken', () => {
    const st = stage([
      'R 1 . .', //
      '. . . .',
      '. . . 1',
      'r . . .',
    ]);
    const p = press(st, initialState(st), E);
    expect(p.frames.map((f) => f.kind)).toEqual(['gravity', 'warp']);
    expect(xy(st, p.next)).toEqual([[3, 2]]);
    // Standing on the far end does nothing; flying off and back on warps again.
    expect(xy(st, after(st, p.next, S))).toEqual([[3, 3]]);
    // With the twin taken the capsule stays on the near end.
    const two = stage([
      'R 1 . .', //
      '. . . .',
      '. . . 1',
      'r b . B',
    ]);
    const p2 = press(two, [0, 11], E);
    expect(xy(two, p2.next)).toEqual([
      [1, 0],
      [3, 2],
    ]);
    // Two capsules flying into the two ends at once would swap: both stay put.
    const swap = stage([
      'R 1 . .', //
      '. . B 1',
      '. . . .',
      'r b . .',
    ]);
    expect(xy(swap, after(swap, initialState(swap), E))).toEqual([
      [1, 0],
      [3, 1],
    ]);
  });

  it('counts a win only when every capsule is on its own dock at once', () => {
    const st = stage([
      'R B . .', //
      'b r . .',
      '. . . .',
      '. . . .',
    ]);
    const s = after(st, initialState(st), S);
    expect(xy(st, s)).toEqual([
      [0, 1],
      [1, 1],
    ]);
    expect(isWon(st, s)).toBe(false);
  });
});

describe('space solver', () => {
  it('finds the fewest presses and the next press of a shortest win', () => {
    const st = stage([
      'R . . .', //
      '. # . .',
      '. . . .',
      '. . . r',
    ]);
    const res = solveSpace(st);
    expect(res.par).toBe(6);
    expect(res.optimal).toBeGreaterThan(1);
    expect([E, S]).toContain(hintFrom(st, initialState(st)));
  });

  it('knows when the capsules can no longer dock', () => {
    // Two capsules that touch in an empty room can never be pulled apart again.
    const st = stage([
      'R B . .', //
      '. . . .',
      '. . . .',
      'r . . b',
    ]);
    expect(solveSpace(st).par).toBe(null);
    expect(hintFrom(st, initialState(st))).toBe(null);
  });

  it('generates puzzles that win in their par', () => {
    const found = searchSpace({ id: 'g', title: 'g', tip: 'g', width: 5, height: 5, capsules: 2, walls: [3, 4], par: [4, 6], tries: 30, keep: 2 });
    expect(found.length).toBeGreaterThan(0);
    for (const c of found) {
      const back = parseSpaceStage(toDef(c.stage), 1);
      let s = initialState(back);
      for (const d of back.solution) s = after(back, s, d);
      expect(isWon(back, s)).toBe(true);
      expect(solveSpace(back).par).toBe(back.par);
    }
  });
});
