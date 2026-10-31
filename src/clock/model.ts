import { DIR_NAMES, type Dir, type DirName } from '../engine/dir';

/**
 * Clock tower world ("시계탑"): timing puzzles.
 *
 * A little mouse walks one cell at a time to the door, or rests where it stands. Every step and
 * every rest is one tick of the tower clock, and with each tick the tower changes: red and blue
 * blocks take turns standing up (red up on even ticks, blue up on odd ticks) and every clock
 * hand turns a quarter clockwise around its hub. The mouse may only end a tick on a free cell,
 * so it has to step off a block before it rises and out of a hand's way before it sweeps in.
 * Fewest ticks to the door is ★★★.
 *
 * Chapter 3 adds levers: stepping onto one turns every hand the other way from the next tick on.
 *
 * Map glyphs (space separated):
 *   .  floor        #  wall            S  the mouse      E  the door
 *   r  red block    b  blue block      H  a clock hand's hub (blocks; see `hands`)
 *   L  lever
 * Hands: `'x,y N 2'` = hub at x,y, pointing north at tick 0, two cells long.
 */

export type Tile =
  | { t: 'floor' }
  | { t: 'wall' }
  | { t: 'block'; color: 0 | 1 }
  | { t: 'hub' }
  | { t: 'lever' }
  | { t: 'exit' };

export interface Hand {
  hub: number;
  /** Where it points at tick 0 (it turns clockwise with each tick unless reversed). */
  start: Dir;
  len: number;
}

export interface ClockStageDef {
  id: string;
  title: string;
  tip: string;
  map: string[];
  hands?: string[];
  /** Fewest ticks that reach the door (★★★). Checked by tests against the solver. */
  par: number;
  /** One shortest answer: U R D L for steps, `.` for a rest. */
  solution: string;
  /** Bonus stage ("자정의 종"): this many ticks and no undo. */
  limit?: number;
}

export interface ClockStage {
  id: string;
  number: number;
  title: string;
  tip: string;
  label?: string;
  width: number;
  height: number;
  tiles: Tile[];
  hands: Hand[];
  start: number;
  exit: number;
  par: number;
  solution: Action[];
  limit?: number;
}

/** A step (0..3, N E S W) or a rest. */
export type Action = Dir | typeof REST;
export const REST = 4;
export const ACTIONS: readonly Action[] = [0, 1, 2, 3, REST];
export const ACTION_GLYPHS = 'URDL.';
export const MIN_SIDE = 4;
export const MAX_SIDE = 8;

export class ClockStageError extends Error {}

export const actionName = (a: Action) => ACTION_GLYPHS[a];

export function parseActions(s: string): Action[] {
  return [...s].map((c) => {
    const a = ACTION_GLYPHS.indexOf(c);
    if (a < 0) throw new ClockStageError(`bad action "${c}" in "${s}"`);
    return a as Action;
  });
}

export function parseClockStage(def: ClockStageDef, number: number): ClockStage {
  const fail = (msg: string): never => {
    throw new ClockStageError(`[${def.id}] ${msg}`);
  };
  const rows = def.map.map((r) => r.trim().split(/\s+/));
  const height = rows.length;
  const width = rows[0]?.length ?? 0;
  if (width < MIN_SIDE || width > MAX_SIDE || height < MIN_SIDE || height > MAX_SIDE) fail(`tower must be ${MIN_SIDE}..${MAX_SIDE} on each side, got ${width}x${height}`);
  const tiles: Tile[] = [];
  let start = -1;
  let exit = -1;
  rows.forEach((row, y) => {
    if (row.length !== width) fail(`row ${y} has ${row.length} cells, expected ${width}`);
    row.forEach((g, x) => {
      const i = y * width + x;
      if (g === '.') tiles.push({ t: 'floor' });
      else if (g === '#') tiles.push({ t: 'wall' });
      else if (g === 'r' || g === 'b') tiles.push({ t: 'block', color: g === 'r' ? 0 : 1 });
      else if (g === 'H') tiles.push({ t: 'hub' });
      else if (g === 'L') tiles.push({ t: 'lever' });
      else if (g === 'S') {
        if (start >= 0) fail('two mice');
        start = i;
        tiles.push({ t: 'floor' });
      } else if (g === 'E') {
        if (exit >= 0) fail('two doors');
        exit = i;
        tiles.push({ t: 'exit' });
      } else fail(`unknown glyph "${g}" at ${x},${y}`);
    });
  });
  if (start < 0) fail('no mouse');
  if (exit < 0) fail('no door');
  const hands = (def.hands ?? []).map((h): Hand => {
    const m = /^(\d+),(\d+) ([NESW]) (\d)$/.exec(h);
    if (!m) return fail(`bad hand "${h}"`);
    const hub = Number(m[2]) * width + Number(m[1]);
    if (tiles[hub]?.t !== 'hub') fail(`hand "${h}" has no hub H there`);
    const len = Number(m[4]);
    if (len < 1 || len > 3) fail(`hand "${h}" must be 1..3 long`);
    return { hub, start: DIR_NAMES.indexOf(m[3] as DirName) as Dir, len };
  });
  const hubs = tiles.flatMap((t, i) => (t.t === 'hub' ? [i] : []));
  if (hubs.length !== hands.length || new Set(hands.map((h) => h.hub)).size !== hands.length) fail('every hub H needs exactly one hand');
  return {
    id: def.id,
    number,
    title: def.title,
    tip: def.tip,
    width,
    height,
    tiles,
    hands,
    start,
    exit,
    par: def.par,
    solution: parseActions(def.solution),
    limit: def.limit,
  };
}

/** The map rows and hand strings of a stage, for printing a generated one as a definition. */
export function stageMap(stage: ClockStage): { map: string[]; hands: string[] } {
  const glyph = (i: number): string => {
    if (i === stage.start) return 'S';
    const t = stage.tiles[i];
    if (t.t === 'wall') return '#';
    if (t.t === 'block') return t.color === 0 ? 'r' : 'b';
    if (t.t === 'hub') return 'H';
    if (t.t === 'lever') return 'L';
    if (t.t === 'exit') return 'E';
    return '.';
  };
  return {
    map: Array.from({ length: stage.height }, (_, y) => Array.from({ length: stage.width }, (_, x) => glyph(y * stage.width + x)).join(' ')),
    hands: stage.hands.map((h) => `${h.hub % stage.width},${Math.floor(h.hub / stage.width)} ${DIR_NAMES[h.start]} ${h.len}`),
  };
}
