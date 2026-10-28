import { describe, expect, it } from 'vitest';
import { auditLaser } from './machine/audit';
import { MACHINE_INTROS } from './machine/intros';
import { MACHINE_CHAPTERS, MACHINE_STAGES } from './machine/stages';
import { auditIce } from './penguin/audit';
import { ICE_INTROS } from './penguin/intros';
import { ICE_CHAPTERS, ICE_STAGES } from './penguin/stages';
import type { Chapter } from './stages/stages';
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

function curve<S extends { id: string; label?: string; par: number }>(name: string, stages: S[], chapters: Chapter[], score: (s: S) => number, intros: Record<string, unknown>, skip: (s: S) => boolean = () => false) {
  describe(`${name} difficulty curve`, () => {
    for (const ch of chapters) {
      const rows: Row[] = stages
        .slice(ch.start, ch.start + ch.count)
        .filter((s) => !skip(s))
        .map((s) => ({ id: s.id, label: s.label, par: s.par, score: score(s) }));
      it(`chapter ${ch.number} rises smoothly`, () => {
        rows.forEach((r, k) => {
          if (k === 0) return;
          const prev = rows[k - 1];
          const step = r.score - prev.score;
          expect(step, `${r.label} jumps ${step.toFixed(1)} over ${prev.label}`).toBeLessThanOrEqual(k === rows.length - 1 ? MAX_BOSS_STEP : MAX_STEP);
          expect(-step, `${r.label} drops ${(-step).toFixed(1)} below ${prev.label}`).toBeLessThanOrEqual(MAX_DIP);
        });
      });
      it(`chapter ${ch.number}: a stage with a new mechanic is not much longer than the one before`, () => {
        rows.forEach((r, k) => {
          if (k > 0 && r.id in intros) expect(r.par, `${r.label} par`).toBeLessThanOrEqual(rows[k - 1].par + 1);
        });
      });
    }
  });
}

curve('penguin', ICE_STAGES, ICE_CHAPTERS, (s) => auditIce(s)!.score, ICE_INTROS);
curve('machine', MACHINE_STAGES, MACHINE_CHAPTERS, (s) => auditLaser(s)!.score, MACHINE_INTROS);
// Race stages are bonus rounds on their own scale.
curve('volcano', VOLCANO_STAGES, VOLCANO_CHAPTERS, (s) => auditLava(s)!.score, VOLCANO_INTROS, (s) => !!s.race);
