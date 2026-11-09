import type { CargoStage } from './model';
import { type YardGraph, countShortest, explore } from './solver';
import { move } from './yard';

export interface CargoAudit {
  par: number;
  /** Distinct shortest answers. */
  optimal: number;
  /** Yard states that can be reached. */
  reachable: number;
  /** Along a shortest answer, log2(distinct moves / moves that get closer), summed. */
  bits: number;
  /** States from which the board can no longer be cleared, as a share of all. */
  traps: number;
  /** Most trains one move sends along the first shortest answer. */
  chain: number;
  /** Trains along that answer that waited, tied up, for their turn in the line. */
  waited: number;
  score: number;
}

/**
 * How hard a yard feels: moves needed, the choices on the way, how much yard there is to get
 * lost in, and the dead ends. Rough guide: under 10 a first look, 12–22 the body of a chapter,
 * 25+ a boss.
 */
export function auditCargo(stage: CargoStage, graph?: YardGraph | null): CargoAudit | null {
  const g = graph ?? explore(stage);
  if (!g || g.toWin[0] < 0) return null;
  const par = g.toWin[0];
  let bits = 0;
  let chain = 0;
  let waited = 0;
  let id = 0;
  while (g.toWin[id] > 0) {
    const d = g.toWin[id];
    const outs = new Set(g.edges[id].map(([, n]) => n));
    const good = [...outs].filter((n) => g.toWin[n] === d - 1);
    bits += Math.log2(outs.size / good.length);
    const [m, n] = g.edges[id].find(([, x]) => x === good[0])!;
    const step = move(stage, g.states[id], m, g.rules)!;
    chain = Math.max(chain, step.departed.length);
    // Only the wagon this move filled can start a chain: every one after it had been waiting.
    waited += Math.max(0, step.departed.length - 1);
    id = n;
  }
  const optimal = countShortest(g);
  let dead = 0;
  for (let i = 0; i < g.toWin.length; i++) if (g.toWin[i] < 0) dead++;
  const traps = dead / g.toWin.length;
  const score = par * 1.0 + bits * 1.1 + Math.log2(g.states.length) * 0.7 - Math.log2(optimal) * 0.5 + traps * 6 + waited * 0.8;
  return { par, optimal, reachable: g.states.length, bits, traps, chain, waited, score };
}
