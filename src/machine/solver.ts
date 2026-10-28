import { light } from './beam';
import type { MachineStage } from './model';

export const popcount = (n: number) => {
  let c = 0;
  for (let v = n; v; v &= v - 1) c++;
  return c;
};

export interface LaserSolution {
  /** Fewest taps (from the starting mirrors), or null if no setting lights every bulb. */
  par: number | null;
  /** Winning settings that need exactly `par` taps. */
  optimal: number;
  /** Every winning setting, as the set of devices to tap (bitmask). */
  wins: number[];
  /** Turnable devices. */
  turnable: number;
}

/** Tries every way of turning the turnable mirrors (each one is either turned once or not). */
export function solveLaser(stage: MachineStage): LaserSolution {
  const bits: number[] = [];
  for (let i = 0; i < stage.devices.length; i++) if ((stage.turnable >> i) & 1) bits.push(i);
  const wins: number[] = [];
  for (let m = 0; m < 1 << bits.length; m++) {
    let taps = 0;
    bits.forEach((b, k) => {
      if ((m >> k) & 1) taps |= 1 << b;
    });
    if (light(stage, stage.start ^ taps).won) wins.push(taps);
  }
  if (!wins.length) return { par: null, optimal: 0, wins, turnable: bits.length };
  const par = Math.min(...wins.map(popcount));
  return { par, optimal: wins.filter((w) => popcount(w) === par).length, wins, turnable: bits.length };
}

/** The mirror to tap next toward the nearest win from `config`, or null if already won. */
export function hintLaser(stage: MachineStage, config: number, wins = solveLaser(stage).wins): number | null {
  let best: number | null = null;
  let bestDist = Infinity;
  for (const w of wins) {
    const diff = (stage.start ^ w) ^ config;
    const d = popcount(diff);
    if (d < bestDist) {
      bestDist = d;
      best = diff;
    }
  }
  if (best === null || bestDist === 0) return null;
  for (let i = 0; i < stage.devices.length; i++) if ((best >> i) & 1) return i;
  return null;
}
