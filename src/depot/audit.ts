import type { DepotStage } from './model';
import { type DepotGraph, countShortest, explore } from './solver';

export interface DepotAudit {
  par: number;
  /** Distinct shortest move sequences. */
  optimal: number;
  /** Yard layouts reachable from the start. */
  reachable: number;
  /**
   * How much choosing the answer takes: along a shortest win, log2(moves on offer / moves that
   * get closer), summed. A step with one obvious move adds nothing.
   */
  bits: number;
  score: number;
}

/**
 * How hard a depot puzzle feels, on roughly the scale of the other worlds' audits:
 * the moves needed, the decisions along the way and how big the yard's maze of layouts is.
 * Rough guide: under 10 a first look, 20–35 the body of a chapter, 40+ a boss.
 */
export function auditDepot(stage: DepotStage, graph?: DepotGraph, startKey?: string): DepotAudit | null {
  const g = graph ?? explore(stage);
  const start = startKey ?? g.startKey;
  const par = g.toWin.get(start);
  if (par === undefined || g.truncated) return null;
  let bits = 0;
  let k = start;
  while (g.toWin.get(k)! > 0) {
    const d = g.toWin.get(k)!;
    const out = g.edges.get(k)!;
    const good = out.filter(([, nk]) => g.toWin.get(nk) === d - 1);
    bits += Math.log2(out.length / good.length);
    k = good[0][1];
  }
  const optimal = countShortest(g, start);
  const reachable = g.states.size;
  const score = par + bits * 0.5 + Math.log2(reachable) * 0.8 - Math.log2(optimal) * 0.5;
  return { par, optimal, reachable, bits, score };
}
