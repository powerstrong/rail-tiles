import { DIR_NAMES, type Dir, type DirName } from '../engine/dir';
import { rng } from '../penguin/generate';
import type { Color, MachineStageDef } from './model';

export { rng };

/** What a generated laser board should look like (used by scripts/laser-search.ts). */
export interface LaserSpec {
  id: string;
  size: [number, number];
  /** One entry per laser. */
  lasers: Color[];
  /** Bulb glyphs to place: 'o' any, 'r' red, 'u' blue, 'p' purple. */
  bulbs: string;
  mirrors: number;
  bolted?: number;
  halves?: number;
  /** Doors behind a sensor (0 = no sensor). */
  doors?: number;
  /** Filter glyphs to place: 'R' / 'U'. */
  filters?: string;
  walls: [number, number];
  par: [number, number];
  difficulty: [number, number];
  /** Things the winning setting must really use. */
  must?: ('half' | 'door' | 'filter')[];
  /** Turnable mirrors that must stay untouched in the answer (default 1). */
  decoys?: number;
  battery?: number;
  boss?: boolean;
  keep?: number;
  seed?: number;
}

/** A random board for `spec`: lasers on the border facing in, the rest scattered. */
export function drawLaserBoard(spec: LaserSpec, rand: () => number): MachineStageDef | null {
  const [w, h] = spec.size;
  const g: string[][] = Array.from({ length: h }, () => Array<string>(w).fill('.'));
  const free = (border = false) => {
    for (let k = 0; k < 300; k++) {
      const x = Math.floor(rand() * w);
      const y = Math.floor(rand() * h);
      if (border && x > 0 && y > 0 && x < w - 1 && y < h - 1) continue;
      if (g[y][x] === '.') return { x, y };
    }
    return null;
  };
  const lasers: [DirName, Color][] = [];
  const laserCells: { x: number; y: number; color: Color }[] = [];
  for (const color of spec.lasers) {
    const c = free(true);
    if (!c) return null;
    const inward: Dir[] = [];
    if (c.y === 0) inward.push(2);
    if (c.y === h - 1) inward.push(0);
    if (c.x === 0) inward.push(1);
    if (c.x === w - 1) inward.push(3);
    g[c.y][c.x] = 'L';
    laserCells.push({ ...c, color });
    lasers.push([DIR_NAMES[inward[Math.floor(rand() * inward.length)]], color]);
  }
  // Lasers must be listed in reading order.
  const order = laserCells.map((c, i) => ({ k: c.y * w + c.x, i })).sort((a, b) => a.k - b.k);
  const sortedLasers = order.map((o) => lasers[o.i]);
  const put = (glyph: string) => {
    const c = free();
    if (!c) return false;
    g[c.y][c.x] = glyph;
    return true;
  };
  for (const b of spec.bulbs) if (!put(b)) return null;
  for (let k = 0; k < spec.mirrors; k++) if (!put(rand() < 0.5 ? 'm' : 'n')) return null;
  for (let k = 0; k < (spec.bolted ?? 0); k++) if (!put(rand() < 0.5 ? 'M' : 'N')) return null;
  for (let k = 0; k < (spec.halves ?? 0); k++) if (!put(rand() < 0.5 ? 's' : 't')) return null;
  for (const f of spec.filters ?? '') if (!put(f)) return null;
  if (spec.doors) {
    if (!put('x')) return null;
    for (let k = 0; k < spec.doors; k++) if (!put('D')) return null;
  }
  const walls = spec.walls[0] + Math.floor(rand() * (spec.walls[1] - spec.walls[0] + 1));
  for (let k = 0; k < walls; k++) if (!put('#')) return null;
  return { id: spec.id, title: spec.id, tip: '', map: g.map((r) => r.join(' ')), lasers: sortedLasers, par: 0, solution: [], battery: spec.battery, boss: spec.boss };
}

/**
 * Builds a board around a working answer: mirrors are placed with a target setting, the
 * beams are traced, and bulbs (of the colours that actually arrive), filters, the sensor and
 * its doors go on the lit path. Then `taps` of the lit, turnable mirrors are flipped to make
 * the starting position. Always solvable; the caller still checks the answer is unique.
 */
export function constructLaserBoard(spec: LaserSpec, rand: () => number, light: typeof import('./beam').light, parse: typeof import('./model').parseMachineStage): MachineStageDef | null {
  const base = drawLaserBoard({ ...spec, bulbs: '', filters: '', doors: 0 }, rand);
  if (!base) return null;
  const [w, h] = spec.size;
  const g = base.map.map((r) => r.split(' '));
  // A dummy bulb lets the board parse; it is removed again below.
  const free = () => {
    for (let k = 0; k < 200; k++) {
      const x = Math.floor(rand() * w);
      const y = Math.floor(rand() * h);
      if (g[y][x] === '.') return { x, y };
    }
    return null;
  };
  const dummy = free();
  if (!dummy) return null;
  g[dummy.y][dummy.x] = 'o';
  let stage;
  try {
    stage = parse({ ...base, map: g.map((r) => r.join(' ')) }, 0);
  } catch {
    return null;
  }
  g[dummy.y][dummy.x] = '.';
  const target = stage.start;
  const lit = light(stage, target);
  // Colours arriving at each empty cell, and the order cells are first reached.
  const colorsAt = new Map<number, Set<string>>();
  const order: number[] = [];
  for (const s of lit.segments) {
    if (!Number.isInteger(s.x2 - 0.5) || !Number.isInteger(s.y2 - 0.5)) continue;
    const c = Math.floor(s.y2) * w + Math.floor(s.x2);
    if (!colorsAt.has(c)) {
      colorsAt.set(c, new Set());
      order.push(c);
    }
    colorsAt.get(c)!.add(s.color);
  }
  const emptyLit = order.filter((c) => g[Math.floor(c / w)][c % w] === '.' && !(dummy.y * w + dummy.x === c && false));
  const take = (ok: (cols: Set<string>) => boolean) => {
    const opts = emptyLit.filter((c) => g[Math.floor(c / w)][c % w] === '.' && ok(colorsAt.get(c)!));
    if (!opts.length) return null;
    const c = opts[Math.floor(rand() * opts.length)];
    return c;
  };
  const set = (c: number, glyph: string) => (g[Math.floor(c / w)][c % w] = glyph);
  for (const b of spec.bulbs) {
    const c = take((cols) => (b === 'o' ? true : b === 'r' ? cols.has('red') : b === 'u' ? cols.has('blue') : cols.has('red') && cols.has('blue')));
    if (c === null) return null;
    set(c, b);
  }
  for (const f of spec.filters ?? '') {
    const want = f === 'R' ? 'red' : 'blue';
    const c = take((cols) => cols.size === 1 && cols.has(want));
    if (c === null) return null;
    set(c, f);
  }
  if (spec.doors) {
    // Sensor early on a beam, doors later on the lit path.
    const lits = emptyLit.filter((c) => g[Math.floor(c / w)][c % w] === '.');
    if (lits.length < spec.doors + 1) return null;
    const si = Math.floor(rand() * Math.max(1, lits.length - spec.doors));
    set(lits[si], 'x');
    const later = lits.slice(si + 1);
    for (let k = 0; k < spec.doors; k++) {
      if (!later.length) return null;
      const c = later.splice(Math.floor(rand() * later.length), 1)[0];
      set(c, 'D');
    }
  }
  const def: MachineStageDef = { ...base, map: g.map((r) => r.join(' ')) };
  let st;
  try {
    st = parse(def, 0);
  } catch {
    return null;
  }
  if (!light(st, target).won) return null;
  // Scramble: flip some lit, turnable mirrors.
  const litMirrors = st.devices.map((c, i) => ({ c, i })).filter(({ c, i }) => (st.turnable >> i) & 1 && colorsAt.has(c));
  const taps = spec.par[0] + Math.floor(rand() * (spec.par[1] - spec.par[0] + 1));
  if (litMirrors.length < taps) return null;
  const chosen = [...litMirrors].sort(() => rand() - 0.5).slice(0, taps);
  let startMask = target;
  for (const { i } of chosen) startMask ^= 1 << i;
  // Rewrite the map so the mirrors start in the scrambled setting.
  const rows = def.map.map((r) => r.split(' '));
  st.devices.forEach((c, i) => {
    const y = Math.floor(c / w);
    const x = c % w;
    const back = ((startMask >> i) & 1) === 1;
    const glyph = rows[y][x];
    const pair: Record<string, [string, string]> = { m: ['m', 'n'], n: ['m', 'n'], s: ['s', 't'], t: ['s', 't'], M: ['M', 'N'], N: ['M', 'N'] };
    rows[y][x] = pair[glyph][back ? 1 : 0];
  });
  return { ...def, map: rows.map((r) => r.join(' ')) };
}
