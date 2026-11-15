import { describe, expect, it } from 'vitest';
import { beeQuality } from '../../scripts/bee-quality';
import { WORLDS } from '../worlds';
import { CONCEPTS } from './catalog';
import { act, actions, DIRS, isWon, KINDS, neighbor, type Stage, type State } from './model';
import { solve } from './solver';
import { LAB_STAGES, stagesFor } from './stages';

function replay(stage: Stage, state: State, path: number[]): State {
  let value = [...state];
  for (const action of path) {
    const next = act(stage, value, action);
    expect(next, `${stage.id}: illegal action ${action} in ${value}`).not.toBeNull();
    value = next!;
  }
  return value;
}

describe('audited laboratory catalog', () => {
  it('offers exactly two different concepts with thirty directly selectable stages each', () => {
    expect(CONCEPTS.map(c => c.id)).toEqual([...KINDS]);
    expect(LAB_STAGES).toHaveLength(60);
    for (const kind of KINDS) {
      const stages = stagesFor(kind);
      expect(stages).toHaveLength(30);
      expect(stages.map(s => s.number)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
      expect(stages.map(s => s.id)).toEqual(stages.map(s => `lab-v1-${kind}-${s.number}`));
    }
  });

  it('registers both games as early official worlds with stable ids', () => {
    const shipped = new Set(WORLDS.flatMap(w => w.stages.map(s => s.id)));
    for (const kind of KINDS) expect(WORLDS.find(w => w.id === kind)?.unlockAfter).toBeUndefined();
    const ids = LAB_STAGES.map(s => s.id);
    expect(new Set(ids).size).toBe(60);
    for (const s of LAB_STAGES) {
      expect(shipped.has(s.id), s.id).toBe(true);
      for (const w of WORLDS) if (w.daily) expect(s.id.startsWith(w.daily.prefix)).toBe(false);
    }
  });

  it('starts unfinished and replays all 60 published answers without mutating stage data', () => {
    for (const s of LAB_STAGES) {
      const before = JSON.stringify(s);
      expect(isWon(s, s.start), s.id).toBe(false);
      expect(s.solution.length, s.id).toBeGreaterThan(0);
      expect(s.par, s.id).toBe(s.solution.length);
      expect(isWon(s, replay(s, s.start, s.solution)), s.id).toBe(true);
      expect(JSON.stringify(s), s.id).toBe(before);
    }
  });

  it('solves the actual intermediate state at each chapter finale', () => {
    for (const s of LAB_STAGES.filter(s => s.number % 10 === 0)) {
      const halfway = replay(s, s.start, s.solution.slice(0, Math.floor(s.solution.length / 2)));
      const result = solve(s, halfway, 160_000);
      expect(result.exhausted, s.id).toBe(false);
      expect(result.path, s.id).not.toBeNull();
      expect(isWon(s, replay(s, halfway, result.path!)), s.id).toBe(true);
    }
  }, 20_000);

  it('can give a bounded current-state hint or a definite dead end after an alternate first move', () => {
    for (const s of LAB_STAGES) {
      // Exercise a player choice rather than only following the stored answer.
      const candidates = actions(s, s.start).filter(a => a !== s.solution[0]);
      const alternative = candidates.map(a => act(s, s.start, a)).find((v): v is State => v !== null);
      if (!alternative) continue;
      const result = solve(s, alternative, 160_000);
      expect(result.exhausted, s.id).toBe(false);
      if (result.path) expect(isWon(s, replay(s, alternative, result.path)), s.id).toBe(true);
    }
  }, 20_000);
});

describe('age-appropriate construction constraints', () => {

  it('uses full-size dense boards and a measured decision curve rather than corridor length', () => {
    for (const s of stagesFor('bee')) {
      expect(s.cols, s.id).toBe(5);
      expect(s.rows, s.id).toBe(s.number <= 20 ? 5 : 6);
      expect(s.par, s.id).toBeGreaterThanOrEqual(s.number > 20 ? 25 : 16);
      const quality = beeQuality(s);
      expect(quality.unknown, s.id).toBe(0);
      if (s.number <= 3) {
        expect(quality.choices, s.id).toBe(0);
        expect(quality.wins, s.id).toBe(quality.trials);
      } else {
        const min = s.number <= 10 ? 3 + Math.floor((s.number - 4) / 2)
          : s.number <= 20 ? 7 + Math.floor((s.number - 11) / 4) : 10 + Math.floor((s.number - 21) / 4);
        expect(quality.decisions, s.id).toBeGreaterThanOrEqual(min);
        expect(quality.decisions, s.id).toBeLessThanOrEqual(min + (s.number <= 20 ? 1 : 2));
        expect(quality.randomRate, s.id).toBeLessThanOrEqual(s.number <= 10 ? .20 / (1 + (s.number - 4) / 2) : s.number <= 20 ? .015 : .002);
      }
    }
  });

  it('requires a genuine choice in later flower paths and saves the hive for last', () => {
    for (const s of stagesFor('bee')) {
      const end = replay(s, s.start, s.solution);
      expect(new Set(end).size).toBe(end.length);
      expect(end.at(-1)).toBe(s.goal[0]);
      expect(end.length).toBe(s.terrain!.filter(Boolean).length);
      if (s.number > 10) {
        const branches = s.terrain!.flatMap((v, at) => v ? [at] : []).filter(at => DIRS.filter((_, d) => {
          const n = neighbor(s, at, d); return n >= 0 && s.terrain![n];
        }).length >= 3).length;
        expect(branches, s.id).toBeGreaterThanOrEqual(s.number > 20 ? 7 : 4);
      }
    }
  });

});

describe('retained puzzle curation', () => {
  it('keeps all sixty boards distinct and increases the challenge across chapters', () => {
    const signatures = LAB_STAGES.map(s => JSON.stringify([s.kind, s.cols, s.rows, s.start, s.goal, s.terrain, s.terrain2]));
    expect(new Set(signatures).size).toBe(60);
    for (const kind of KINDS) {
      const stages = stagesFor(kind);
      const averages = [0, 1, 2].map(ch => stages.slice(ch * 10, ch * 10 + 10).reduce((sum, s) => sum + s.par, 0) / 10);
      expect(averages[1]).toBeGreaterThan(averages[0]);
      expect(averages[2]).toBeGreaterThan(averages[1]);
    }
  });
  it('retains shortest rabbit answers and no forward dead ends in any published rabbit board', async () => {
    const { explore } = await import('./reachability');
    const { breadthFirst } = await import('./solver');
    for (const s of stagesFor('twins')) {
      expect(breadthFirst(s, s.start).path?.length, s.id).toBe(s.par);
      const graph = explore(s);
      expect(graph.truncated).toBe(false);
      expect(graph.states.size, s.id).toBe(graph.toWin.size);
    }
  });
});
