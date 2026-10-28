import { describe, expect, it } from 'vitest';
import { auditLaser } from './audit';
import { light } from './beam';
import { solveLaser } from './solver';
import { MACHINE_CHAPTERS, MACHINE_STAGES } from './stages';

describe('machine stages', () => {
  it('have unique mc- ids', () => {
    expect(new Set(MACHINE_STAGES.map((s) => s.id)).size).toBe(MACHINE_STAGES.length);
    for (const s of MACHINE_STAGES) expect(s.id.startsWith('mc-')).toBe(true);
  });

  it('are three chapters of ten: stage 5 a bonus, stage 10 the boss', () => {
    expect(MACHINE_CHAPTERS.map((c) => c.count)).toEqual([10, 10, 10]);
    for (const ch of MACHINE_CHAPTERS) {
      const list = MACHINE_STAGES.slice(ch.start, ch.start + ch.count);
      expect(list[4].battery).toBeGreaterThan(list[4].par);
      expect(list[9].boss).toBe(true);
      // The boss is the hardest stage of its chapter.
      const scores = list.map((s) => auditLaser(s)!.score);
      expect(Math.max(...scores)).toBe(scores[9]);
    }
  });

  for (const stage of MACHINE_STAGES) {
    it(`${stage.label} ${stage.id}: the listed taps light every bulb, par is the true minimum, one ★★★ answer`, () => {
      let config = stage.start;
      for (const d of stage.solution) {
        expect((stage.turnable >> d) & 1).toBe(1);
        config ^= 1 << d;
      }
      expect(light(stage, stage.start).won).toBe(false);
      expect(light(stage, config).won).toBe(true);
      expect(stage.solution.length).toBe(stage.par);
      const r = solveLaser(stage);
      expect([r.par, r.optimal]).toEqual([stage.par, 1]);
    });
  }
});
