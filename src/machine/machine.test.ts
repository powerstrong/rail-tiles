import { describe, expect, it } from 'vitest';
import { light } from './beam';
import { type MachineStageDef, parseMachineStage } from './model';
import { hintLaser, solveLaser } from './solver';

const make = (map: string[], lasers: MachineStageDef['lasers'] = [['E', 'white']]) =>
  parseMachineStage({ id: 't', title: 't', tip: '', map, lasers, par: 0, solution: [] }, 1);

describe('lasers', () => {
  it('a mirror turns the beam; tapping flips / and \\', () => {
    const st = make(['L . m .', '. . . .', '. . o .', '. . . .']);
    expect(light(st, st.start).won).toBe(false); // '/' sends the beam up, off the board
    expect(light(st, st.start ^ 1).won).toBe(true); // '\' sends it down through the bulb
    const r = solveLaser(st);
    expect([r.par, r.optimal]).toEqual([1, 1]);
    expect(hintLaser(st, st.start)).toBe(0);
  });

  it('walls stop beams, bulbs let them through, bolted mirrors cannot be tapped', () => {
    const st = make(['L o N .', '. . o .', '. . # .', '. . o .']);
    const l = light(st, st.start);
    expect(l.litBulbs.size).toBe(2); // the beam passes the first bulb, turns down, lights the second, stops at the wall
    expect(solveLaser(st).par).toBeNull();
  });

  it('half mirrors split the beam', () => {
    const st = make(['L . s o', '. . . .', '. . o .', '. . . .']);
    expect(light(st, st.start ^ 1).won).toBe(true);
  });

  it('coloured bulbs, filters and purple', () => {
    const st = make(['L R p .', '. . . .', 'L U . .', '. . . .'], [['E', 'red'], ['E', 'blue']]);
    expect(light(st, st.start).won).toBe(false); // purple needs blue as well
    const st2 = make(['L R n .', '. . . .', 'L U p .', '. . . .'], [['E', 'red'], ['E', 'blue']]);
    expect(light(st2, st2.start).won).toBe(true);
    const st3 = make(['L U o .', '. . . .', '. . . .', '. . . .'], [['E', 'red']]);
    expect(light(st3, st3.start).won).toBe(false); // red is stopped by a blue filter
  });

  it('a lit sensor opens the doors', () => {
    const st = make(['L x D o', '. . . .', '. . . .', '. . . .']);
    const l = light(st, st.start);
    expect(l.doorsOpen).toBe(true);
    expect(l.won).toBe(true);
  });
});
