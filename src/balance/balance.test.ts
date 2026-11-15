import { describe, expect, it } from 'vitest';
import { BALANCE_STAGES } from './stages';
import { actions, isWon, move, solve, stateKey, totals, type State } from './model';
import { generateStages } from './generate';
import { starsFor } from '../engine/stars';
import { absorbSaved, exportCode, loadProgress, readCode, recordClear, saveProgress } from '../storage';
import { worldById } from '../worlds';
import { continueTarget } from '../continue';
import { isUnlocked } from '../ui/StageSelect';
import { stageCards } from '../worlds';

const bits = (n: number) => n.toString(2).replaceAll('0', '').length;
describe('별사탕 저울 — fixed puzzles and independent exhaustive oracle', () => {
  it('reproduces all 30 puzzles from the fixed seed', () => {
    expect(generateStages()).toEqual(BALANCE_STAGES);
    expect(BALANCE_STAGES).toHaveLength(30);
  });
  for (const stage of BALANCE_STAGES) it(`${stage.label}: minimum, replay and every reachable arrangement`, () => {
    const groups = actions(stage);
    const states: State[] = Array.from({ length: 2 ** groups.length }, (_, mask) => stage.start.map((side, i) => (side ^ ((mask >>> groups.indexOf(stage.candies[i].group)) & 1)) as 0 | 1));
    // Independent arithmetic: do not use model.totals/isWon or BFS for the oracle.
    const winners = states.flatMap((state, mask) => stage.fixed.every(([a, b], scale) => {
      let left = a, right = b;
      stage.candies.forEach((c, i) => { if (c.scale === scale) { if (state[i] === 0) left += c.weight; else right += c.weight; } });
      return left === right;
    }) ? [mask] : []);
    expect(winners.length).toBeGreaterThan(0);
    expect(winners).not.toContain(0);
    const shortest = Math.min(...winners.map(bits));
    expect(stage.par).toBe(shortest);
    expect(stage.solution).toHaveLength(shortest);
    let replay = stage.start;
    for (const action of stage.solution) {
      expect(isWon(stage, replay)).toBe(false);
      replay = move(stage, replay, action);
    }
    expect(isWon(stage, replay)).toBe(true);
    const keys = new Set(states.map(stateKey));
    expect(keys.size).toBe(states.length);
    for (let mask = 0; mask < states.length; mask++) {
      const state = states[mask], answer = solve(stage, state);
      expect(answer).not.toBeNull();
      expect(answer!.length).toBe(Math.min(...winners.map(goal => bits(mask ^ goal))));
      for (const group of groups) {
        const next = move(stage, state, group);
        expect(next.every(side => side === 0 || side === 1)).toBe(true);
        expect(keys.has(stateKey(next))).toBe(true);
        expect(move(stage, next, group)).toEqual(state);
      }
    }
    // All star levels remain available: make reversible detours without accidentally clearing.
    const detour = groups.find(g => !isWon(stage, move(stage, stage.start, g)))!;
    expect(detour).toBeDefined();
    for (const extra of [0, 2, 4]) {
      let state = stage.start;
      for (let i = 0; i < extra; i++) { state = move(stage, state, detour); expect(isWon(stage, state)).toBe(false); }
      for (const action of stage.solution) state = move(stage, state, action);
      expect(isWon(stage, state)).toBe(true);
      expect(starsFor(shortest + extra, stage.par, false)).toBe(extra === 0 ? 3 : extra === 2 ? 2 : 1);
    }
    expect(starsFor(stage.par, stage.par, true)).toBe(2);
  });
  it('teaches one press first, then immovable weights, then pairs that affect both scales', () => {
    expect(BALANCE_STAGES[0].candies.map(c => c.weight)).toEqual([2, 1, 1]);
    expect(totals(BALANCE_STAGES[0], BALANCE_STAGES[0].start)).toEqual([[0, 4]]);
    expect(BALANCE_STAGES[0].par).toBe(1);
    for (const stage of BALANCE_STAGES) {
      expect(Math.max(...stage.candies.map(c => c.weight))).toBeLessThanOrEqual(6);
      expect(totals(stage, stage.solution.reduce((s, a) => move(stage, s, a), stage.start)).every(([n]) => n <= 16)).toBe(true);
      expect(stage.fixed.length).toBe(stage.number <= 20 ? 1 : 2);
      if (stage.number <= 10) expect(stage.fixed).toEqual([[0, 0]]);
      else expect(stage.fixed.every(([a, b]) => a + b > 0 && a + b <= 5)).toBe(true);
      if (stage.number > 20) {
        const pairs = actions(stage).filter(g => stage.candies.filter(c => c.group === g).length > 1);
        expect(pairs.length).toBeGreaterThan(0);
        for (const pair of pairs) expect(stage.candies.filter(c => c.group === pair).map(c => c.scale)).toEqual([0, 1]);
        // All winning configurations require at least one pair to move.
        const loose = actions(stage).filter(g => !pairs.includes(g));
        for (let mask = 0; mask < 2 ** loose.length; mask++) {
          let state = stage.start;
          for (let j = 0; j < loose.length; j++) if (mask & (1 << j)) state = move(stage, state, loose[j]);
          expect(isWon(stage, state)).toBe(false);
        }
      }
    }
    expect([0, 10, 20].map(i => BALANCE_STAGES[i].par)).toEqual([1, 1, 1]);
    expect([9, 19, 29].map(i => BALANCE_STAGES[i].par)).toEqual([3, 4, 5]);
  });
});

describe('balance integration and save compatibility', () => {
  it('starts open, unlocks in order and resumes the next puzzle after clearing', () => {
    const world = worldById('balance')!, cards = stageCards(world);
    expect(world.unlockAfter).toBeUndefined();
    expect(isUnlocked(cards, new Set(), 0)).toBe(true);
    expect(isUnlocked(cards, new Set(), 1)).toBe(false);
    const id = BALANCE_STAGES[0].id;
    const progress = { schemaVersion: 2, stars: { [id]: 3 as const }, last: { world: 'balance', stage: id } };
    expect(isUnlocked(cards, new Set([id]), 1)).toBe(true);
    expect(continueTarget(progress)?.index).toBe(1);
    expect(continueTarget(progress)?.world.id).toBe('balance');
  });
  it('migrates archived stamps, retains other worlds and preserves better stars through save codes and tabs', async () => {
    const records: Record<string, string> = {
      'rail-tiles:progress': JSON.stringify({ schemaVersion: 2, stars: { 'last-run': 3, 'lab-v1-balance-1': 3 }, look: { body: 'red' }, last: { world: 'balance', stage: 'lab-v1-balance-1' } }),
      'rail-tiles-lab-v1': JSON.stringify({ completed: { 'lab-v1-balance-1': true, 'lab-v1-balance-30': true, 'lab-v1-balance-31': true, 'lab-v1-removed-1': true } }),
    };
    const storage = { getItem: (key: string) => records[key] ?? null, setItem: (key: string, value: string) => { records[key] = value; } };
    const progress = loadProgress(storage);
    expect(progress.stars).toEqual({ 'last-run': 3, 'lab-v1-balance-1': 3, 'lab-v1-balance-30': 1 });
    saveProgress(recordClear(progress, 'lab-v1-balance-1', 2), storage);
    expect(loadProgress(storage)).toEqual(progress);
    expect((await readCode(await exportCode(progress)))?.stars).toEqual(progress.stars);
    expect(absorbSaved(progress, { schemaVersion: 2, stars: { 'lab-v1-balance-1': 2 } }).stars).toEqual(progress.stars);
  });
});
