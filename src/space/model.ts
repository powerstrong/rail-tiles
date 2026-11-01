import type { Dir } from '../engine/dir';

/**
 * Space station world ("우주 정거장"): gravity puzzles.
 *
 * The player never picks a capsule. A gravity button (or a swipe) pulls every capsule one cell
 * the same way at once; a capsule stops against a wall, the edge of the station or a capsule
 * that is stuck itself. The stage is won when every capsule sits on the dock of its own colour,
 * all at the same time. Fewest presses is ★★★.
 *
 * Chapter 2 adds booster pads: a capsule that flies onto one is pushed one more cell the way
 * its arrow points. Chapter 3 adds wormholes: a capsule that arrives on one comes out of its
 * twin, if the twin is free. One press runs gravity, then boosters, then wormholes, each once.
 *
 * Map glyphs (space separated):
 *   .  floor              #  station wall        o  asteroid (blocks like a wall)
 *   R B Y G  capsules (red, blue, yellow, green)  r b y g  their docks
 *   ^ > v <  booster pads                        1 2  wormhole pairs (two cells each)
 */

export type Tile =
  | { t: 'floor' }
  | { t: 'wall'; deco: 'panel' | 'rock' }
  | { t: 'dock'; capsule: number }
  | { t: 'pad'; dir: Dir }
  | { t: 'hole'; pair: number; twin: number };

export interface SpaceStageDef {
  id: string;
  title: string;
  tip: string;
  map: string[];
  /** Fewest presses that win (★★★). Checked by tests against the solver. */
  par: number;
  /** One shortest answer as presses: U R D L. */
  solution: string;
  /** Bonus stage ("산소가 부족해!"): this many presses and no undo. */
  limit?: number;
}

export interface SpaceStage {
  id: string;
  number: number;
  title: string;
  tip: string;
  label?: string;
  /** The last stage of a chapter. */
  boss?: boolean;
  width: number;
  height: number;
  tiles: Tile[];
  /** Colour of each capsule (0 red, 1 blue, 2 yellow, 3 green), in that order. */
  capsules: number[];
  /** Start cell of each capsule. */
  start: number[];
  /** Dock cell of each capsule. */
  docks: number[];
  par: number;
  solution: Dir[];
  limit?: number;
}

export const CAPSULE_GLYPHS = 'RBYG';
export const DOCK_GLYPHS = 'rbyg';
export const PAD_GLYPHS = '^>v<';
export const PRESS_GLYPHS = 'URDL';
export const MIN_SIDE = 4;
export const MAX_SIDE = 8;
export const CAPSULE_NAMES = ['빨강', '파랑', '노랑', '초록'];

export class SpaceStageError extends Error {}

export const pressName = (d: Dir) => PRESS_GLYPHS[d];

export function parsePresses(s: string): Dir[] {
  return [...s].map((c) => {
    const d = PRESS_GLYPHS.indexOf(c);
    if (d < 0) throw new SpaceStageError(`bad press "${c}" in "${s}"`);
    return d as Dir;
  });
}

export function parseSpaceStage(def: SpaceStageDef, number: number): SpaceStage {
  const fail = (msg: string): never => {
    throw new SpaceStageError(`[${def.id}] ${msg}`);
  };
  const rows = def.map.map((r) => r.trim().split(/\s+/));
  const height = rows.length;
  const width = rows[0]?.length ?? 0;
  if (width < MIN_SIDE || width > MAX_SIDE || height < MIN_SIDE || height > MAX_SIDE) fail(`station must be ${MIN_SIDE}..${MAX_SIDE} on each side, got ${width}x${height}`);
  const tiles: Tile[] = [];
  const capsuleAt = new Map<number, number>();
  const dockAt = new Map<number, number>();
  const holes = new Map<number, number[]>();
  rows.forEach((row, y) => {
    if (row.length !== width) fail(`row ${y} has ${row.length} cells, expected ${width}`);
    row.forEach((g, x) => {
      const i = y * width + x;
      if (g === '.') tiles.push({ t: 'floor' });
      else if (g === '#') tiles.push({ t: 'wall', deco: 'panel' });
      else if (g === 'o') tiles.push({ t: 'wall', deco: 'rock' });
      else if (CAPSULE_GLYPHS.includes(g)) {
        const c = CAPSULE_GLYPHS.indexOf(g);
        if (capsuleAt.has(c)) fail(`two ${g} capsules`);
        capsuleAt.set(c, i);
        tiles.push({ t: 'floor' });
      } else if (DOCK_GLYPHS.includes(g)) {
        const c = DOCK_GLYPHS.indexOf(g);
        if (dockAt.has(c)) fail(`two ${g} docks`);
        dockAt.set(c, i);
        tiles.push({ t: 'dock', capsule: c });
      } else if (PAD_GLYPHS.includes(g)) tiles.push({ t: 'pad', dir: PAD_GLYPHS.indexOf(g) as Dir });
      else if (g === '1' || g === '2') {
        const pair = Number(g) - 1;
        (holes.get(pair) ?? holes.set(pair, []).get(pair)!).push(i);
        tiles.push({ t: 'hole', pair, twin: -1 });
      } else fail(`unknown glyph "${g}" at ${x},${y}`);
    });
  });
  for (const [pair, cells] of holes) {
    if (cells.length !== 2) fail(`wormhole ${pair + 1} has ${cells.length} ends`);
    tiles[cells[0]] = { t: 'hole', pair, twin: cells[1] };
    tiles[cells[1]] = { t: 'hole', pair, twin: cells[0] };
  }
  const capsules = [...capsuleAt.keys()].sort((a, b) => a - b);
  if (capsules.length === 0) fail('no capsule');
  for (const c of capsules) if (!dockAt.has(c)) fail(`capsule ${CAPSULE_GLYPHS[c]} has no dock`);
  for (const c of dockAt.keys()) if (!capsuleAt.has(c)) fail(`dock ${DOCK_GLYPHS[c]} has no capsule`);
  return {
    id: def.id,
    number,
    title: def.title,
    tip: def.tip,
    width,
    height,
    tiles,
    capsules,
    start: capsules.map((c) => capsuleAt.get(c)!),
    docks: capsules.map((c) => dockAt.get(c)!),
    par: def.par,
    solution: parsePresses(def.solution),
    limit: def.limit,
  };
}

/** The map rows of a stage, for printing a generated one as a definition. */
export function stageMap(stage: SpaceStage, at: number[] = stage.start): string[] {
  const glyph = (i: number): string => {
    const k = at.indexOf(i);
    if (k >= 0) return CAPSULE_GLYPHS[stage.capsules[k]];
    const t = stage.tiles[i];
    if (t.t === 'wall') return t.deco === 'rock' ? 'o' : '#';
    if (t.t === 'dock') return DOCK_GLYPHS[t.capsule];
    if (t.t === 'pad') return PAD_GLYPHS[t.dir];
    if (t.t === 'hole') return String(t.pair + 1);
    return '.';
  };
  return Array.from({ length: stage.height }, (_, y) => Array.from({ length: stage.width }, (_, x) => glyph(y * stage.width + x)).join(' '));
}
