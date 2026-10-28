import { DIR_NAMES, type Dir, type DirName, DX, DY } from '../engine/dir';
import { dateKey } from '../engine/generate';
import { auditIce } from './audit';
import { PENGUIN_IDS, type PenguinStage, type PenguinStageDef, parsePenguinStage, pushName } from './model';
import { solveIce } from './solver';

/** What a generated penguin board should look like (shared by scripts/ice-search.ts and the daily puzzle). */
export interface IceSpec {
  id: string;
  size: [number, number];
  penguins?: number;
  fish?: number;
  snow?: number;
  water?: number;
  cracks?: number;
  currents?: number;
  igloos?: number;
  rocks: [number, number];
  par: [number, number];
  difficulty: [number, number];
  must?: ('igloo' | 'snow' | 'turn' | 'crack' | 'stopper')[];
  maxOptimal?: number;
  tries?: number;
  seed?: number;
  keep?: number;
}


export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A random board for `spec` (or null if the pieces did not fit). */
export function drawBoard(spec: IceSpec, rand: () => number): PenguinStageDef | null {
  const [w, h] = spec.size;
  const g: string[][] = Array.from({ length: h }, () => Array<string>(w).fill('.'));
  const free = () => {
    for (let k = 0; k < 200; k++) {
      const x = Math.floor(rand() * w);
      const y = Math.floor(rand() * h);
      if (g[y][x] === '.') return { x, y };
    }
    return null;
  };
  const put = (glyph: string) => {
    const c = free();
    if (!c) return null;
    g[c.y][c.x] = glyph;
    return c;
  };
  const n = spec.penguins ?? 1;
  for (let k = 0; k < n; k++) {
    if (!put(PENGUIN_IDS[k]) || !put(PENGUIN_IDS[k].toUpperCase())) return null;
  }
  const igloos: Record<string, [DirName, DirName]> = {};
  for (let k = 0; k < (spec.igloos ?? 0); k++) {
    const label = String(k + 1);
    const doors: DirName[] = [];
    for (let m = 0; m < 2; m++) {
      const c = put(label);
      if (!c) return null;
      const opts = ([0, 1, 2, 3] as Dir[]).filter((d) => {
        const nx = c.x + DX[d];
        const ny = c.y + DY[d];
        return nx >= 0 && ny >= 0 && nx < w && ny < h;
      });
      doors.push(DIR_NAMES[opts[Math.floor(rand() * opts.length)]]);
    }
    igloos[label] = doors as [DirName, DirName];
  }
  const add = (count: number | undefined, glyphs: string) => {
    for (let k = 0; k < (count ?? 0); k++) if (!put(glyphs[Math.floor(rand() * glyphs.length)])) return false;
    return true;
  };
  if (!add(spec.fish, 'F') || !add(spec.snow, '*') || !add(spec.water, 'W') || !add(spec.cracks, 'x') || !add(spec.currents, '^>v<')) return null;
  const rocks = spec.rocks[0] + Math.floor(rand() * (spec.rocks[1] - spec.rocks[0] + 1));
  if (!add(rocks, 'RRRM')) return null;
  return { id: spec.id, title: spec.id, tip: '', map: g.map((r) => r.join(' ')), igloos, par: 0, solution: [] };
}


const hashString = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

export const ICE_DAILY_PREFIX = 'ice-daily-';

/** Weekday → what kind of puzzle (Monday gentle, Sunday a mini boss). */
const DAILY_SPECS: Omit<IceSpec, 'id'>[] = [
  { size: [7, 7], penguins: 2, igloos: 1, currents: 1, rocks: [3, 7], par: [7, 11], difficulty: [40, 55] }, // Sun
  { size: [6, 6], fish: 1, snow: 1, rocks: [3, 6], par: [5, 8], difficulty: [20, 30] }, // Mon
  { size: [6, 6], fish: 2, water: 2, rocks: [3, 6], par: [5, 8], difficulty: [22, 32] }, // Tue
  { size: [7, 7], igloos: 1, fish: 1, rocks: [3, 7], par: [6, 9], difficulty: [26, 36] }, // Wed
  { size: [7, 7], currents: 2, cracks: 2, rocks: [3, 7], par: [6, 9], difficulty: [28, 38] }, // Thu
  { size: [6, 6], penguins: 2, snow: 1, rocks: [2, 5], par: [5, 9], difficulty: [30, 42] }, // Fri
  { size: [6, 6], penguins: 2, fish: 1, rocks: [2, 5], par: [6, 9], difficulty: [34, 46] }, // Sat
];

/**
 * Today's penguin puzzle. Deterministic for a date (a fixed number of draws, never a time
 * budget, so every device builds the same board). Can take a second: run it in a worker.
 */
export function dailyIceDef(date: string): PenguinStageDef {
  const rand = rng(hashString(`ice:${date}`));
  const weekday = new Date(`${date}T12:00:00`).getDay();
  const spec: IceSpec = { id: `${ICE_DAILY_PREFIX}${date}`, ...DAILY_SPECS[weekday] };
  let best: { def: PenguinStageDef; rank: number } | null = null;
  let found = 0;
  for (let i = 0; i < 6000 && found < 3; i++) {
    const def = drawBoard(spec, rand);
    if (!def) continue;
    let stage: PenguinStage;
    try {
      stage = parsePenguinStage(def, 0);
    } catch {
      continue;
    }
    const sol = solveIce(stage, 30_000);
    if (sol.truncated || sol.par === null || sol.par < spec.par[0] || sol.par > spec.par[1] || sol.optimal !== 1) continue;
    const a = auditIce(stage);
    if (!a || a.score < spec.difficulty[0] || a.score > spec.difficulty[1]) continue;
    found++;
    const rank = -Math.abs(a.score - (spec.difficulty[0] + spec.difficulty[1]) / 2);
    if (!best || rank > best.rank) best = { def: { ...def, par: sol.par, solution: sol.first!.map(pushName) }, rank };
  }
  if (!best) throw new Error(`no penguin puzzle for ${date}`);
  const [, m, d] = date.split('-').map(Number);
  const two = (spec.penguins ?? 1) > 1;
  return {
    ...best.def,
    title: `${m}월 ${d}일 얼음판`,
    tip: two ? '오늘의 퍼즐 · 펭귄 두 마리를 각자 구멍으로 보내요.' : '오늘의 퍼즐 · 매일 새 얼음판이 열려요.',
  };
}

export function dailyIceStage(def: PenguinStageDef): PenguinStage {
  return { ...parsePenguinStage(def, 0), label: '오늘의 퍼즐' };
}

export { dateKey };
