import { type Dir, type DirName, DX, DY, dirFromName } from './dir';
import { RAIL_GLYPHS, type Rail, type RailKind } from './rail';

export type Decoration = 'tree' | 'rock' | 'mountain' | 'water' | 'house';

export type Cell =
  | { type: 'empty'; waypoint: boolean }
  | { type: 'obstacle'; deco: Decoration }
  /** `bridge` is purely visual: a fixed straight drawn as a bridge over water. */
  | { type: 'fixed'; rail: Rail; bridge: boolean }
  | { type: 'start' }
  | { type: 'goal' }
  /** Tunnel mouth: track meets it through `dir`; the train re-emerges from `pair`. */
  | { type: 'tunnel'; dir: Dir; pair: Pos; label: string }
  /**
   * Fixed switch: a trunk edge and two branches (straight across, or `turn`).
   * Entering from the trunk follows the current branch and then flips it;
   * entering from either branch always leaves through the trunk.
   */
  | { type: 'switch'; trunk: Dir; turn: Dir; initial: SwitchState; label: string };

/** 0: trunk ↔ straight branch, 1: trunk ↔ turn branch. */
export type SwitchState = 0 | 1;

export interface Pos {
  x: number;
  y: number;
}

export interface Station extends Pos {
  /** start: the edge the train leaves through. goal: the edge the track must arrive through. */
  dir: Dir;
}

export type Inventory = Record<RailKind, number>;

export interface SwitchDef {
  trunk: DirName;
  /** The side the curved branch leaves through (perpendicular to the trunk). */
  turn: DirName;
  /** Which branch is set at the start. Default: straight. */
  initial?: 'straight' | 'turn';
}

export interface Placement extends Pos {
  rail: Rail;
}

export interface Stage {
  id: string;
  number: number;
  title: string;
  tip: string;
  width: number;
  height: number;
  cells: Cell[];
  start: Station;
  goal: Station;
  inventory: Inventory;
  waypoints: Pos[];
  /** Cell keys of every switch, in reading order (fixes the order of switch state signatures). */
  switches: string[];
  /** A shortest solution (tests check it uses exactly `par` rails). Drives hints and the stage-1 ghost. */
  solution: Placement[];
  /** Fewest player rails that can win: the ★★★ target. */
  par: number;
  ghostHint: boolean;
}

/**
 * Authoring format. `map` rows are space-separated glyphs:
 *   .  empty     P  passenger stop (empty, must be visited)
 *   S  start     G  goal
 *   T  tree      R  rock      M  mountain   W  water   H  house
 *   │ ─ └ ┌ ┐ ┘  fixed rail       ║ ═  fixed bridge over water
 *   ┼            fixed crossing
 *   1 2 3 …      switches, configured in `switches[digit]`
 *   a b c …      tunnel mouths: each lowercase letter appears exactly twice;
 *                `tunnels[letter]` gives the opening side of the first and second
 *                occurrence in reading order (row by row, left to right)
 * `solution` uses the same grid, with rail glyphs on the cells the player fills.
 * It must be a shortest solution: its rail count becomes the stage's par.
 */
export interface StageDef {
  id: string;
  title: string;
  tip: string;
  map: string[];
  start: DirName;
  goal: DirName;
  /** `cross` defaults to 0. */
  inventory: { straight: number; curve: number; cross?: number };
  solution: string[];
  tunnels?: Record<string, [DirName, DirName]>;
  switches?: Record<string, SwitchDef>;
  ghostHint?: boolean;
}

export const MIN_SIZE = 5;
export const MAX_SIZE = 7;

const BRIDGE_GLYPHS: Record<string, Rail> = {
  '║': { kind: 'straight', rot: 0 },
  '═': { kind: 'straight', rot: 1 },
};

const DECORATIONS: Record<string, Decoration> = {
  T: 'tree',
  R: 'rock',
  M: 'mountain',
  W: 'water',
  H: 'house',
};

function splitRow(row: string): string[] {
  return row.trim().split(/\s+/);
}

export class StageError extends Error {}

export function parseStage(def: StageDef, number: number): Stage {
  const rows = def.map.map(splitRow);
  const height = rows.length;
  const width = rows[0]?.length ?? 0;
  const fail = (msg: string): never => {
    throw new StageError(`[${def.id}] ${msg}`);
  };

  if (width < MIN_SIZE || width > MAX_SIZE || height < MIN_SIZE || height > MAX_SIZE) {
    fail(`board must be ${MIN_SIZE}..${MAX_SIZE} on each side, got ${width}x${height}`);
  }

  const cells: Cell[] = [];
  const waypoints: Pos[] = [];
  const mouths: Record<string, { index: number; pos: Pos }[]> = {};
  const switches: string[] = [];
  let start: Pos | null = null;
  let goal: Pos | null = null;

  rows.forEach((row, y) => {
    if (row.length !== width) fail(`row ${y} has ${row.length} cells, expected ${width}`);
    row.forEach((glyph, x) => {
      if (glyph === '.') cells.push({ type: 'empty', waypoint: false });
      else if (glyph === 'P') {
        cells.push({ type: 'empty', waypoint: true });
        waypoints.push({ x, y });
      } else if (glyph === 'S') {
        if (start) fail('more than one start');
        start = { x, y };
        cells.push({ type: 'start' });
      } else if (glyph === 'G') {
        if (goal) fail('more than one goal');
        goal = { x, y };
        cells.push({ type: 'goal' });
      } else if (DECORATIONS[glyph]) cells.push({ type: 'obstacle', deco: DECORATIONS[glyph] });
      else if (RAIL_GLYPHS[glyph]) cells.push({ type: 'fixed', rail: { ...RAIL_GLYPHS[glyph] }, bridge: false });
      else if (BRIDGE_GLYPHS[glyph]) cells.push({ type: 'fixed', rail: { ...BRIDGE_GLYPHS[glyph] }, bridge: true });
      else if (/^[1-9]$/.test(glyph)) {
        const sw = def.switches?.[glyph];
        if (!sw) fail(`switch "${glyph}" at ${x},${y} has no entry in switches`);
        const trunk = dirFromName(sw!.trunk);
        const turn = dirFromName(sw!.turn);
        if (turn === trunk || (turn + 2) % 4 === trunk) fail(`switch "${glyph}" must turn sideways from its trunk`);
        switches.push(cellKey(x, y));
        cells.push({ type: 'switch', trunk, turn, initial: sw!.initial === 'turn' ? 1 : 0, label: glyph });
      } else if (/^[a-z]$/.test(glyph)) {
        (mouths[glyph] ??= []).push({ index: cells.length, pos: { x, y } });
        cells.push({ type: 'empty', waypoint: false }); // replaced once both mouths are known
      }
      else fail(`unknown glyph "${glyph}" at ${x},${y}`);
    });
  });

  for (const [label, pair] of Object.entries(mouths)) {
    const dirs = def.tunnels?.[label];
    if (pair.length !== 2) fail(`tunnel "${label}" needs exactly two mouths, found ${pair.length}`);
    if (!dirs) fail(`tunnel "${label}" has no entry in tunnels`);
    pair.forEach((mouth, i) => {
      const other = pair[1 - i].pos;
      const dir = dirFromName(dirs![i]);
      const nx = mouth.pos.x + DX[dir];
      const ny = mouth.pos.y + DY[dir];
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) fail(`tunnel "${label}" mouth ${i + 1} faces off the board`);
      cells[mouth.index] = { type: 'tunnel', dir, pair: { ...other }, label };
    });
  }
  for (const label of Object.keys(def.tunnels ?? {})) {
    if (!mouths[label]) fail(`tunnels.${label} has no mouths on the map`);
  }

  if (!start) return fail('missing start (S)');
  if (!goal) return fail('missing goal (G)');

  const startStation: Station = { ...(start as Pos), dir: dirFromName(def.start) };
  const goalStation: Station = { ...(goal as Pos), dir: dirFromName(def.goal) };
  for (const [name, st] of [['start', startStation], ['goal', goalStation]] as const) {
    const nx = st.x + DX[st.dir];
    const ny = st.y + DY[st.dir];
    if (nx < 0 || ny < 0 || nx >= width || ny >= height) fail(`${name} station faces off the board`);
  }

  const inventory: Inventory = { straight: def.inventory.straight, curve: def.inventory.curve, cross: def.inventory.cross ?? 0 };
  for (const kind of ['straight', 'curve', 'cross'] as const) {
    const n = inventory[kind];
    if (!Number.isInteger(n) || n < 0) fail(`inventory.${kind} must be a non-negative integer`);
  }

  const solRows = def.solution.map(splitRow);
  if (solRows.length !== height || solRows.some((r) => r.length !== width)) {
    fail('solution grid must match the map size');
  }
  const solution: Placement[] = [];
  solRows.forEach((row, y) =>
    row.forEach((glyph, x) => {
      if (glyph === '.') return;
      const rail = RAIL_GLYPHS[glyph];
      if (!rail) fail(`unknown solution glyph "${glyph}" at ${x},${y}`);
      if (cells[y * width + x].type !== 'empty') fail(`solution places a rail on a non-empty cell ${x},${y}`);
      solution.push({ x, y, rail: { ...rail } });
    }),
  );

  return {
    id: def.id,
    number,
    title: def.title,
    tip: def.tip,
    width,
    height,
    cells,
    start: startStation,
    goal: goalStation,
    inventory,
    waypoints,
    switches,
    solution,
    par: solution.length,
    ghostHint: def.ghostHint ?? false,
  };
}

export function inBounds(stage: Stage, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < stage.width && y < stage.height;
}

export function cellAt(stage: Stage, x: number, y: number): Cell | null {
  return inBounds(stage, x, y) ? stage.cells[y * stage.width + x] : null;
}

export function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}
