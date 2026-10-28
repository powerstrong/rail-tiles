import { describe, expect, it } from 'vitest';
import { E, N, S, W } from '../engine/dir';
import { type PenguinStageDef, parsePenguinStage, parsePush } from './model';
import { initialState, isWon, slide } from './slide';
import { hintFrom, solveIce } from './solver';

const make = (map: string[], extra: Partial<PenguinStageDef> = {}) =>
  parsePenguinStage({ id: 't', title: 't', tip: '', map, par: 0, solution: [], ...extra }, 1);
const cell = (st: { width: number }, x: number, y: number) => y * st.width + x;

describe('sliding', () => {
  const st = make(['a . . R .', '. . . . .', '. . . . .', '. . . . .', '. . . . A']);

  it('slides until a rock or the edge, and a push into a wall does nothing', () => {
    const s0 = initialState(st);
    expect(slide(st, s0, { penguin: 0, dir: E }).state.pos[0]).toBe(cell(st, 2, 0));
    expect(slide(st, s0, { penguin: 0, dir: S }).state.pos[0]).toBe(cell(st, 0, 4));
    expect(slide(st, s0, { penguin: 0, dir: N }).outcome).toBe('blocked');
  });

  it('wins only by stopping on the hole, and the solver finds the shortest way', () => {
    const r = solveIce(st);
    expect(r.par).toBe(2); // down, then right to the corner hole
    expect(r.optimal).toBe(1);
    let s = initialState(st);
    for (const p of r.first!) s = slide(st, s, p).state;
    expect(isWon(st, s)).toBe(true);
  });

  it('other penguins are stoppers', () => {
    const two = make(['a . . b .', '. . . . .', '. . . . .', '. . . . .', 'A . . . B']);
    expect(slide(two, initialState(two), { penguin: 0, dir: E }).state.pos[0]).toBe(cell(two, 2, 0));
  });
});

describe('ice features', () => {
  it('snow piles stop a penguin on them; fish are picked up on the way', () => {
    const st = make(['a F * . .', '. . . . .', '. . . . .', '. . . . .', '. . . . A']);
    const r = slide(st, initialState(st), { penguin: 0, dir: E });
    expect(r.state.pos[0]).toBe(cell(st, 2, 0));
    expect(r.state.fish).toBe(1);
  });

  it('water is a fall, and a cracked tile breaks once left behind', () => {
    const st = make(['a x . W .', '. . . . .', '. . . . .', '. . . . .', '. . . . A']);
    expect(slide(st, initialState(st), { penguin: 0, dir: E }).outcome).toBe('fell');
    const st2 = make(['. x a . .', '. . . . .', '. . . . .', '. . . . .', '. . . . A']);
    const left = slide(st2, initialState(st2), { penguin: 0, dir: W });
    expect(left.state.pos[0]).toBe(cell(st2, 0, 0));
    expect(left.state.broken).toBe(1);
    expect(slide(st2, left.state, { penguin: 0, dir: E }).outcome).toBe('fell');
  });

  it('currents turn a sliding penguin', () => {
    const st = make(['a . v . .', '. . . . .', '. . . . .', '. . . . .', '. . . . A']);
    expect(slide(st, initialState(st), { penguin: 0, dir: E }).state.pos[0]).toBe(cell(st, 2, 4));
  });

  it('igloos: in through the door, out of the twin; other sides are walls', () => {
    const st = make(['a . 1 . .', '. . . . .', '. . . . .', '. . . . .', '1 . . . A'], { igloos: { '1': ['W', 'E'] } });
    const r = slide(st, initialState(st), { penguin: 0, dir: E });
    expect(r.beats.some((b) => b.kind === 'igloo')).toBe(true);
    expect(r.state.pos[0]).toBe(cell(st, 4, 4)); // out of (0,4) heading east, onto the hole at the far wall
  });

  it('hints follow a shortest win from any state', () => {
    const st = make(['a . . R .', '. . . . .', '. . . . .', '. . . . .', '. . . . A']);
    expect(hintFrom(st, initialState(st))).toEqual(parsePush('av'));
  });
});
