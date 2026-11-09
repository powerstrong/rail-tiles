import { describe, expect, it } from 'vitest';
import { auditCargo } from './audit';
import { dailyCargoDef, dailyCargoStage, naiveMoves, parAnyWagon, parNoBoard, parNoChain } from './generate';
import { moveName } from './model';
import { explore, solveCargo } from './solver';
import { CARGO_CHAPTERS, CARGO_STAGES } from './stages';
import { initialState, isWon, move, tiedUp } from './yard';

/** Stages that teach a rule: a plain greedy player may still get ★★★ there. */
const LESSONS = ['cg-first-gift', 'cg-big-lift', 'cg-ribbon'];

describe('freight yard stages', () => {
  it('have unique cg- ids, three chapters of ten, a bonus at 5 and the boss at 10', () => {
    expect(new Set(CARGO_STAGES.map((s) => s.id)).size).toBe(CARGO_STAGES.length);
    for (const s of CARGO_STAGES) expect(s.id.startsWith('cg-')).toBe(true);
    expect(CARGO_CHAPTERS.map((c) => c.count)).toEqual([10, 10, 10]);
    for (const ch of CARGO_CHAPTERS) {
      CARGO_STAGES.slice(ch.start, ch.start + ch.count).forEach((s, k) => {
        expect(s.chain !== undefined, s.id).toBe(k === 4);
        expect(!!s.boss, s.id).toBe(k === 9);
      });
    }
  });

  it('are all different yards', () => {
    const seen = new Set(CARGO_STAGES.map((s) => JSON.stringify([s.sizes, s.start])));
    expect(seen.size).toBe(CARGO_STAGES.length);
  });

  for (const stage of CARGO_STAGES) {
    it(`${stage.label} ${stage.id}: the listed answer clears in par moves and par is the true minimum`, () => {
      let s = initialState(stage);
      for (const m of stage.solution) {
        const step = move(stage, s, m);
        expect(step, `move ${moveName(m)}`).not.toBeNull();
        s = step!.next;
      }
      expect(isWon(stage, s)).toBe(true);
      expect(stage.solution.length).toBe(stage.par);
      expect(solveCargo(stage)!.par).toBe(stage.par);
    });
  }

  it('start with nothing ready to leave', () => {
    for (const s of CARGO_STAGES) expect(tiedUp(initialState(s).w[0], s.sizes[0]), s.id).toBe(false);
  });

  it('bring in one thing per chapter: the line, then the departure board, then wagons of other sizes', () => {
    CARGO_CHAPTERS.forEach((ch, c) => {
      for (const s of CARGO_STAGES.slice(ch.start, ch.start + ch.count)) {
        const mixed = new Set(s.sizes).size > 1;
        if (c === 0) expect([s.board.length > 0, mixed], s.id).toEqual([false, false]);
        if (c === 1) expect([s.board.length > 0, mixed], s.id).toEqual([true, false]);
        if (c === 2) expect(mixed, s.id).toBe(true);
      }
    });
  });

  it('need the line past the first lessons: if any full wagon could leave, it would be quicker', () => {
    for (const s of CARGO_STAGES) {
      if (LESSONS.includes(s.id) || s.chain) continue;
      const free = parAnyWagon(s);
      expect(free === null || free < s.par, s.id).toBe(true);
    }
  });

  it('need the departure board wherever there is one', () => {
    for (const s of CARGO_STAGES.filter((st) => st.board.length && !st.chain)) {
      const free = parNoBoard(s);
      expect(free === null || free < s.par, s.id).toBe(true);
    }
  });

  it('make the bonus chain a real goal: without it the yard clears quicker', () => {
    for (const s of CARGO_STAGES.filter((st) => st.chain)) expect(parNoChain(s)!, s.id).toBeLessThan(s.par);
  });

  it('ask for real thinking past the first lessons: simple greedy players never earn ★★★', () => {
    for (const s of CARGO_STAGES) {
      if (LESSONS.includes(s.id)) continue;
      expect(naiveMoves(s), s.id).toBeGreaterThan(s.par);
    }
  });

  it('give every boss a few key ideas: at most four shortest answers, and a chain of three or more', () => {
    for (const s of CARGO_STAGES.filter((st) => st.boss)) {
      const a = auditCargo(s)!;
      expect(a.optimal, s.id).toBeLessThanOrEqual(4);
      expect(a.chain, s.id).toBeGreaterThanOrEqual(3);
    }
  });

  it('stay small enough to map on a phone (hints and dead ends need every yard)', () => {
    for (const s of CARGO_STAGES) expect(explore(s)!.states.length, s.id).toBeLessThan(20_000);
  });
});

describe('freight yard daily puzzle', () => {
  it('is the same for a date everywhere, clears in its par, needs the line and keeps to the first chapter, every weekday', () => {
    for (let d = 1; d <= 7; d++) {
      const date = `2026-11-0${d}`;
      const def = dailyCargoDef(date);
      expect(dailyCargoDef(date)).toEqual(def);
      expect(def.id).toBe(`cargo-daily-${date}`);
      const stage = dailyCargoStage(def);
      expect(solveCargo(stage)!.par, date).toBe(def.par);
      let s = initialState(stage);
      for (const m of stage.solution) s = move(stage, s, m)!.next;
      expect(isWon(stage, s), date).toBe(true);
      expect(stage.board, date).toEqual([]);
      expect(new Set(stage.sizes), date).toEqual(new Set([3]));
      expect(naiveMoves(stage), date).toBeGreaterThan(stage.par);
      const free = parAnyWagon(stage);
      expect(free === null || free < stage.par, date).toBe(true);
    }
  }, 120_000);
});
