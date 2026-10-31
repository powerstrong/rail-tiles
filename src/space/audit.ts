import type { SpaceStage } from './model';
import { type SpaceGraph, countShortest, explore } from './solver';

export interface SpaceAudit {
  par: number;
  /** Distinct shortest press sequences. */
  optimal: number;
  /** Capsule layouts reachable from the start. */
  reachable: number;
  /**
   * How much choosing the answer takes: along a shortest win, log2(presses that do something /
   * presses that get closer), summed. A step with one obvious press adds nothing.
   */
  bits: number;
  /** Layouts from which the docks can no longer be reached (traps), as a share of all. */
  traps: number;
  score: number;
}

/**
 * How hard a gravity puzzle feels: the presses needed, the decisions along the way, how many
 * layouts there are to get lost in, and how many of them are dead ends.
 * Rough guide: under 10 a first look, 20–35 the body of a chapter, 40+ a boss.
 */
export function auditSpace(stage: SpaceStage, graph?: SpaceGraph): SpaceAudit | null {
  const g = graph ?? explore(stage);
  const par = g.toWin.get(g.startKey);
  if (par === undefined || g.truncated) return null;
  let bits = 0;
  let k = g.startKey;
  while (g.toWin.get(k)! > 0) {
    const d = g.toWin.get(k)!;
    const out = g.edges.get(k)!;
    const good = out.filter(([, nk]) => g.toWin.get(nk) === d - 1);
    bits += Math.log2(out.length / good.length);
    k = good[0][1];
  }
  const optimal = countShortest(g, g.startKey);
  const reachable = g.states.size;
  const traps = 1 - g.toWin.size / reachable;
  const score = par * 0.6 + bits * 1.2 + Math.log2(reachable) * 0.8 - Math.log2(optimal) * 0.6 + traps * 4;
  return { par, optimal, reachable, bits, traps, score };
}
