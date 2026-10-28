import { light } from './beam';
import type { MachineStage } from './model';
import { popcount, solveLaser } from './solver';

export interface LaserAudit {
  par: number;
  optimal: number;
  /** Turnable mirrors. */
  turnable: number;
  /** Winning settings among all 2^turnable. */
  wins: number;
  /** Settings within `par` taps of the start that light every bulb but one: tempting near misses. */
  nearMisses: number;
  score: number;
}

/**
 * How hard a laser puzzle feels, on the same rough scale as the other worlds:
 * the taps needed, how many mirrors there are to wonder about, how rare a working setting is,
 * how many near misses tempt the player, plus a little for half mirrors, doors and colours.
 */
export function auditLaser(stage: MachineStage): LaserAudit | null {
  const sol = solveLaser(stage);
  if (sol.par === null) return null;
  const bits: number[] = [];
  for (let i = 0; i < stage.devices.length; i++) if ((stage.turnable >> i) & 1) bits.push(i);
  let nearMisses = 0;
  for (let m = 0; m < 1 << bits.length; m++) {
    let taps = 0;
    bits.forEach((b, k) => {
      if ((m >> k) & 1) taps |= 1 << b;
    });
    if (popcount(taps) > sol.par) continue;
    const l = light(stage, stage.start ^ taps);
    if (!l.won && l.litBulbs.size === stage.bulbs.length - 1) nearMisses++;
  }
  const halves = stage.tiles.filter((t) => t.t === 'mirror' && t.half).length;
  const doors = stage.tiles.some((t) => t.t === 'door') ? 1 : 0;
  const colors = new Set(stage.tiles.flatMap((t) => (t.t === 'laser' ? [t.color] : []))).size;
  const score =
    sol.par * 2 +
    sol.turnable * 0.8 +
    (sol.turnable - Math.log2(sol.wins.length)) * 0.6 +
    Math.log2(1 + nearMisses) * 1.2 +
    stage.bulbs.length * 0.6 +
    halves * 1.0 +
    doors * 3 +
    (colors - 1) * 3 -
    Math.log2(sol.optimal) * 2;
  return { par: sol.par, optimal: sol.optimal, turnable: sol.turnable, wins: sol.wins.length, nearMisses, score };
}
