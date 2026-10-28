import { describe, expect, it } from 'vitest';
import { auditLava } from './audit';
import { flow, hintLava, placeable, raceStart, raceStep, solveLava, solveRace } from './lava';
import { parseVolcanoStage } from './model';
import { VOLCANO_CHAPTERS, VOLCANO_STAGES } from './stages';

const make = (map: string[], extra: Partial<{ race: boolean }> = {}) => parseVolcanoStage({ id: 't', title: '', tip: '', map, par: 0, solution: [], ...extra }, 0);

describe('lava rules', () => {
  it('floods grass in four directions and burns houses it reaches', () => {
    const st = make(['V . . H', 'R R R R', '. . . .', '. . . .']);
    const f = flow(st, new Set());
    expect(f.burned).toEqual([3]);
    expect(f.time[3]).toBe(3);
    expect(f.time[8]).toBe(-1);
    expect(flow(st, new Set([2])).won).toBe(true);
  });

  it('small craters only spill as many cells as their number', () => {
    const st = make(['3 . . H', 'R R R .', '. . . .', '. . . .']);
    expect(flow(st, new Set()).burned).toEqual([3]);
    const far = make(['2 . . H', 'R R R .', '. . . .', '. . . .']);
    expect(flow(far, new Set()).won).toBe(true);
  });

  it('eggs must be reached; a stone that cools an egg loses', () => {
    const st = make(['V . E .', '. R R H', '. R R R', '. . . R']);
    const s = solveLava(st);
    expect(s.par).toBe(1);
    expect(s.solutions).toEqual([[3]]);
    // Right next to the crater the ground is too hot for a stone.
    expect(placeable(st, 1)).toBe(false);
    expect(flow(st, new Set([1])).won).toBe(false);
  });

  it('hints lift a wrong stone first, then point at the next right one', () => {
    const solutions = [[3, 7]];
    expect(hintLava(solutions, new Set([5]))).toEqual({ cell: 5, remove: true });
    expect(hintLava(solutions, new Set([3]))).toEqual({ cell: 7, remove: false });
  });

  it('race: each stone lets the lava spread one step', () => {
    const st = make(['V . . . H', 'R R R R .', '. . . . .', '. . . . .'], { race: true });
    const r = raceStep(st, raceStart(st), 3)!;
    expect([...r.state.lava].sort()).toEqual([0, 1]);
    expect(r.safe).toBe(true);
    expect(solveRace(st).par).toBe(1);
  });
});

describe('volcano stages', () => {
  it('have unique v- ids', () => {
    expect(new Set(VOLCANO_STAGES.map((s) => s.id)).size).toBe(VOLCANO_STAGES.length);
    for (const s of VOLCANO_STAGES) expect(s.id.startsWith('v-')).toBe(true);
  });

  it('are three chapters of ten: stage 5 a race, stage 10 the hardest, the boss', () => {
    expect(VOLCANO_CHAPTERS.map((c) => c.count)).toEqual([10, 10, 10]);
    for (const ch of VOLCANO_CHAPTERS) {
      const list = VOLCANO_STAGES.slice(ch.start, ch.start + ch.count);
      list.forEach((s, k) => expect(!!s.race).toBe(k === 4));
      expect(list[9].boss).toBe(true);
      const scores = list.filter((s) => !s.race).map((s) => auditLava(s)!.score);
      expect(Math.max(...scores)).toBe(scores[scores.length - 1]);
    }
  });

  for (const stage of VOLCANO_STAGES) {
    it(`${stage.label} ${stage.id}: the listed stones win, par is the true minimum, one ★★★ answer`, () => {
      expect(stage.solution.length).toBe(stage.par);
      if (stage.race) {
        let s = raceStart(stage);
        let last = null;
        for (const c of stage.solution) {
          last = raceStep(stage, s, c)!;
          expect(last).not.toBeNull();
          expect(last.burned).toBe(false);
          s = last.state;
        }
        expect(last!.safe).toBe(true);
        expect(solveRace(stage).par).toBe(stage.par);
        expect(stage.eggs).toEqual([]);
        return;
      }
      expect(flow(stage, new Set()).won).toBe(false);
      expect(flow(stage, new Set(stage.solution)).won).toBe(true);
      const r = solveLava(stage);
      expect([r.par, r.optimal]).toEqual([stage.par, 1]);
    });
  }
});
