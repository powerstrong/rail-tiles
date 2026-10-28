import { DIR_NAMES, type Dir, DX, DY, opposite } from './dir';
import { RAIL_GLYPHS, type Rail, normalizeRot } from './rail';
import { solve } from './solver';
import { type Placement, type Stage, type StageDef, parseStage } from './stage';
import { TWO_STAR_SLACK } from './stars';

/**
 * Daily puzzle generator. The same date string always gives the same stage on every device:
 * a seeded random map is drawn, the solver enumerates every winning route, and only maps
 * whose route set makes a good puzzle are kept (a unique-ish ★★★ answer, a few sloppier
 * ★★/★ ones, and no straight dash across the board).
 */

/** mulberry32: tiny deterministic PRNG. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const GLYPH_OF = new Map(Object.entries(RAIL_GLYPHS).map(([g, r]) => [`${r.kind}${r.rot}`, g]));
const glyphOf = (rail: Rail) => GLYPH_OF.get(`${rail.kind}${normalizeRot(rail.kind, rail.rot)}`)!;

const DECOS = ['T', 'T', 'T', 'R', 'R', 'M', 'W', 'H'];
const SEARCH_LIMIT = 1500;

interface Candidate {
  def: StageDef;
  score: number;
}

/** One random map; null when it fails any quality check. */
function attempt(rand: () => number, size: number, id: string, title: string): Candidate | null {
  const w = size;
  const h = size;
  const grid: string[][] = Array.from({ length: h }, () => Array<string>(w).fill('.'));
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)];
  const inner = (n: number) => 1 + Math.floor(rand() * (n - 2));

  // Stations sit on two different edges (never corners), facing into the board.
  const sides: Dir[] = [0, 1, 2, 3];
  const startSide = pick(sides);
  const goalSide = pick(sides.filter((d) => d !== startSide));
  const onEdge = (side: Dir) =>
    side === 0 ? { x: inner(w), y: 0 } : side === 2 ? { x: inner(w), y: h - 1 } : side === 3 ? { x: 0, y: inner(h) } : { x: w - 1, y: inner(h) };
  const start = onEdge(startSide);
  const goal = onEdge(goalSide);
  if (Math.abs(start.x - goal.x) + Math.abs(start.y - goal.y) < size - 1) return null;
  const startDir = opposite(startSide);
  const goalDir = opposite(goalSide);
  grid[start.y][start.x] = 'S';
  grid[goal.y][goal.x] = 'G';
  const reserved = new Set([`${start.x + DX[startDir]},${start.y + DY[startDir]}`, `${goal.x + DX[goalDir]},${goal.y + DY[goalDir]}`]);
  const free = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && grid[y][x] === '.' && !reserved.has(`${x},${y}`);

  // Scenery in small clumps so the board reads like a landscape, not noise.
  const target = Math.round(w * h * (0.2 + rand() * 0.12));
  let placed = 0;
  for (let tries = 0; placed < target && tries < 200; tries++) {
    const x = Math.floor(rand() * w);
    const y = Math.floor(rand() * h);
    if (!free(x, y)) continue;
    const deco = pick(DECOS);
    grid[y][x] = deco;
    placed++;
    if (rand() < 0.45 && placed < target) {
      const d = pick(sides);
      const nx = x + DX[d];
      const ny = y + DY[d];
      if (free(nx, ny)) {
        grid[ny][nx] = deco === 'M' || deco === 'H' ? 'T' : deco;
        placed++;
      }
    }
  }

  // Up to two passengers, away from the stations.
  const riders = rand() < 0.25 ? 0 : rand() < 0.6 ? 1 : 2;
  for (let i = 0, tries = 0; i < riders && tries < 50; tries++) {
    const x = Math.floor(rand() * w);
    const y = Math.floor(rand() * h);
    const nearStation = Math.abs(x - start.x) + Math.abs(y - start.y) < 2 || Math.abs(x - goal.x) + Math.abs(y - goal.y) < 2;
    if (!free(x, y) || nearStation) continue;
    grid[y][x] = 'P';
    i++;
  }

  const map = grid.map((row) => row.join(' '));
  const blank = grid.map((row) => row.map(() => '.').join(' '));
  const base: StageDef = {
    id,
    title,
    tip: '',
    map,
    start: DIR_NAMES[startDir],
    goal: DIR_NAMES[goalDir],
    inventory: { straight: 30, curve: 30 },
    solution: blank,
  };
  const open = solve(parseStage(base, 0), SEARCH_LIMIT, true);
  // Unsolvable, or so open that every rail count works: not a puzzle.
  if (open.minRails === null || open.truncated || !open.routes) return null;
  const par = open.minRails;
  if (par < size + 1) return null;

  const usage = (r: Placement[]) => ({
    s: r.filter((p) => p.rail.kind === 'straight').length,
    c: r.filter((p) => p.rail.kind === 'curve').length,
  });
  const routes = open.routes.map((r) => ({ r, ...usage(r) }));

  // Hand out exactly what one shortest route needs plus a little slack, and keep the
  // inventory whose route spread makes the best puzzle.
  let best: Candidate | null = null;
  for (const shortest of routes.filter((x) => x.r.length === par)) {
    if (shortest.c < 4) continue; // too few turns to be interesting
    for (let ds = 0; ds <= 3; ds++) {
      for (let dc = 0; dc <= 3; dc++) {
        const inv = { straight: shortest.s + ds, curve: shortest.c + dc };
        const fits = routes.filter((x) => x.s <= inv.straight && x.c <= inv.curve);
        const three = fits.filter((x) => x.r.length <= par).length;
        const two = fits.filter((x) => x.r.length > par && x.r.length <= par + TWO_STAR_SLACK).length;
        const one = fits.length - three - two;
        if (three < 1 || three > 2 || two + one < 2 || fits.length > 80) continue;
        // Favour a single perfect answer, real alternatives, longer routes and passengers.
        const score = (three === 1 ? 6 : 0) + Math.min(two + one, 8) + par * 0.8 + riders * 2 + shortest.c * 0.5 + rand();
        if (best && best.score >= score) continue;
        const sol = grid.map((row) => row.map(() => '.'));
        for (const p of shortest.r) sol[p.y][p.x] = glyphOf(p.rail);
        best = { def: { ...base, inventory: inv, solution: sol.map((row) => row.join(' ')) }, score };
      }
    }
  }
  return best;
}

/** Local calendar date as YYYY-MM-DD. */
export function dateKey(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const DAILY_PREFIX = 'daily-';

/** The puzzle definition for a calendar date (YYYY-MM-DD). Deterministic; can take a second or so. */
export function dailyDef(date: string): StageDef {
  const rand = rng(hashString(`rail-tiles:${date}`));
  const [, m, d] = date.split('-').map(Number);
  const size = rand() < 0.35 ? 7 : 6;
  const id = `${DAILY_PREFIX}${date}`;
  const title = `${m}월 ${d}일 노선`;
  let best: Candidate | null = null;
  // Draw a handful of good maps and keep the best one.
  for (let i = 0, found = 0; i < 400 && found < 4; i++) {
    const c = attempt(rand, size, id, title);
    if (!c) continue;
    found++;
    if (!best || c.score > best.score) best = c;
  }
  if (!best) throw new Error(`no daily puzzle for ${date}`);
  const riders = best.def.map.join('').split('P').length - 1;
  best.def.tip = riders > 0 ? `오늘의 퍼즐 · 손님 ${riders}명을 태우고 도착역까지 가 보세요.` : '오늘의 퍼즐 · 매일 새 노선이 열려요.';
  return best.def;
}

export function dailyStageFromDef(def: StageDef): Stage {
  return { ...parseStage(def, 0), label: '오늘의 퍼즐' };
}

export function dailyStage(date: string): Stage {
  return dailyStageFromDef(dailyDef(date));
}

/** Days in a row with a cleared daily puzzle, counting back from today (or yesterday if today is still open). */
export function dailyStreak(clearedIds: Iterable<string>, today: string, prefix = DAILY_PREFIX): number {
  const done = new Set([...clearedIds].filter((id) => id.startsWith(prefix)).map((id) => id.slice(prefix.length)));
  const day = new Date(`${today}T12:00:00`);
  if (!done.has(today)) day.setDate(day.getDate() - 1);
  let streak = 0;
  while (done.has(dateKey(day))) {
    streak++;
    day.setDate(day.getDate() - 1);
  }
  return streak;
}
