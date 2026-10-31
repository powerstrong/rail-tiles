import { describe, expect, it } from 'vitest';
import { GONE, moveName } from './model';
import { applyMove, canMove, initialState, isWon } from './slide';
import { solveDepot } from './solver';
import { DEPOT_CHAPTERS, DEPOT_STAGES } from './stages';

describe('depot stages', () => {
  it('have unique dp- ids, three chapters of ten, a bonus at 5 and the boss at 10', () => {
    expect(new Set(DEPOT_STAGES.map((s) => s.id)).size).toBe(DEPOT_STAGES.length);
    for (const s of DEPOT_STAGES) expect(s.id.startsWith('dp-')).toBe(true);
    expect(DEPOT_CHAPTERS.map((c) => c.count)).toEqual([10, 10, 10]);
    for (const ch of DEPOT_CHAPTERS) {
      DEPOT_STAGES.slice(ch.start, ch.start + ch.count).forEach((s, k) => expect(s.limit !== undefined, s.id).toBe(k === 4));
    }
  });

  for (const stage of DEPOT_STAGES) {
    it(`${stage.label} ${stage.id}: the listed answer wins in par moves and par is the true minimum`, () => {
      let s = initialState(stage);
      for (const m of stage.solution) {
        expect(canMove(stage, s, m), moveName(stage, s[m.vehicle], m)).toBe(true);
        s = applyMove(s, m);
      }
      expect(isWon(stage, s)).toBe(true);
      expect(stage.solution.length).toBe(stage.par);
      const res = solveDepot(stage);
      expect(res.truncated).toBe(false);
      expect(res.par).toBe(stage.par);
      if (stage.limit !== undefined) expect(stage.limit).toBeGreaterThan(stage.par);
    }, 30_000);
  }

  it('bring in one thing per chapter: one locomotive, then crossings, then two locomotives', () => {
    DEPOT_CHAPTERS.forEach((ch, c) => {
      for (const s of DEPOT_STAGES.slice(ch.start, ch.start + ch.count)) {
        const locos = s.vehicles.filter((v) => v.kind === 'loco').length;
        expect(locos, s.id).toBe(c === 2 ? 2 : 1);
        if (c === 0) expect(s.barriers.length, s.id).toBe(0);
        if (c === 1) expect(s.barriers.length, s.id).toBeGreaterThan(0);
      }
    });
  });

  it('make the button matter wherever there is a crossing', () => {
    for (const s of DEPOT_STAGES.filter((st) => st.barriers.length > 0)) {
      // Without the buttons the barriers never open, and no crossing stage can be won.
      const noButtons = { ...s, tiles: s.tiles.map((t) => (t.t === 'button' ? ({ t: 'track' } as const) : t)), buttons: [] };
      expect(solveDepot(noButtons).par, s.id).toBe(null);
    }
  });

  it('use what each new-thing stage is about', () => {
    const freight = DEPOT_STAGES.find((s) => s.id === 'dp-long-freight')!;
    expect(freight.solution.some((m) => freight.vehicles[m.vehicle].kind === 'freight')).toBe(true);
    const tower = DEPOT_STAGES.find((s) => s.id === 'dp-water-tower')!;
    expect(tower.tiles.some((t) => t.t === 'block')).toBe(true);
    const crossing = DEPOT_STAGES.find((s) => s.id === 'dp-crossing')!;
    expect(crossing.barriers.length).toBe(1);
    const two = DEPOT_STAGES.find((s) => s.id === 'dp-two-engines')!;
    expect(two.solution.filter((m) => m.to === GONE).length).toBe(2);
  });
});
