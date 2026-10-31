import type { ClockStage } from './model';
import { type ClockGraph, countShortest, explore } from './solver';
import { cellOf, reversedOf, turnOf } from './tick';

export interface ClockAudit {
  par: number;
  /** Distinct shortest action sequences. */
  optimal: number;
  /** Tower states the mouse can reach that the tower tells apart (cell, clock phase, hand direction). */
  reachable: number;
  /**
   * How much choosing the answer takes: along a shortest way, log2(actions possible / actions
   * that get closer), summed. A tick with one sensible action adds nothing.
   */
  bits: number;
  /** Rests along the shortest answers' first one (waiting is a skill of its own). */
  rests: number;
  /** States from which the door can no longer be reached, as a share of all. */
  traps: number;
  score: number;
}

/**
 * How hard a clock tower puzzle feels: ticks needed, decisions along the way, how much tower
 * there is to wander, the rests to time and the dead ends. Rough guide: under 10 a first look,
 * 15–25 the body of a chapter, 30+ a boss.
 */
export function auditClock(stage: ClockStage, graph?: ClockGraph): ClockAudit | null {
  const g = graph ?? explore(stage);
  const par = g.toWin.get(g.start);
  if (par === undefined) return null;
  let bits = 0;
  let rests = 0;
  let s = g.start;
  while (g.toWin.get(s)! > 0) {
    const d = g.toWin.get(s)!;
    const out = g.edges.get(s)!;
    const good = out.filter(([, n]) => g.toWin.get(n) === d - 1);
    bits += Math.log2(out.length / good.length);
    if (good[0][0] === 4) rests++;
    s = good[0][1];
  }
  const optimal = countShortest(g, g.start);
  // Count only what the tower can tell apart: the clock does not matter without blocks or hands,
  // and blocks only see odd and even ticks.
  const period = stage.hands.length ? 4 : stage.tiles.some((t) => t.t === 'block') ? 2 : 1;
  const reachable = new Set([...g.states].map((s) => cellOf(s) * 8 + (turnOf(s) % period) * 2 + reversedOf(s))).size;
  const traps = 1 - g.toWin.size / g.states.size;
  const score = par * 0.7 + bits * 1.2 + Math.log2(reachable) * 0.8 - Math.log2(optimal) * 0.6 + rests * 0.8 + traps * 5;
  return { par, optimal, reachable, bits, rests, traps, score };
}
