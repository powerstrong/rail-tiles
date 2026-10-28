import { describe, expect, it } from 'vitest';
import { pushName } from './model';
import { initialState, isWon, slide } from './slide';
import { solveIce } from './solver';
import { ICE_CHAPTERS, ICE_STAGES } from './stages';

describe('penguin stages', () => {
  it('have unique ids that never clash with train stages', () => {
    expect(new Set(ICE_STAGES.map((s) => s.id)).size).toBe(ICE_STAGES.length);
    for (const s of ICE_STAGES) expect(s.id.startsWith('ice-')).toBe(true);
  });

  it('are three chapters of ten', () => {
    expect(ICE_CHAPTERS.map((c) => c.count)).toEqual([10, 10, 10]);
  });

  for (const stage of ICE_STAGES) {
    it(`${stage.label} ${stage.id}: the listed solution wins in par pushes, par is the true minimum, the ★★★ answer is unique`, () => {
      let s = initialState(stage);
      for (const p of stage.solution) {
        const r = slide(stage, s, p);
        expect(r.outcome, pushName(p)).toBe('moved');
        s = r.state;
      }
      expect(isWon(stage, s)).toBe(true);
      expect(stage.solution.length).toBe(stage.par);
      const res = solveIce(stage);
      expect(res.par).toBe(stage.par);
      expect(res.optimal).toBe(1);
    });
  }
});
