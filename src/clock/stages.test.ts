import { describe, expect, it } from 'vitest';
import { dailyClockDef, dailyClockStage, everythingMatters, naiveTicks } from './generate';
import { REST, actionName } from './model';
import { parWithoutRest, solveClock } from './solver';
import { CLOCK_CHAPTERS, CLOCK_STAGES } from './stages';
import { act, initialState, isWon } from './tick';

describe('clock stages', () => {
  it('have unique ck- ids, three chapters of ten, a bonus at 5 and the boss at 10', () => {
    expect(new Set(CLOCK_STAGES.map((s) => s.id)).size).toBe(CLOCK_STAGES.length);
    for (const s of CLOCK_STAGES) expect(s.id.startsWith('ck-')).toBe(true);
    expect(CLOCK_CHAPTERS.map((c) => c.count)).toEqual([10, 10, 10]);
    for (const ch of CLOCK_CHAPTERS) {
      CLOCK_STAGES.slice(ch.start, ch.start + ch.count).forEach((s, k) => expect(s.limit !== undefined, s.id).toBe(k === 4));
    }
  });

  for (const stage of CLOCK_STAGES) {
    it(`${stage.label} ${stage.id}: the listed answer wins in par ticks and par is the true minimum`, () => {
      let s = initialState(stage);
      for (const a of stage.solution) {
        const n = act(stage, s, a);
        expect(n, `${actionName(a)} is possible`).toBeGreaterThanOrEqual(0);
        s = n;
      }
      expect(isWon(stage, s)).toBe(true);
      expect(stage.solution.length).toBe(stage.par);
      expect(solveClock(stage).par).toBe(stage.par);
      if (stage.limit !== undefined) expect(stage.limit).toBeGreaterThan(stage.par);
    });
  }

  it('bring in one thing per chapter: blocks, then hands, then levers', () => {
    CLOCK_CHAPTERS.forEach((ch, c) => {
      for (const s of CLOCK_STAGES.slice(ch.start, ch.start + ch.count)) {
        const levers = s.tiles.some((t) => t.t === 'lever');
        if (c === 0) expect([s.hands.length, levers], s.id).toEqual([0, false]);
        if (c === 1) expect([s.hands.length > 0, levers], s.id).toEqual([true, false]);
        if (c === 2) expect([s.hands.length > 0, levers], s.id).toEqual([true, true]);
      }
    });
  });

  it('use every block, hand and lever on the map: taking any kind away changes the answer', () => {
    for (const s of CLOCK_STAGES) expect(everythingMatters(s, s.par), s.id).toBe(true);
  });

  it('need a rest on the stages that teach resting', () => {
    for (const id of ['ck-rest', 'ck-zigzag', 'ck-double-rest', 'ck-wait-hand', 'ck-lever-rest']) {
      const s = CLOCK_STAGES.find((st) => st.id === id)!;
      expect(s.solution.includes(REST), id).toBe(true);
      const p = parWithoutRest(s);
      expect(p === null || p > s.par, id).toBe(true);
    }
  });

  it('start the mouse on plain floor that is free at tick 0', () => {
    for (const s of CLOCK_STAGES) expect(s.tiles[s.start].t, s.id).toBe('floor');
  });

  it('ask for real thinking past the first lessons: walking straight at the door never earns ★★★', () => {
    const lessons = ['ck-first-steps', 'ck-tick-tock', 'ck-rest', 'ck-clock-hand', 'ck-long-hand', 'ck-lever'];
    for (const s of CLOCK_STAGES) {
      if (lessons.includes(s.id)) continue;
      expect(naiveTicks(s), s.id).toBeGreaterThan(s.par);
    }
  });
});

describe('clock daily puzzle', () => {
  it('is the same for a date everywhere, wins in its par and needs thinking, every weekday', () => {
    for (let d = 1; d <= 7; d++) {
      const date = `2026-11-0${d}`;
      const def = dailyClockDef(date);
      expect(dailyClockDef(date)).toEqual(def);
      expect(def.id).toBe(`clock-daily-${date}`);
      const stage = dailyClockStage(def);
      expect(solveClock(stage).par, date).toBe(def.par);
      let st = initialState(stage);
      for (const a of stage.solution) st = act(stage, st, a);
      expect(isWon(stage, st), date).toBe(true);
      expect(naiveTicks(stage), date).toBeGreaterThan(stage.par);
      expect(everythingMatters(stage, stage.par), date).toBe(true);
    }
  }, 120_000);
});
