import { describe, expect, it } from 'vitest';
import type { Rail } from '../engine/rail';
import { simulate } from '../engine/simulate';
import { solve } from '../engine/solver';
import { cellAt, cellKey } from '../engine/stage';
import { S2_CHAPTERS, S2_STAGES } from './season2';
const CHAPTER_GIMMICK = ['gate', 'drawbridge', 'tower', 'turntable', 'wagon'] as const;

describe('Wildflower optional device routes', () => {
  it('keeps twenty stable t2- ids, four stages per device group, and the existing unlock gate', () => {
    expect(S2_STAGES).toHaveLength(20);
    expect(new Set(S2_STAGES.map(s => s.id)).size).toBe(20);
    expect(S2_CHAPTERS.map(c => c.count)).toEqual([4, 4, 4, 4, 4]);
    expect(S2_STAGES[3].id).toBe('t2-boss-1');
    expect(S2_STAGES.at(-1)!.id).toBe('t2-final-boss');
    expect(S2_STAGES.some(s => s.id === 't2-busy-crossing' || s.id === 't2-two-colors')).toBe(false);
    for (const s of S2_STAGES) { expect(s.id.startsWith('t2-')).toBe(true); expect(s.oneShot).toBeFalsy(); }
  });
  for (const [chapter, ch] of S2_CHAPTERS.entries()) for (const stage of S2_STAGES.slice(ch.start, ch.start + ch.count)) {
    it(`${stage.id}: every route is enumerated, answers are legal, all shortest routes use the taught device`, () => {
      const placed: Record<string, Rail> = {};
      const used = { straight: 0, curve: 0, cross: 0 };
      for (const p of stage.solution) { placed[cellKey(p.x, p.y)] = p.rail; used[p.rail.kind]++; }
      expect(used.straight).toBeLessThanOrEqual(stage.inventory.straight);
      expect(used.curve).toBeLessThanOrEqual(stage.inventory.curve);
      expect(simulate(stage, placed).success).toBe(true);
      const result = solve(stage, 2000, true);
      expect(result.truncated).toBe(false);
      expect(result.minRails).toBe(stage.par);
      const shortest = result.routes!.filter(r => r.length === stage.par);
      expect(shortest.length).toBeGreaterThanOrEqual(1);
      expect(shortest.length).toBeLessThanOrEqual(2);
      expect(result.count).toBeGreaterThan(shortest.length);
      for (const route of result.routes!) {
        const trace = simulate(stage, Object.fromEntries(route.map(p => [cellKey(p.x, p.y), p.rail])));
        expect(trace.success).toBe(true);
        const driven = trace.steps.flatMap(s => s.kind === 'rail' ? [cellAt(stage, s.x, s.y)] : []);
        const gimmick = CHAPTER_GIMMICK[chapter];
        if (route.length === stage.par) expect(driven.some(c => c?.type === gimmick || (c?.type === 'empty' && c.mark?.kind === gimmick))).toBe(true);
        // The preserved gate really requires both colors, not merely a two-color decoration.
        if (stage.id === 't2-boss-1') for (const color of [1, 2]) {
          expect(driven.some(c => c?.type === 'empty' && c.mark?.kind === 'gate' && c.mark.color === color)).toBe(true);
        }
      }
      expect(stage.boss).toBe(S2_STAGES[ch.start + ch.count - 1].id === stage.id);
    });
  }
});
