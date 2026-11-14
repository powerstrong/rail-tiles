import { describe, expect, it } from 'vitest';
import { WORLDS } from '../worlds';
import { CONCEPTS } from './catalog';
import { act, actions, connected, crossing, degrees, DIRS, isWon, KINDS, neighbor, type Stage, type State } from './model';
import { breadthFirst, bridgeSolutions, cloudSolutions, runs, solve, solveLights, solveMosaic } from './solver';
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
const average = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
function progressionMetric(s: Stage): number {
  switch (s.kind) {
    case 'balance': return s.weights!.length;
    case 'bridges': return s.islands!.length;
    case 'cloud': return s.cols * s.rows;
    default: return s.par;
  }
}

describe('audited laboratory catalog', () => {
  it('offers exactly ten different concepts with thirty directly selectable stages each', () => {
    expect(CONCEPTS.map(c => c.id)).toEqual([...KINDS]);
    expect(LAB_STAGES).toHaveLength(300);
    for (const kind of KINDS) {
      const stages = stagesFor(kind);
      expect(stages).toHaveLength(30);
      expect(stages.map(s => s.number)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
      expect(stages.map(s => s.id)).toEqual(stages.map(s => `lab-v1-${kind}-${s.number}`));
    }
  });

  it('keeps experiment identifiers away from shipped stars and daily streaks', () => {
    const shipped = new Set(WORLDS.flatMap(w => w.stages.map(s => s.id)));
    const ids = LAB_STAGES.map(s => s.id);
    expect(new Set(ids).size).toBe(300);
    for (const s of LAB_STAGES) {
      expect(shipped.has(s.id), s.id).toBe(false);
      for (const w of WORLDS) if (w.daily) expect(s.id.startsWith(w.daily.prefix)).toBe(false);
    }
  });

  it('contains different playable boards rather than relabeled copies', () => {
    const signatures = LAB_STAGES.map(s => JSON.stringify([s.kind, s.cols, s.rows, s.start, s.kind === 'balance' ? [] : s.goal, s.terrain, s.terrain2, s.weights, s.target, s.islands, s.edges]));
    expect(new Set(signatures).size).toBe(300);
    // Reordering the same weights does not create a new arithmetic puzzle.
    const weights = stagesFor('balance').map(s => JSON.stringify([[...s.weights!].sort((a, b) => a - b), s.target]));
    expect(new Set(weights).size).toBe(30);
  });

  it('starts unfinished and replays all 300 published answers without mutating stage data', () => {
    for (const s of LAB_STAGES) {
      const before = JSON.stringify(s);
      expect(isWon(s, s.start), s.id).toBe(false);
      expect(s.solution.length, s.id).toBeGreaterThan(0);
      expect(s.par, s.id).toBe(s.solution.length);
      expect(isWon(s, replay(s, s.start, s.solution)), s.id).toBe(true);
      expect(JSON.stringify(s), s.id).toBe(before);
    }
  });

  it('has a gentler first chapter and a larger final challenge in every concept', () => {
    for (const kind of KINDS) {
      const metrics = stagesFor(kind).map(progressionMetric);
      const chapter = [0, 1, 2].map(c => average(metrics.slice(c * 10, c * 10 + 10)));
      expect(chapter[1], kind).toBeGreaterThan(chapter[0]);
      expect(chapter[2], kind).toBeGreaterThan(chapter[1]);
      expect(metrics[29], kind).toBeGreaterThan(metrics[0]);
    }
    for (const kind of ['acorn', 'twins', 'lights', 'moon', 'mosaic'] as const) expect(stagesFor(kind)[0].par, kind).toBe(1);
    expect(stagesFor('coral')[0].par).toBe(2);
    expect(stagesFor('balance')[0].weights).toEqual([1, 1, 2]);
  });

  it('retains independently discoverable shortest solutions for movement and color puzzles', () => {
    for (const s of LAB_STAGES) {
      if (!['acorn', 'twins', 'lights', 'coral', 'mosaic'].includes(s.kind)) continue;
      const result = s.kind === 'lights' ? { path: solveLights(s, s.start), exhausted: false }
        : s.kind === 'mosaic' ? solveMosaic(s, s.start, 160_000)
          : breadthFirst(s, s.start, 160_000);
      expect(result.exhausted, s.id).toBe(false);
      expect(result.path?.length, s.id).toBe(s.par);
      expect(isWon(s, replay(s, s.start, result.path!)), s.id).toBe(true);
    }
  }, 20_000);

  it('solves the actual intermediate state at each chapter finale', () => {
    for (const s of LAB_STAGES.filter(s => s.number % 10 === 0)) {
      const halfway = replay(s, s.start, s.solution.slice(0, Math.floor(s.solution.length / 2)));
      const result = solve(s, halfway, 160_000);
      expect(result.exhausted, s.id).toBe(false);
      expect(result.path, s.id).not.toBeNull();
      expect(isWon(s, replay(s, halfway, result.path!)), s.id).toBe(true);
    }
  }, 20_000);

  it('repairs an incorrect embroidery mark rather than trusting initial-state hints', () => {
    for (const s of stagesFor('cloud')) {
      const state = s.goal.map(n => n ? 1 : 2);
      const white = s.goal.indexOf(0), filled = s.goal.indexOf(1);
      state[white] = 1;
      state[filled] = 2;
      const result = solve(s, state);
      expect(result.path).toContain(white * 3 + 2);
      expect(result.path).toContain(filled * 3 + 1);
      expect(isWon(s, replay(s, state, result.path!)), s.id).toBe(true);
    }
  });

  it('corrects wrong and crossing-blocking bridges before building the intended network', () => {
    for (const s of stagesFor('bridges')) {
      const state = [...s.start];
      // A zero in the answer is a tempting false connection. With no zero, use a wrong count.
      const edge = s.goal.includes(0) ? s.goal.indexOf(0) : 0;
      state[edge] = s.goal[edge] === 1 ? 2 : 1;
      const result = solve(s, state);
      expect(result.path).not.toBeNull();
      expect(isWon(s, replay(s, state, result.path!)), s.id).toBe(true);
    }
  });

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
  it('keeps arithmetic small and uses every candy in a valid split', () => {
    for (const s of stagesFor('balance')) {
      expect(s.weights!.length).toBeGreaterThanOrEqual(3);
      expect(s.weights!.length).toBeLessThanOrEqual(7);
      expect(s.weights!.every(n => n >= 1 && n <= 9), s.id).toBe(true);
      expect(s.weights!.reduce((a, b) => a + b, 0), s.id).toBeLessThanOrEqual(45);
      expect(s.target, s.id).toBeGreaterThanOrEqual(0);
      expect(s.target, s.id).toBeLessThanOrEqual(10);
      const end = replay(s, s.start, s.solution);
      expect(end.every(v => v === 1 || v === 2)).toBe(true);
      expect(end).toContain(1);
      expect(end).toContain(2);
    }
  });

  it('puts all acorns and homes on accessible floor with separate actors', () => {
    for (const s of stagesFor('acorn')) {
      expect(new Set(s.start).size, s.id).toBe(s.start.length);
      expect(s.start.every(at => s.terrain![at] === 1), s.id).toBe(true);
      expect(s.goal.every(at => s.terrain![at] === 1), s.id).toBe(true);
      expect(s.goal.length).toBe(s.start.length - 1);
      expect(s.start.length - 1).toBeLessThanOrEqual(3);
    }
  });

  it('gives nonograms exactly one answer from their clues alone', () => {
    for (const s of stagesFor('cloud')) {
      expect(cloudSolutions(s, 2), s.id).toEqual([s.goal]);
      expect(s.cols).toBeLessThanOrEqual(6);
      for (let y = 0; y < s.rows; y++) expect(runs(s.goal.slice(y * s.cols, (y + 1) * s.cols)).length).toBeLessThanOrEqual(3);
    }
  });

  it('gives bridges one connected, noncrossing answer that respects every island number', () => {
    for (const s of stagesFor('bridges')) {
      expect(bridgeSolutions(s, 2), s.id).toEqual([s.goal]);
      expect(connected(s, s.goal), s.id).toBe(true);
      expect(degrees(s, s.goal), s.id).toEqual(s.islands!.map(i => i.need));
      expect(s.islands!.every(i => i.need > 0 && i.need <= 6)).toBe(true);
      for (let e = 0; e < s.goal.length; e++) for (let f = e + 1; f < s.goal.length; f++) {
        if (s.goal[e] && s.goal[f]) expect(crossing(s, e, f), `${s.id}: ${e} / ${f}`).toBe(false);
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

  it('removes exactly one moonstone on each jump and ends on the star', () => {
    for (const s of stagesFor('moon')) {
      let v = s.start;
      for (const a of s.solution) {
        const next = act(s, v, a)!;
        expect(next.reduce((x, y) => x + y, 0)).toBe(v.reduce((x, y) => x + y, 0) - 1);
        v = next;
      }
      expect(v[s.goal[0]]).toBe(1);
      expect(s.start.reduce((x, y) => x + y, 0)).toBe(s.par + 1);
    }
  });
});
