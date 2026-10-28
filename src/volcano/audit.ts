import { flow, placeable, solveLava, solveRace } from './lava';
import { NO_LIMIT, type VolcanoStage } from './model';

export interface LavaAudit {
  par: number;
  optimal: number;
  /** Grass cells the lava floods with no stones down: where a stone could matter. */
  open: number;
  coldSets: number;
  explored: number;
  score: number;
}

const log2 = Math.log2;
function choose(n: number, k: number): number {
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return r;
}

/**
 * Difficulty on the volcano world's own scale:
 *   stones × 3, how many ways that many stones could go on flooded grass, houses and eggs to
 *   juggle, small craters (paths to lengthen), extra craters, and "cold" answers that save
 *   the village but forget an egg; several best answers make it easier.
 * Race (bonus) stages: stones × 3 plus how much the search had to look at.
 */
export function auditLava(stage: VolcanoStage): LavaAudit | null {
  const empty = flow(stage, new Set());
  const open = empty.time.filter((t, i) => t > 0 && placeable(stage, i)).length;
  if (stage.race) {
    const r = solveRace(stage);
    if (r.par === null) return null;
    const score = r.par * 3 + log2(1 + r.explored) * 1.5 + stage.houses.length * 0.6;
    return { par: r.par, optimal: 1, open, coldSets: 0, explored: r.explored, score };
  }
  const s = solveLava(stage);
  if (s.par === null) return null;
  const small = stage.craters.filter((c) => (stage.tiles[c] as { volume: number }).volume < NO_LIMIT).length;
  const score =
    s.par * 3 +
    log2(1 + choose(open, s.par)) * 0.9 +
    stage.houses.length * 0.6 +
    stage.eggs.length * 1.6 +
    small * 2.2 +
    (stage.craters.length - 1) * 1.5 +
    log2(1 + s.coldSets) * 1.2 -
    log2(s.optimal) * 2;
  return { par: s.par, optimal: s.optimal, open, coldSets: s.coldSets, explored: s.explored, score };
}
