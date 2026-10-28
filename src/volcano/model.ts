/**
 * Volcano world ("화산 섬"): lava puzzles. Tap grass to put a stone down (tap again to pick it
 * up), then press "분출!". The ground right next to a crater is too hot for stones. Lava pours
 * out of every crater and floods up, down, left and right over grass. Stones, rocks and the sea stop it. No house may burn, and every dragon egg must
 * be reached by the lava so it hatches. A small crater with a number only spills that many
 * cells far (counted along the lava's path), so stones can also make the path longer.
 *
 * Bonus stages ("대피 작전") are a race: the lava is already flowing. Each stone placed lets
 * the lava spread one more cell; seal it in before it reaches a house.
 *
 * Map glyphs (space separated):
 *   .  grass        R  rock          ~  sea
 *   V  crater (no limit)   1..9  small crater: lava spills that many cells
 *   H  house (must not burn)          E  dragon egg (must be reached)
 */

export type Tile =
  | { t: 'grass' }
  | { t: 'rock' }
  | { t: 'sea' }
  | { t: 'crater'; volume: number }
  | { t: 'house' }
  | { t: 'egg' };

export interface VolcanoStageDef {
  id: string;
  title: string;
  tip: string;
  map: string[];
  /** Fewest stones that win (★★★). Checked by tests. */
  par: number;
  /** Cells (x,y as "x,y") to put stones on. For a race stage, in the order to place them. */
  solution: string[];
  /** Bonus race: the lava spreads one step after every stone. */
  race?: boolean;
  boss?: boolean;
}

export interface VolcanoStage {
  id: string;
  number: number;
  title: string;
  tip: string;
  label?: string;
  width: number;
  height: number;
  tiles: Tile[];
  craters: number[];
  houses: number[];
  eggs: number[];
  par: number;
  /** Cell indices. */
  solution: number[];
  race?: boolean;
  boss?: boolean;
}

export const NO_LIMIT = 99;

export class VolcanoStageError extends Error {}

export const cellName = (stage: { width: number }, cell: number) => `${cell % stage.width},${Math.floor(cell / stage.width)}`;

export function parseVolcanoStage(def: VolcanoStageDef, number: number): VolcanoStage {
  const fail = (msg: string): never => {
    throw new VolcanoStageError(`[${def.id}] ${msg}`);
  };
  const rows = def.map.map((r) => r.trim().split(/\s+/));
  const height = rows.length;
  const width = rows[0]?.length ?? 0;
  if (width < 4 || width > 8 || height < 4 || height > 8) fail(`board must be 4..8 on each side, got ${width}x${height}`);
  const tiles: Tile[] = [];
  const craters: number[] = [];
  const houses: number[] = [];
  const eggs: number[] = [];
  rows.forEach((row, y) => {
    if (row.length !== width) fail(`row ${y} has ${row.length} cells, expected ${width}`);
    row.forEach((g, x) => {
      const i = y * width + x;
      if (g === '.') tiles.push({ t: 'grass' });
      else if (g === 'R') tiles.push({ t: 'rock' });
      else if (g === '~') tiles.push({ t: 'sea' });
      else if (g === 'H') {
        houses.push(i);
        tiles.push({ t: 'house' });
      } else if (g === 'E') {
        eggs.push(i);
        tiles.push({ t: 'egg' });
      } else if (g === 'V' || /^[1-9]$/.test(g)) {
        craters.push(i);
        tiles.push({ t: 'crater', volume: g === 'V' ? NO_LIMIT : Number(g) });
      } else fail(`unknown glyph "${g}" at ${x},${y}`);
    });
  });
  if (craters.length === 0) fail('no crater');
  if (houses.length === 0) fail('no house');
  const solution = def.solution.map((s) => {
    const [x, y] = s.split(',').map(Number);
    if (!(x >= 0 && x < width && y >= 0 && y < height)) fail(`solution cell ${s} is off the board`);
    return y * width + x;
  });
  return { id: def.id, number, title: def.title, tip: def.tip, width, height, tiles, craters, houses, eggs, par: def.par, solution, race: def.race, boss: def.boss };
}
