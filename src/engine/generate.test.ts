import { describe, expect, it } from 'vitest';
import { dailyDef, dailyStage, dailyStreak } from './generate';
import { simulate } from './simulate';
import { solve } from './solver';
import { cellKey } from './stage';

describe('daily puzzle', () => {
  const dates = ['2026-10-19', '2026-11-03', '2027-02-28'];

  it('is the same puzzle for the same date, and differs between dates', () => {
    expect(dailyDef(dates[0])).toEqual(dailyDef(dates[0]));
    expect(dailyDef(dates[0]).map).not.toEqual(dailyDef(dates[1]).map);
  });

  it.each(dates)('%s: the listed solution wins with exactly par rails, and par is the true minimum', (date) => {
    const stage = dailyStage(date);
    const placed = Object.fromEntries(stage.solution.map((p) => [cellKey(p.x, p.y), p.rail]));
    expect(simulate(stage, placed).success).toBe(true);
    const res = solve(stage, 2000);
    expect(res.minRails).toBe(stage.par);
    expect(stage.par).toBeGreaterThan(stage.width);
    expect(stage.label).toBe('오늘의 퍼즐');
  });
});

describe('daily streak', () => {
  const ids = (...days: string[]) => days.map((d) => `daily-${d}`);
  it('counts back from today, or from yesterday while today is still open', () => {
    expect(dailyStreak(ids('2026-10-17', '2026-10-18', '2026-10-19'), '2026-10-19')).toBe(3);
    expect(dailyStreak(ids('2026-10-17', '2026-10-18'), '2026-10-19')).toBe(2);
    expect(dailyStreak(ids('2026-10-15', '2026-10-17'), '2026-10-19')).toBe(0);
    expect(dailyStreak(['first-line', ...ids('2026-10-19')], '2026-10-19')).toBe(1);
    // across a month boundary
    expect(dailyStreak(ids('2026-10-31', '2026-11-01'), '2026-11-01')).toBe(2);
  });
});
