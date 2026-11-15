import { describe, it, expect } from 'vitest';
import proofs from './proofs.generated.json';
import { CLOUD_STAGES } from './stages';
import { cluesOf, countSolutions, isComplete, lines, logicalHint, patterns, solveByLines } from './model';
import { loadProgress, recordClear, saveProgress } from '../storage';
import { starsFor } from '../engine/stars';
import { worldById } from '../worlds';
import { continueTarget } from '../continue';
import { isUnlocked } from '../ui/StageSelect';

describe('cloud line logic', () => {
  it('separates groups and explicit emptiness from uncertainty', () => {
    expect(patterns(4, [2, 1])).toEqual([[1, 1, 0, 1]]);
    expect(patterns(4, [2, 1], [0, 0, 1, 0])).toEqual([]);
    expect(patterns(3, [])).toEqual([[0, 0, 0]]);
    expect(patterns(5, [3])).toHaveLength(3);
    const hint = logicalHint({ rows: [[3]], cols: [[], [1], [1], [1], []] }, Array(5).fill(0))!;
    expect(hint.cell).toBe(2); expect(hint.value).toBe(1);
    expect(hint.reason).toContain('3가지');
  });
  it('never guesses when no line forces a cell, even if there might be a solution', () => {
    const clues = { rows: [[1], [1]], cols: [[1], [1]] };
    expect(logicalHint(clues, [0, 0, 0, 0])).toBeNull();
    expect(solveByLines(clues)).toBeNull(); expect(countSolutions(clues)).toBe(2);
    expect(logicalHint(clues, [1, 1, 0, 0])).toBeNull();
  });
  it('requires × for empty cells and derives completion from clues', () => {
    const clues = cluesOf([1, 0], 1, 2);
    expect(isComplete(clues, [1, 0])).toBe(false);
    expect(isComplete(clues, [1, 2])).toBe(true);
    expect(isComplete(clues, [1, 1])).toBe(false);
  });
});
for (const stage of CLOUD_STAGES) describe(`cloud ${stage.number}: ${stage.title}`, () => {
  it('has exactly one solution, independently enumerated by rows and columns', () => {
    expect(countSolutions(stage.clues)).toBe(1);
  });
  it('replays the generated solution with a valid one-line proof for every mark', () => {
    const state = Array(stage.rows * stage.cols).fill(0);
    const proof = proofs.stages.find(p => p.id === stage.id)!;
    expect(proof.solution).toHaveLength(stage.par);
    for (const step of proof.solution) {
      const line = lines(stage.clues, state).find(l => l.axis === step.axis && l.index === step.line)!;
      const k = line.cells.indexOf(step.cell);
      expect(k).toBeGreaterThanOrEqual(0);
      expect(line.candidates.length).toBe(step.candidates);
      expect(line.candidates.every(p => p[k] === (step.value === 1 ? 1 : 0))).toBe(true);
      expect(state[step.cell]).toBe(0); state[step.cell] = step.value;
    }
    expect(isComplete(stage.clues, state)).toBe(true);
    expect(state.map(v => v === 1 ? 1 : 0)).toEqual(stage.goal);
  });
  it('also finishes by repeatedly following the actual hint selector, with no artwork access', () => {
    const trace = solveByLines(stage.clues)!;
    expect(trace).toHaveLength(stage.par);
    const state = Array(stage.par).fill(0);
    for (const step of trace) { state[step.cell] = step.value; expect(step.reason.length).toBeGreaterThan(20); }
    expect(isComplete(stage.clues, state)).toBe(true);
  });
});
it('opens immediately and keeps legacy stamps, stars, sequential unlock and continue', () => {
  const w = worldById('cloud')!;
  expect(w.unlockAfter).toBeUndefined(); expect(w.stages).toHaveLength(30);
  const values = new Map<string, string>();
  const storage = { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); } };
  values.set('rail-tiles-lab-v1', JSON.stringify({ schemaVersion: 1, completed: { 'lab-v1-cloud-11': true } }));
  let progress = loadProgress(storage);
  expect(progress.stars['lab-v1-cloud-11']).toBe(1);
  progress = { ...recordClear(progress, CLOUD_STAGES[0].id, 3), last: { world: 'cloud', stage: CLOUD_STAGES[0].id } };
  saveProgress(progress, storage);
  expect(loadProgress(storage).stars[CLOUD_STAGES[0].id]).toBe(3);
  expect(continueTarget(progress)?.world.id).toBe('cloud');
  expect(continueTarget(progress)?.index).toBe(1);
  expect(isUnlocked(w.stages, new Set([CLOUD_STAGES[0].id]), 1)).toBe(true);
  expect(isUnlocked(w.stages, new Set(), 1)).toBe(false);
  expect(starsFor(36, 36, true)).toBe(2);
  expect(starsFor(36, 36, false)).toBe(3);
  expect(starsFor(39, 36, false)).toBe(1);
});
