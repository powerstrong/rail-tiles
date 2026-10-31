import { describe, expect, it } from 'vitest';
import { audit, difficultyScore } from '../scripts/audit';
import { auditDepot } from './depot/audit';
import { DEPOT_INTROS } from './depot/intros';
import { DEPOT_CHAPTERS, DEPOT_STAGES } from './depot/stages';
import { auditLaser } from './machine/audit';
import { MACHINE_INTROS } from './machine/intros';
import { MACHINE_CHAPTERS, MACHINE_STAGES } from './machine/stages';
import { auditIce } from './penguin/audit';
import { ICE_INTROS } from './penguin/intros';
import { ICE_CHAPTERS, ICE_STAGES } from './penguin/stages';
import { CHAPTERS, type Chapter, STAGES } from './stages/stages';
import { auditLava } from './volcano/audit';
import { VOLCANO_INTROS } from './volcano/intros';
import { VOLCANO_CHAPTERS, VOLCANO_STAGES } from './volcano/stages';

/** Largest step up from one stage to the next, and into the boss. */
const MAX_STEP = 8;
const MAX_BOSS_STEP = 10;
/** A stage may be a little easier than the one before (a breather, a new mechanic). */
const MAX_DIP = 4;

interface Row {
  id: string;
  label?: string;
  par: number;
  score: number;
}

interface Break {
  why: string;
  /** How big the jump, the drop, or the gap above the boss is (score points). */
  size: number;
}

/**
 * Where a chapter breaks the curve rules, keyed by stage label ("STAGE 1-7"), or by
 * "<boss label> boss" when an earlier stage is harder than the boss.
 */
function curveBreaks(rows: Row[]): Map<string, Break> {
  const out = new Map<string, Break>();
  rows.forEach((r, k) => {
    if (k === 0) return;
    const prev = rows[k - 1];
    const step = r.score - prev.score;
    if (step > (k === rows.length - 1 ? MAX_BOSS_STEP : MAX_STEP)) out.set(`${r.label}`, { why: `jumps ${step.toFixed(2)} over ${prev.label}`, size: step });
    if (-step > MAX_DIP) out.set(`${r.label}`, { why: `drops ${(-step).toFixed(2)} below ${prev.label}`, size: -step });
  });
  const boss = rows[rows.length - 1];
  const top = rows.reduce((a, b) => (b.score > a.score ? b : a));
  if (boss && top.score > boss.score) out.set(`${boss.label} boss`, { why: `is ${(top.score - boss.score).toFixed(2)} easier than ${top.label}`, size: top.score - boss.score });
  return out;
}

interface CurveOptions<S> {
  /** Stages on their own scale (bonus races). */
  skip?: (s: S) => boolean;
  /**
   * Breaks that predate the rules (keys as in curveBreaks), each with the largest size it may
   * have. A new break, a listed one that grows, or a listed one that is gone all fail, so the
   * list only ever shrinks.
   */
  known?: Record<string, number>;
}

function curve<S extends { id: string; label?: string; par: number }>(
  name: string,
  stages: S[],
  chapters: Chapter[],
  score: (s: S) => number,
  intros: Record<string, unknown>,
  { skip = () => false, known = {} }: CurveOptions<S> = {},
) {
  describe(`${name} difficulty curve`, () => {
    for (const ch of chapters) {
      let cache: Row[] | undefined;
      const rows = () =>
        (cache ??= stages
          .slice(ch.start, ch.start + ch.count)
          .filter((s) => !skip(s))
          .map((s) => ({ id: s.id, label: s.label, par: s.par, score: score(s) })));

      it(`chapter ${ch.number} rises smoothly to its boss, the hardest stage`, () => {
        const breaks = curveBreaks(rows());
        const worse = [...breaks].filter(([key, b]) => !(key in known) || b.size > known[key]).map(([key, b]) => `${key} ${b.why}`);
        expect(worse).toEqual([]);
        const labels = new Set(rows().flatMap((r) => [`${r.label}`, `${r.label} boss`]));
        const fixed = Object.keys(known).filter((key) => labels.has(key) && !breaks.has(key));
        expect(fixed, 'fixed: remove from the known list').toEqual([]);
      }, 120_000);

      it(`chapter ${ch.number}: a stage with a new mechanic is not much longer than the one before`, () => {
        rows().forEach((r, k) => {
          if (k > 0 && r.id in intros) expect(r.par, `${r.label} par`).toBeLessThanOrEqual(rows()[k - 1].par + 1);
        });
      }, 120_000);
    }
  });
}

curve('penguin', ICE_STAGES, ICE_CHAPTERS, (s) => auditIce(s)!.score, ICE_INTROS);
curve('machine', MACHINE_STAGES, MACHINE_CHAPTERS, (s) => auditLaser(s)!.score, MACHINE_INTROS);
// Race stages are bonus rounds on their own scale.
curve('volcano', VOLCANO_STAGES, VOLCANO_CHAPTERS, (s) => auditLava(s)!.score, VOLCANO_INTROS, { skip: (s) => !!s.race });
// Departure-time bonus stages are on their own scale too.
curve('depot', DEPOT_STAGES, DEPOT_CHAPTERS, (s) => auditDepot(s)!.score, DEPOT_INTROS, { skip: (s) => s.limit !== undefined });
// Train world 2 has the same rules in src/stages/season2.test.ts.
// Train world 1 came before the rules; these are its breaks today (see `npm run difficulty`),
// each capped at its current size.
curve('train', STAGES, CHAPTERS, (s) => difficultyScore(audit(s)), {}, {
  known: {
    'STAGE 1-7': 4.66, // drops below 1-6
    'STAGE 1-8': 11.3, // jumps over 1-7
    'STAGE 1-10 boss': 3.14, // easier than 1-8
    'STAGE 3-3': 5.04, // drops below 3-2
    'STAGE 3-10': 11.16, // jumps into the boss
    'STAGE 4-4': 8.55, // jumps over 4-3
    'STAGE 4-5': 5.1, // drops below 4-4
    'STAGE 4-6': 12.68, // jumps over 4-5
    'STAGE 4-8': 9.62, // jumps over 4-7
  },
});
