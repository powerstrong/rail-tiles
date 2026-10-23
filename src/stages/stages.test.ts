import { describe, expect, it } from 'vitest';
import type { Rail } from '../engine/rail';
import { simulate } from '../engine/simulate';
import { solve } from '../engine/solver';
import { cellKey } from '../engine/stage';
import { STAGES } from './stages';

/**
 * Pinned [routes that earn ★★★ (use exactly par rails), all winning routes] per stage.
 * A change means a stage got easier or harder — update deliberately, never just to
 * make the test pass. Apart from the two tutorials, every stage must also allow
 * sloppier clears, so the star rating means something.
 */
const EXPECTED: Record<string, [optimal: number, total: number]> = {
  'first-line': [1, 1],
  'first-turn': [1, 4],
  'around-the-hill': [1, 3],
  'river-crossing': [2, 4],
  'make-it-last': [2, 4],
  'first-passenger': [2, 4],
  'forest-stop': [2, 7],
  'two-passengers': [1, 13],
  'the-way-back': [1, 9],
  'last-run': [2, 5],
  'tunnel-intro': [1, 1],
  'around-the-back': [1, 7],
  'two-tunnels': [1, 7],
  'under-the-river': [2, 4],
  'first-crossing': [1, 11],
  'first-switch': [1, 6],
  'wrong-way-switch': [1, 5],
  'figure-eight': [2, 5],
  'crossing-return': [1, 39],
  'grand-tour': [1, 6],
  'under-the-water': [1, 3],
  'tunnel-passenger': [1, 4],
  'two-ridges': [2, 8],
  'river-and-ridge': [1, 7],
  'there-and-back': [1, 4],
  'hidden-shortcut': [2, 4],
  'loop-back': [1, 8],
  'switch-down': [1, 7],
  'loop-and-cross': [1, 12],
  'both-sides': [1, 8],
  'first-delivery': [1, 4],
  'switch-delivery': [1, 11],
  'tunnel-delivery': [1, 7],
  'pickup-first': [1, 9],
  'two-bridges': [1, 7],
  'crossing-delivery': [1, 9],
  'zigzag-homes': [2, 16],
  'deliver-and-ride': [1, 10],
  'two-homes': [1, 13],
  'last-delivery': [1, 4],
};
const TUTORIALS = new Set(['first-line', 'tunnel-intro']);

describe('stages', () => {
  it('have unique ids', () => {
    expect(new Set(STAGES.map((s) => s.id)).size).toBe(STAGES.length);
  });

  for (const stage of STAGES) {
    describe(`${stage.number}. ${stage.id}`, () => {
      it('listed solution wins within the inventory', () => {
        const placed: Record<string, Rail> = {};
        const used = { straight: 0, curve: 0, cross: 0 };
        for (const p of stage.solution) {
          placed[cellKey(p.x, p.y)] = p.rail;
          used[p.rail.kind] += 1;
        }
        expect(used.straight).toBeLessThanOrEqual(stage.inventory.straight);
        expect(used.curve).toBeLessThanOrEqual(stage.inventory.curve);
        expect(simulate(stage, placed).success).toBe(true);
      });

      it('has the pinned routes; its listed solution is a shortest one (par); sloppier clears exist', () => {
        const res = solve(stage, 2000, true);
        expect(res.minRails).toBe(stage.par);
        const optimal = (res.routes ?? []).filter((r) => r.length === stage.par).length;
        expect([optimal, res.count]).toEqual(EXPECTED[stage.id]);
        if (!TUTORIALS.has(stage.id)) expect(res.count).toBeGreaterThan(optimal);
      });
    });
  }
});
