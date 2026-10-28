import { describe, expect, it } from 'vitest';
import { audit, difficultyScore } from '../../scripts/audit';
import type { Rail } from '../engine/rail';
import { simulate } from '../engine/simulate';
import { solve } from '../engine/solver';
import { cellAt, cellKey } from '../engine/stage';
import { S2_CHAPTERS, S2_STAGES } from './season2';

/** The gimmick each chapter is about: its ★★★ route must drive through one. */
const CHAPTER_GIMMICK = ['gate', 'drawbridge', 'tower', 'turntable', 'wagon'] as const;

describe('train world season 2', () => {
  it('has unique t2- ids, five chapters of ten, a one-departure bonus at 5 and a boss at 10', () => {
    expect(new Set(S2_STAGES.map((s) => s.id)).size).toBe(S2_STAGES.length);
    for (const s of S2_STAGES) expect(s.id.startsWith('t2-')).toBe(true);
    expect(S2_CHAPTERS.map((c) => c.count)).toEqual([10, 10, 10, 10, 10]);
    for (const ch of S2_CHAPTERS) {
      const list = S2_STAGES.slice(ch.start, ch.start + ch.count);
      list.forEach((s, k) => {
        expect(!!s.oneShot, s.id).toBe(k === 4);
        expect(!!s.boss, s.id).toBe(k === 9);
      });
    }
  });

  S2_CHAPTERS.forEach((ch, c) => {
    const list = S2_STAGES.slice(ch.start, ch.start + ch.count);
    for (const stage of list) {
      it(`${stage.label} ${stage.id}: the solution wins, par is the minimum, the stars mean something, the gimmick is used`, () => {
        const placed: Record<string, Rail> = {};
        const used = { straight: 0, curve: 0, cross: 0 };
        for (const p of stage.solution) {
          placed[cellKey(p.x, p.y)] = p.rail;
          used[p.rail.kind] += 1;
        }
        expect(used.straight).toBeLessThanOrEqual(stage.inventory.straight);
        expect(used.curve).toBeLessThanOrEqual(stage.inventory.curve);
        const trace = simulate(stage, placed);
        expect(trace.success).toBe(true);
        const res = solve(stage, 2000, true);
        expect(res.minRails).toBe(stage.par);
        const optimal = (res.routes ?? []).filter((r) => r.length === stage.par).length;
        expect(optimal).toBeGreaterThanOrEqual(1);
        expect(optimal).toBeLessThanOrEqual(2);
        expect(res.count).toBeGreaterThan(optimal);
        const gimmick = CHAPTER_GIMMICK[c];
        const driven = trace.steps.flatMap((s) => (s.kind === 'rail' ? [cellAt(stage, s.x, s.y)] : []));
        expect(
          driven.some((cell) => (gimmick === 'drawbridge' || gimmick === 'turntable' ? cell?.type === gimmick : cell?.type === 'empty' && cell.mark?.kind === gimmick)),
        ).toBe(true);
      });
    }

    it(`chapter ${ch.number} rises smoothly to its boss, the hardest stage`, () => {
      const scores = list.map((s) => difficultyScore(audit(s)));
      expect(Math.max(...scores)).toBe(scores[9]);
      scores.forEach((v, k) => {
        if (k === 0) return;
        expect(v - scores[k - 1], `${list[k].label}`).toBeLessThanOrEqual(k === 9 ? 10 : 8);
        expect(scores[k - 1] - v, `${list[k].label}`).toBeLessThanOrEqual(4);
      });
    }, 120_000);
  });
});
