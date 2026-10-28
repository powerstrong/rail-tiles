import type { PenguinStage } from './model';
import { explore } from './solver';

export interface IceAudit {
  par: number;
  /** Distinct shortest push sequences. */
  optimal: number;
  /** States reachable from the start. */
  reachable: number;
  /** Along a shortest win: pushes that make the puzzle unwinnable (a fall is not counted: it is undone at once). */
  traps: number;
  /** Steps of that shortest win where at least one trap waits. */
  trapSteps: number;
  /** Along a shortest win: pushes that keep it winnable but no closer. */
  detours: number;
  /** Share of reachable states from which the puzzle can no longer be won. */
  deadShare: number;
  score: number;
}

/**
 * How hard a slide puzzle feels, on roughly the same scale as the train world's audit:
 * every push needed, the size of the state space (how many places a player can wander to),
 * how many steps of the answer hide a dead end, and how many tempting detours there are.
 * Rough guide: ~15 a gentle opener, 20–35 the body of a chapter, 40+ a boss.
 */
export function auditIce(stage: PenguinStage): IceAudit | null {
  const g = explore(stage);
  const par = g.toWin.get(g.startKey);
  if (par === undefined || g.truncated) return null;
  let traps = 0;
  let trapSteps = 0;
  let detours = 0;
  let k = g.startKey;
  const memo = new Map<string, number>();
  const count = (key: string): number => {
    const d = g.toWin.get(key)!;
    if (d === 0) return 1;
    if (memo.has(key)) return memo.get(key)!;
    let n = 0;
    for (const [, nk] of g.edges.get(key) ?? []) if (g.toWin.get(nk) === d - 1) n += count(nk);
    memo.set(key, n);
    return n;
  };
  while (g.toWin.get(k)! > 0) {
    const d = g.toWin.get(k)!;
    let next: string | null = null;
    let here = 0;
    for (const [, nk] of g.edges.get(k)!) {
      const nd = g.toWin.get(nk);
      if (nd === undefined) here++;
      else if (nd >= d) detours++;
      else if (next === null) next = nk;
    }
    traps += here;
    if (here > 0) trapSteps++;
    k = next!;
  }
  let dead = 0;
  for (const key of g.states.keys()) if (!g.toWin.has(key)) dead++;
  const reachable = g.states.size;
  const deadShare = dead / reachable;
  const optimal = count(g.startKey);
  const score = par * 1.5 + Math.log2(reachable) * 2 + trapSteps * 2 + detours * 0.3 - Math.log2(optimal) * 2;
  return { par, optimal, reachable, traps, trapSteps, detours, deadShare, score };
}
