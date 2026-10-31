import { type Dir, type DirName, dirFromName } from '../engine/dir';

/**
 * Train depot world ("기차 차고지"): sliding-block puzzles.
 *
 * Every wagon runs on its own line: a horizontal one slides left and right along its row, a
 * vertical one up and down its column, as far as the way is clear. One drag of one wagon is one
 * move, however far it goes. A locomotive leaves through its gate on the edge of the yard once
 * the way to the gate is clear; the stage is won when every locomotive has left.
 *
 * Chapter 2 adds level crossings: a barrier cell is closed unless another wagon is parked on a
 * button (the wagon moving never holds it open for itself). A closed barrier only stops wagons
 * coming in: one already standing on it can always drive off.
 *
 * Map glyphs (space separated):
 *   .  track            t  water tower (blocks)      x  stacked crates (blocks)
 *   +  button            =  barrier
 *   r  red locomotive    b  blue locomotive (2 cells each; gates in `exits`)
 *   A..P  wagons: 2 cells is a coach, 3 cells a freight wagon
 * Buttons and barriers under a wagon at the start go in `under: { 'x,y': '+' }`.
 */

export type Tile = { t: 'track' } | { t: 'block'; deco: 'tower' | 'crates' } | { t: 'button' } | { t: 'barrier' };

export type VehicleKind = 'loco' | 'coach' | 'freight';

export interface Vehicle {
  glyph: string;
  kind: VehicleKind;
  /** Horizontal vehicles slide along their row, vertical ones along their column. */
  horizontal: boolean;
  /** The row (horizontal) or column (vertical) it runs on. */
  line: number;
  len: number;
  /** Locomotives only: the side of the yard its gate is on (along its own line). */
  exit?: Dir;
  /** Colour slot within its kind. */
  color: number;
}

export interface DepotStageDef {
  id: string;
  title: string;
  tip: string;
  map: string[];
  /** Gate side per locomotive, e.g. `{ r: 'E' }`. */
  exits: Partial<Record<LocoGlyph, DirName>>;
  under?: Record<string, '+' | '='>;
  /** Fewest moves that win (★★★). Checked by tests against the solver. */
  par: number;
  /** One shortest solution: `A+2` (wagon A two cells right/down), `B-1`, `r!` (locomotive r leaves). */
  solution: string[];
  /** Bonus stage ("출발 시각!"): this many moves and no undo. */
  limit?: number;
}

export interface DepotStage {
  id: string;
  number: number;
  title: string;
  tip: string;
  label?: string;
  width: number;
  height: number;
  tiles: Tile[];
  /** Locomotives first (r, then b), then wagons in letter order. */
  vehicles: Vehicle[];
  /** Start offset of each vehicle along its line (its left or top cell). */
  start: number[];
  buttons: number[];
  barriers: number[];
  par: number;
  solution: Move[];
  limit?: number;
}

/** Move a vehicle to an offset on its line, or a locomotive out through its gate (`to` = GONE). */
export interface Move {
  vehicle: number;
  to: number;
}

export const GONE = -1;
export const LOCO_GLYPHS = ['r', 'b'] as const;
export type LocoGlyph = (typeof LOCO_GLYPHS)[number];
const WAGON_GLYPHS = 'ABCDEFGHIJKLMNOP';
export const MIN_SIDE = 4;
export const MAX_SIDE = 8;

export class DepotStageError extends Error {}

/** Cell index of a vehicle's k-th cell at offset `off`. */
export function cellOf(stage: Pick<DepotStage, 'width'>, v: Vehicle, off: number, k: number): number {
  return v.horizontal ? v.line * stage.width + off + k : (off + k) * stage.width + v.line;
}

/** `A+2`, `B-1` or `r!`, given where the vehicle was. */
export function moveName(stage: DepotStage, from: number, m: Move): string {
  const v = stage.vehicles[m.vehicle];
  if (m.to === GONE) return `${v.glyph}!`;
  const d = m.to - from;
  return `${v.glyph}${d > 0 ? '+' : ''}${d}`;
}

/** Reads `A+2` / `r!` against the offsets before the move. */
export function parseMove(stage: Pick<DepotStage, 'vehicles'>, offsets: number[], s: string): Move {
  const vehicle = stage.vehicles.findIndex((v) => v.glyph === s[0]);
  if (vehicle < 0) throw new DepotStageError(`bad move "${s}": no vehicle ${s[0]}`);
  if (s.slice(1) === '!') return { vehicle, to: GONE };
  const d = Number(s.slice(1));
  if (!Number.isInteger(d) || d === 0) throw new DepotStageError(`bad move "${s}"`);
  return { vehicle, to: offsets[vehicle] + d };
}

export function parseDepotStage(def: DepotStageDef, number: number): DepotStage {
  const fail = (msg: string): never => {
    throw new DepotStageError(`[${def.id}] ${msg}`);
  };
  const rows = def.map.map((r) => r.trim().split(/\s+/));
  const height = rows.length;
  const width = rows[0]?.length ?? 0;
  if (width < MIN_SIDE || width > MAX_SIDE || height < MIN_SIDE || height > MAX_SIDE) fail(`yard must be ${MIN_SIDE}..${MAX_SIDE} on each side, got ${width}x${height}`);
  const tiles: Tile[] = [];
  const cells = new Map<string, number[]>();
  rows.forEach((row, y) => {
    if (row.length !== width) fail(`row ${y} has ${row.length} cells, expected ${width}`);
    row.forEach((g, x) => {
      const i = y * width + x;
      if (g === '.') tiles.push({ t: 'track' });
      else if (g === 't') tiles.push({ t: 'block', deco: 'tower' });
      else if (g === 'x') tiles.push({ t: 'block', deco: 'crates' });
      else if (g === '+') tiles.push({ t: 'button' });
      else if (g === '=') tiles.push({ t: 'barrier' });
      else if (LOCO_GLYPHS.includes(g as LocoGlyph) || WAGON_GLYPHS.includes(g)) {
        (cells.get(g) ?? cells.set(g, []).get(g)!).push(i);
        const mark = def.under?.[`${x},${y}`];
        tiles.push(mark === '+' ? { t: 'button' } : mark === '=' ? { t: 'barrier' } : { t: 'track' });
      } else fail(`unknown glyph "${g}" at ${x},${y}`);
    });
  });
  for (const key of Object.keys(def.under ?? {})) {
    const [x, y] = key.split(',').map(Number);
    const g = rows[y]?.[x];
    if (!g || !cells.has(g)) fail(`under ${key} is not under a vehicle`);
  }

  const glyphs = [...LOCO_GLYPHS.filter((g) => cells.has(g)), ...[...WAGON_GLYPHS].filter((g) => cells.has(g))];
  if (!glyphs.some((g) => LOCO_GLYPHS.includes(g as LocoGlyph))) fail('no locomotive');
  const vehicles: Vehicle[] = [];
  const start: number[] = [];
  let coaches = 0;
  let freights = 0;
  for (const glyph of glyphs) {
    const list = cells.get(glyph)!.sort((a, b) => a - b);
    const xs = list.map((c) => c % width);
    const ys = list.map((c) => Math.floor(c / width));
    const horizontal = ys.every((y) => y === ys[0]);
    const vertical = xs.every((x) => x === xs[0]);
    if (!horizontal && !vertical) fail(`vehicle ${glyph} is not in a straight line`);
    const len = list.length;
    const along = horizontal ? xs : ys;
    if (along.some((p, k) => p !== along[0] + k)) fail(`vehicle ${glyph} has a gap`);
    const isLoco = LOCO_GLYPHS.includes(glyph as LocoGlyph);
    if (isLoco ? len !== 2 : len < 2 || len > 3) fail(`vehicle ${glyph} is ${len} cells long`);
    const v: Vehicle = {
      glyph,
      kind: isLoco ? 'loco' : len === 3 ? 'freight' : 'coach',
      horizontal,
      line: horizontal ? ys[0] : xs[0],
      len,
      color: isLoco ? LOCO_GLYPHS.indexOf(glyph as LocoGlyph) : len === 3 ? freights++ : coaches++,
    };
    if (isLoco) {
      const name = def.exits[glyph as LocoGlyph];
      if (!name) fail(`locomotive ${glyph} has no gate in exits`);
      const exit = dirFromName(name!);
      if (horizontal !== (exit === 1 || exit === 3)) fail(`locomotive ${glyph}'s gate ${name} is not along its line`);
      v.exit = exit;
    }
    vehicles.push(v);
    start.push(along[0]);
  }
  for (const key of Object.keys(def.exits)) if (!cells.has(key)) fail(`gate for a missing locomotive ${key}`);

  const stage: DepotStage = {
    id: def.id,
    number,
    title: def.title,
    tip: def.tip,
    width,
    height,
    tiles,
    vehicles,
    start,
    buttons: tiles.flatMap((t, i) => (t.t === 'button' ? [i] : [])),
    barriers: tiles.flatMap((t, i) => (t.t === 'barrier' ? [i] : [])),
    par: def.par,
    solution: [],
    limit: def.limit,
  };
  if (stage.barriers.length > 0 && stage.buttons.length === 0) fail('barriers but no button');
  // Solution moves are relative, so read them while walking the offsets forward.
  const offsets = [...start];
  for (const s of def.solution) {
    const m = parseMove(stage, offsets, s);
    stage.solution.push(m);
    offsets[m.vehicle] = m.to;
  }
  return stage;
}
