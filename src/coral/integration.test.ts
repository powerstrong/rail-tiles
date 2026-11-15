import { describe, expect, it } from 'vitest';
import { loadProgress, recordClear, saveProgress, exportCode, readCode } from '../storage';
import { continueTarget } from '../continue';
import { starsFor } from '../engine/stars';
import { isUnlocked } from '../ui/StageSelect';
import { stageCards, worldById } from '../worlds';
import { CORAL_STAGES } from './stages';

describe('coral official world and storage compatibility', () => {
  it('is initially open, unlocks sequentially, and resumes at the next unfinished stage', () => {
    const world = worldById('coral')!;
    expect(world.unlockAfter).toBeUndefined();
    const cards = stageCards(world);
    expect(isUnlocked(cards, new Set(), 0)).toBe(true);
    expect(isUnlocked(cards, new Set(), 1)).toBe(false);
    expect(isUnlocked(cards, new Set([cards[0].id]), 1)).toBe(true);
    const progress = { schemaVersion: 2, stars: { [cards[0].id]: 1 as const }, last: { world: 'coral', stage: cards[0].id } };
    expect(continueTarget(progress)?.index).toBe(1);
  });
  it('migrates only valid coral stamps to one star and preserves better records and other worlds', async () => {
    const data = new Map<string, string>([
      ['rail-tiles-lab-v1', JSON.stringify({ completed: { 'lab-v1-coral-1': true, 'lab-v1-coral-30': true, 'lab-v1-coral-31': true, 'lab-v1-moon-1': true } })],
      ['rail-tiles:progress', JSON.stringify({ schemaVersion: 2, stars: { 'lab-v1-coral-30': 3, 'last-run': 3 }, look: { body: 'red' } })],
    ]);
    const store = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); } };
    const progress = loadProgress(store);
    expect(progress.stars).toEqual({ 'lab-v1-coral-1': 1, 'lab-v1-coral-30': 3, 'last-run': 3 });
    saveProgress(recordClear(progress, 'lab-v1-coral-30', 1), store);
    expect(loadProgress(store)).toEqual(progress);
    expect((await readCode(await exportCode(progress)))?.stars).toEqual(progress.stars);
  });
  it('uses the shared par / par+2 / completion and hint cap with no move limit', () => {
    for (const s of CORAL_STAGES) {
      expect(starsFor(s.par, s.par, false)).toBe(3);
      expect(starsFor(s.par + 2, s.par, false)).toBe(2);
      expect(starsFor(s.par + 30, s.par, false)).toBe(1);
      expect(starsFor(s.par, s.par, true)).toBe(2);
    }
  });
});
