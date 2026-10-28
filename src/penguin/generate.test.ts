import { describe, expect, it } from 'vitest';
import { dailyStreak } from '../engine/generate';
import { ICE_DAILY_PREFIX, dailyIceDef, dailyIceStage } from './generate';
import { initialState, isWon, slide } from './slide';
import { solveIce } from './solver';

describe('daily penguin puzzle', () => {
  it('is the same board for the same date, and a different one the next day', () => {
    expect(dailyIceDef('2026-10-28')).toEqual(dailyIceDef('2026-10-28'));
    expect(dailyIceDef('2026-10-28').map).not.toEqual(dailyIceDef('2026-10-29').map);
  });

  it.each(['2026-10-28', '2026-11-01'])('%s: its solution wins in par pushes and the ★★★ answer is unique', (date) => {
    const stage = dailyIceStage(dailyIceDef(date));
    let s = initialState(stage);
    for (const p of stage.solution) s = slide(stage, s, p).state;
    expect(isWon(stage, s)).toBe(true);
    const r = solveIce(stage);
    expect(r.par).toBe(stage.par);
    expect(r.optimal).toBe(1);
    expect(stage.id.startsWith(ICE_DAILY_PREFIX)).toBe(true);
  });

  it('keeps its own streak, separate from the train daily', () => {
    const ids = ['daily-2026-10-27', `${ICE_DAILY_PREFIX}2026-10-27`, `${ICE_DAILY_PREFIX}2026-10-28`];
    expect(dailyStreak(ids, '2026-10-28', ICE_DAILY_PREFIX)).toBe(2);
    expect(dailyStreak(ids, '2026-10-28')).toBe(1);
  });
});
