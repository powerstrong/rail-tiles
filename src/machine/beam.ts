import { type Dir, DX, DY } from '../engine/dir';
import type { Color, MachineStage } from './model';

/** A straight piece of beam, in cell units (cell centres are x + 0.5). */
export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: Color;
}

export interface Lighting {
  segments: Segment[];
  /** Colours reaching each bulb / sensor cell. */
  lit: Map<number, Set<Color>>;
  doorsOpen: boolean;
  /** Bulbs that are satisfied. */
  litBulbs: Set<number>;
  won: boolean;
}

const COLOR_INDEX: Record<Color, number> = { white: 0, red: 1, blue: 2 };

/** '/' turns N↔E and S↔W; '\' turns N↔W and S↔E. */
export const reflect = (dir: Dir, back: boolean): Dir => (back ? ((3 - dir) as Dir) : ((dir ^ 1) as Dir));

function traceOnce(stage: MachineStage, config: number, doorsOpen: boolean) {
  const segments: Segment[] = [];
  const lit = new Map<number, Set<Color>>();
  const seen = new Set<number>();
  let sensor = false;
  const beams: { cell: number; dir: Dir; color: Color }[] = [];
  stage.tiles.forEach((t, i) => {
    if (t.t === 'laser') beams.push({ cell: i, dir: t.dir, color: t.color });
  });
  const centre = (c: number) => [(c % stage.width) + 0.5, Math.floor(c / stage.width) + 0.5];
  while (beams.length) {
    const b = beams.pop()!;
    let cell = b.cell;
    let dir = b.dir;
    for (;;) {
      const [x, y] = centre(cell);
      const nx = (cell % stage.width) + DX[dir];
      const ny = Math.floor(cell / stage.width) + DY[dir];
      const edge = { x1: x, y1: y, x2: x + DX[dir] * 0.5, y2: y + DY[dir] * 0.5, color: b.color };
      if (nx < 0 || ny < 0 || nx >= stage.width || ny >= stage.height) {
        segments.push(edge);
        break;
      }
      const next = ny * stage.width + nx;
      const tile = stage.tiles[next];
      if (tile.t === 'wall' || tile.t === 'laser' || (tile.t === 'door' && !doorsOpen)) {
        segments.push(edge);
        break;
      }
      segments.push({ x1: x, y1: y, x2: nx + 0.5, y2: ny + 0.5, color: b.color });
      if (tile.t === 'filter' && tile.color !== b.color) break;
      if (tile.t === 'bulb' || tile.t === 'sensor') {
        (lit.get(next) ?? lit.set(next, new Set()).get(next)!).add(b.color);
        if (tile.t === 'sensor') sensor = true;
      }
      if (tile.t === 'mirror') {
        const back = (config >> tile.device) & 1;
        if (tile.half) beams.push({ cell: next, dir, color: b.color });
        dir = reflect(dir, back === 1);
      }
      const key = (next * 4 + dir) * 3 + COLOR_INDEX[b.color];
      if (seen.has(key)) break;
      seen.add(key);
      cell = next;
    }
  }
  return { segments, lit, sensor };
}

export function bulbLit(need: 'any' | 'red' | 'blue' | 'purple', colors: Set<Color> | undefined): boolean {
  if (!colors || colors.size === 0) return false;
  if (need === 'any') return true;
  if (need === 'purple') return colors.has('red') && colors.has('blue');
  return colors.has(need);
}

/** Where every beam goes with the mirrors set to `config` (bit i set = device i is '\'). */
export function light(stage: MachineStage, config: number): Lighting {
  let r = traceOnce(stage, config, false);
  let doorsOpen = false;
  if (r.sensor) {
    // A lit sensor opens the doors; the extra light can only reach further, so one more pass settles it.
    doorsOpen = true;
    r = traceOnce(stage, config, true);
  }
  const litBulbs = new Set<number>();
  for (const b of stage.bulbs) {
    const t = stage.tiles[b];
    if (t.t === 'bulb' && bulbLit(t.need, r.lit.get(b))) litBulbs.add(b);
  }
  return { segments: r.segments, lit: r.lit, doorsOpen, litBulbs, won: litBulbs.size === stage.bulbs.length };
}
