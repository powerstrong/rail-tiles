import { describe, expect, it } from 'vitest';
import type { Rail } from '../engine/rail';
import { simulate } from '../engine/simulate';
import { solve } from '../engine/solver';
import { cellKey } from '../engine/stage';
import { STAGES } from './stages';

/**
 * Pinned number of winning routes per stage. A change here means a stage got
 * easier or harder — update deliberately, never just to make the test pass.
 */
const EXPECTED_ROUTES: Record<string, number> = {
  'first-line': 1,
  'first-turn': 1,
  'around-the-hill': 1,
  'river-crossing': 2,
  'make-it-last': 2,
  'first-passenger': 2,
  'forest-stop': 1,
  'two-passengers': 3,
  'the-way-back': 1,
  'last-run': 1,
  'tunnel-intro': 1,
  'around-the-back': 3,
  'two-tunnels': 1,
  'under-the-river': 2,
};

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

      it('has the expected number of routes, and its listed solution is a shortest one (par)', () => {
        const res = solve(stage);
        expect(res.count).toBe(EXPECTED_ROUTES[stage.id]);
        expect(res.minRails).toBe(stage.par);
      });
    });
  }
});
