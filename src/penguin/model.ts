import { type Dir, type DirName, DX, DY, dirFromName } from '../engine/dir';

/**
 * Penguin world ("펭귄 얼음 나라"): slide puzzles on ice.
 *
 * A push sends one penguin sliding in a straight line until something stops it. It wins when
 * every penguin rests on its own fishing hole at the same time and every fish has been picked up.
 *
 * Map glyphs (space separated, like the train stages):
 *   .  ice              R  rock (stops a penguin before it)   M  snowman (same as a rock)
 *   W  open water: a penguin sliding into it falls in (that push fails)
 *   *  snow pile: a penguin sliding onto it sinks in and stops there
 *   F  fish: picked up by any penguin sliding over or stopping on it
 *   x  cracked ice: breaks into water once a penguin has left it
 *   ^ > v <  sea current: turns a sliding penguin to face that way
 *   a b c  penguins       A B C  their fishing holes (stop on it to win; sliding over does nothing)
 *   1 2 3 …  igloos in pairs: slide into the door and pop out of the other igloo's door
 * Igloo doors are given in `igloos: { '1': ['E', 'W'] }`, first and second igloo in reading order.
 */

export type Tile =
  | { t: 'ice' }
  | { t: 'rock'; deco: 'rock' | 'snowman' }
  | { t: 'water' }
  | { t: 'snow' }
  | { t: 'crack'; index: number }
  | { t: 'current'; dir: Dir }
  | { t: 'igloo'; door: Dir; pair: number; label: string };

export interface PenguinStageDef {
  id: string;
  title: string;
  tip: string;
  map: string[];
  igloos?: Record<string, [DirName, DirName]>;
  /** The fewest pushes that win (★★★). Checked by tests against the solver. */
  par: number;
  /** One shortest solution, as push letters: 'a>' 'b^' … (penguin + direction). */
  solution: string[];
}

export interface PenguinStage {
  id: string;
  number: number;
  title: string;
  tip: string;
  label?: string;
  width: number;
  height: number;
  tiles: Tile[];
  /** Penguin start cells, in id order (a, b, c). */
  penguins: number[];
  /** Fishing hole cell per penguin, same order. */
  homes: number[];
  /** Fish cells; the bit index of each fish in the state is its position here. */
  fish: number[];
  /** Number of cracked-ice tiles (bit indices in the state). */
  cracks: number;
  par: number;
  solution: Push[];
}

export interface Push {
  penguin: number;
  dir: Dir;
}

export const PENGUIN_IDS = ['a', 'b', 'c'] as const;
const ARROWS: Record<string, Dir> = { '^': 0, '>': 1, v: 2, '<': 3 };
const ARROW_OF = ['^', '>', 'v', '<'];
export const MIN_SIDE = 5;
export const MAX_SIDE = 8;

export class PenguinStageError extends Error {}

export function pushName(p: Push): string {
  return `${PENGUIN_IDS[p.penguin]}${ARROW_OF[p.dir]}`;
}

export function parsePush(s: string): Push {
  const penguin = PENGUIN_IDS.indexOf(s[0] as (typeof PENGUIN_IDS)[number]);
  const dir = ARROWS[s[1]];
  if (penguin < 0 || dir === undefined) throw new PenguinStageError(`bad push "${s}"`);
  return { penguin, dir };
}

export function parsePenguinStage(def: PenguinStageDef, number: number): PenguinStage {
  const fail = (msg: string): never => {
    throw new PenguinStageError(`[${def.id}] ${msg}`);
  };
  const rows = def.map.map((r) => r.trim().split(/\s+/));
  const height = rows.length;
  const width = rows[0]?.length ?? 0;
  if (width < MIN_SIDE || width > MAX_SIDE || height < MIN_SIDE || height > MAX_SIDE) {
    fail(`board must be ${MIN_SIDE}..${MAX_SIDE} on each side, got ${width}x${height}`);
  }
  const tiles: Tile[] = [];
  const penguins: (number | undefined)[] = [];
  const homes: (number | undefined)[] = [];
  const fish: number[] = [];
  const igloos: Record<string, number[]> = {};
  let cracks = 0;
  rows.forEach((row, y) => {
    if (row.length !== width) fail(`row ${y} has ${row.length} cells, expected ${width}`);
    row.forEach((g, x) => {
      const i = y * width + x;
      if (g === '.') tiles.push({ t: 'ice' });
      else if (g === 'R') tiles.push({ t: 'rock', deco: 'rock' });
      else if (g === 'M') tiles.push({ t: 'rock', deco: 'snowman' });
      else if (g === 'W') tiles.push({ t: 'water' });
      else if (g === '*') tiles.push({ t: 'snow' });
      else if (g === 'F') {
        tiles.push({ t: 'ice' });
        fish.push(i);
      } else if (g === 'x') tiles.push({ t: 'crack', index: cracks++ });
      else if (ARROWS[g] !== undefined) tiles.push({ t: 'current', dir: ARROWS[g] });
      else if (PENGUIN_IDS.includes(g as 'a')) {
        const k = PENGUIN_IDS.indexOf(g as 'a');
        if (penguins[k] !== undefined) fail(`two penguins "${g}"`);
        penguins[k] = i;
        tiles.push({ t: 'ice' });
      } else if (PENGUIN_IDS.includes(g.toLowerCase() as 'a') && g !== g.toLowerCase()) {
        const k = PENGUIN_IDS.indexOf(g.toLowerCase() as 'a');
        if (homes[k] !== undefined) fail(`two holes "${g}"`);
        homes[k] = i;
        tiles.push({ t: 'ice' });
      } else if (/^[1-9]$/.test(g)) {
        (igloos[g] ??= []).push(i);
        tiles.push({ t: 'ice' }); // replaced below
      } else fail(`unknown glyph "${g}" at ${x},${y}`);
    });
  });
  for (const [label, cells] of Object.entries(igloos)) {
    const doors = def.igloos?.[label];
    if (cells.length !== 2) fail(`igloo "${label}" needs exactly two igloos`);
    if (!doors) fail(`igloo "${label}" has no doors in igloos`);
    cells.forEach((cell, k) => {
      const door = dirFromName(doors![k]);
      const nx = (cell % width) + DX[door];
      const ny = Math.floor(cell / width) + DY[door];
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) fail(`igloo "${label}" door ${k + 1} faces off the board`);
      tiles[cell] = { t: 'igloo', door, pair: cells[1 - k], label };
    });
  }
  const count = penguins.length;
  if (count === 0) fail('no penguin');
  for (let k = 0; k < count; k++) {
    if (penguins[k] === undefined) fail(`penguin ${PENGUIN_IDS[k]} missing`);
    if (homes[k] === undefined) fail(`hole ${PENGUIN_IDS[k].toUpperCase()} missing`);
  }
  if (homes.length !== count) fail('a hole has no penguin');
  if (fish.length > 12) fail('at most 12 fish');
  if (cracks > 16) fail('at most 16 cracked tiles');
  return {
    id: def.id,
    number,
    title: def.title,
    tip: def.tip,
    width,
    height,
    tiles,
    penguins: penguins as number[],
    homes: homes as number[],
    fish,
    cracks,
    par: def.par,
    solution: def.solution.map(parsePush),
  };
}
