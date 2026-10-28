import { rng } from '../penguin/generate';
import type { VolcanoStageDef } from './model';

export { rng };

/** What a generated volcano board should look like (used by scripts/lava-search.ts). */
export interface LavaSpec {
  id: string;
  size: [number, number];
  /** Craters with no limit. */
  craters?: number;
  /** Small craters, by volume (cells the lava spills). */
  small?: number[];
  houses: number;
  eggs?: number;
  rocks: [number, number];
  /** Short rock ridges (2..4 cells in a line), which make narrow passes. */
  ridges?: number;
  /** Sea cells along one edge. */
  sea?: number;
  race?: boolean;
  par: [number, number];
  difficulty: [number, number];
  /** Small craters must matter: with no limits the answer would fail. */
  mustLimit?: boolean;
  maxOptimal?: number;
  /** Walling in all craters or all houses must cost at least par + ring stones (default 1). */
  ring?: number;
  keep?: number;
  seed?: number;
  boss?: boolean;
}

/** A random board for the spec, or null when the draw is unusable. */
export function drawVolcano(spec: LavaSpec, rand: () => number): VolcanoStageDef | null {
  const [w, h] = spec.size;
  const g: string[] = new Array(w * h).fill('.');
  const pick = (ok: (i: number) => boolean = () => true): number => {
    for (let t = 0; t < 200; t++) {
      const i = Math.floor(rand() * w * h);
      if (g[i] === '.' && ok(i)) return i;
    }
    return -1;
  };
  const near = (i: number, glyphs: RegExp) => {
    const x = i % w;
    const y = Math.floor(i / w);
    return [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ].some(([a, b]) => a >= 0 && b >= 0 && a < w && b < h && glyphs.test(g[b * w + a]));
  };

  if (spec.sea) {
    const side = Math.floor(rand() * 4);
    const line = side < 2 ? w : h;
    const startAt = Math.floor(rand() * Math.max(1, line - spec.sea + 1));
    for (let k = 0; k < spec.sea && startAt + k < line; k++) {
      const a = startAt + k;
      const i = side === 0 ? a : side === 1 ? (h - 1) * w + a : side === 2 ? a * w : a * w + w - 1;
      g[i] = '~';
    }
  }
  for (let r = 0; r < (spec.ridges ?? 0); r++) {
    const len = 2 + Math.floor(rand() * 3);
    const horiz = rand() < 0.5;
    const x0 = Math.floor(rand() * w);
    const y0 = Math.floor(rand() * h);
    for (let k = 0; k < len; k++) {
      const x = horiz ? x0 + k : x0;
      const y = horiz ? y0 : y0 + k;
      if (x < w && y < h && g[y * w + x] === '.') g[y * w + x] = 'R';
    }
  }
  const rocks = spec.rocks[0] + Math.floor(rand() * (spec.rocks[1] - spec.rocks[0] + 1));
  for (let r = 0; r < rocks; r++) {
    const i = pick();
    if (i >= 0) g[i] = 'R';
  }
  const craters = [...Array(spec.craters ?? 0).fill('V'), ...(spec.small ?? []).map(String)];
  for (const c of craters) {
    const i = pick((j) => !near(j, /[V1-9]/));
    if (i < 0) return null;
    g[i] = c;
  }
  for (let k = 0; k < spec.houses; k++) {
    const i = pick((j) => !near(j, /[V1-9]/));
    if (i < 0) return null;
    g[i] = 'H';
  }
  for (let k = 0; k < (spec.eggs ?? 0); k++) {
    const i = pick((j) => !near(j, /[V1-9H]/));
    if (i < 0) return null;
    g[i] = 'E';
  }
  const map = Array.from({ length: h }, (_, y) => g.slice(y * w, y * w + w).join(' '));
  return { id: spec.id, title: '', tip: '', map, par: 0, solution: [], race: spec.race, boss: spec.boss };
}
