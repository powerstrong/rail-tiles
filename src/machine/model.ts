import { type Dir, type DirName, dirFromName } from '../engine/dir';

/**
 * Machine world ("로봇 공장"): laser puzzles. Tap a mirror to turn it (/ ↔ \). Every bulb
 * must be lit at once. Beams pass through bulbs and sensors, bounce off mirrors, split at
 * half mirrors, stop at walls, closed doors, the board edge and wrong-coloured filters.
 *
 * Map glyphs (space separated):
 *   .  floor        #  wall
 *   L  laser: direction and colour in `lasers`, in reading order
 *   m  mirror /     n  mirror \        (tap to turn)
 *   M  bolted /     N  bolted \        (cannot turn)
 *   s  half mirror /   t  half mirror \  (splits the beam; tap to turn)
 *   o  bulb (any light)   r  red bulb   u  blue bulb   p  purple bulb (red and blue)
 *   R  red filter (only red passes)     U  blue filter
 *   x  light sensor: while lit, every door D is open
 */

export type Color = 'white' | 'red' | 'blue';

export type Tile =
  | { t: 'floor' }
  | { t: 'wall' }
  | { t: 'laser'; dir: Dir; color: Color }
  | { t: 'mirror'; device: number; fixed: boolean; half: boolean }
  | { t: 'bulb'; need: 'any' | 'red' | 'blue' | 'purple' }
  | { t: 'filter'; color: 'red' | 'blue' }
  | { t: 'sensor' }
  | { t: 'door' };

export interface MachineStageDef {
  id: string;
  title: string;
  tip: string;
  map: string[];
  lasers: [DirName, Color][];
  /** Fewest taps that light every bulb (★★★). Checked by tests. */
  par: number;
  /** Device indices (reading order of m n s t M N) to tap once each. */
  solution: number[];
  /** Bonus stage: the robot's battery, one bar per tap. */
  battery?: number;
  /** Boss stage marker (shown on the card and in the header). */
  boss?: boolean;
}

export interface MachineStage {
  id: string;
  number: number;
  title: string;
  tip: string;
  label?: string;
  width: number;
  height: number;
  tiles: Tile[];
  /** Cell of each device (mirror or half mirror), by device index. */
  devices: number[];
  /** Initial orientation bitmask: bit i set = device i is '\'. */
  start: number;
  /** Bitmask of devices the player may turn. */
  turnable: number;
  bulbs: number[];
  par: number;
  solution: number[];
  battery?: number;
  boss?: boolean;
}

export class MachineStageError extends Error {}

export function parseMachineStage(def: MachineStageDef, number: number): MachineStage {
  const fail = (msg: string): never => {
    throw new MachineStageError(`[${def.id}] ${msg}`);
  };
  const rows = def.map.map((r) => r.trim().split(/\s+/));
  const height = rows.length;
  const width = rows[0]?.length ?? 0;
  if (width < 4 || width > 8 || height < 4 || height > 8) fail(`board must be 4..8 on each side, got ${width}x${height}`);
  const tiles: Tile[] = [];
  const devices: number[] = [];
  const bulbs: number[] = [];
  let start = 0;
  let turnable = 0;
  let lasers = 0;
  rows.forEach((row, y) => {
    if (row.length !== width) fail(`row ${y} has ${row.length} cells, expected ${width}`);
    row.forEach((g, x) => {
      const i = y * width + x;
      const device = (fixed: boolean, half: boolean, back: boolean) => {
        const d = devices.length;
        if (d >= 20) fail('at most 20 mirrors');
        devices.push(i);
        if (back) start |= 1 << d;
        if (!fixed) turnable |= 1 << d;
        tiles.push({ t: 'mirror', device: d, fixed, half });
      };
      if (g === '.') tiles.push({ t: 'floor' });
      else if (g === '#') tiles.push({ t: 'wall' });
      else if (g === 'L') {
        const l = def.lasers[lasers++];
        if (!l) fail(`laser ${lasers} has no entry in lasers`);
        tiles.push({ t: 'laser', dir: dirFromName(l[0]), color: l[1] });
      } else if (g === 'm') device(false, false, false);
      else if (g === 'n') device(false, false, true);
      else if (g === 'M') device(true, false, false);
      else if (g === 'N') device(true, false, true);
      else if (g === 's') device(false, true, false);
      else if (g === 't') device(false, true, true);
      else if (g === 'o' || g === 'r' || g === 'u' || g === 'p') {
        bulbs.push(i);
        tiles.push({ t: 'bulb', need: g === 'o' ? 'any' : g === 'r' ? 'red' : g === 'u' ? 'blue' : 'purple' });
      } else if (g === 'R') tiles.push({ t: 'filter', color: 'red' });
      else if (g === 'U') tiles.push({ t: 'filter', color: 'blue' });
      else if (g === 'x') tiles.push({ t: 'sensor' });
      else if (g === 'D') tiles.push({ t: 'door' });
      else fail(`unknown glyph "${g}" at ${x},${y}`);
    });
  });
  if (lasers === 0) fail('no laser');
  if (lasers !== def.lasers.length) fail('more lasers listed than on the map');
  if (bulbs.length === 0) fail('no bulb');
  return {
    id: def.id,
    number,
    title: def.title,
    tip: def.tip,
    width,
    height,
    tiles,
    devices,
    start,
    turnable,
    bulbs,
    par: def.par,
    solution: def.solution,
    battery: def.battery,
    boss: def.boss,
  };
}
