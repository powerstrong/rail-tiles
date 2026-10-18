import { ALL_DIRS, type Dir, DX, DY, opposite } from './dir';
import { type Rail, type RailKind, hasPort, normalizeRot, railPorts, rotationCount } from './rail';
import { railAt } from './simulate';
import { type Cell, type Inventory, type Stage, cellAt, cellKey } from './stage';

/** A player-placed rail. `spin` counts quarter turns ever applied, so the UI can animate 3 → 0 forwards. */
export interface PlacedRail extends Rail {
  spin: number;
}

export type Placements = Readonly<Record<string, PlacedRail>>;

export interface EditorState {
  placed: Placements;
  history: Placements[];
}

const HISTORY_LIMIT = 200;

export function createEditor(): EditorState {
  return { placed: {}, history: [] };
}

export function remaining(stage: Stage, placed: Placements): Inventory {
  const left: Inventory = { ...stage.inventory };
  for (const rail of Object.values(placed)) left[rail.kind] -= 1;
  return left;
}

export function usedCount(placed: Placements): number {
  return Object.keys(placed).length;
}

function commit(state: EditorState, placed: Placements): EditorState {
  const history = [...state.history, state.placed];
  if (history.length > HISTORY_LIMIT) history.shift();
  return { placed, history };
}

export type PlaceBlock = 'not_empty' | 'none_left' | null;

export function placeBlock(stage: Stage, placed: Placements, x: number, y: number, kind: RailKind): PlaceBlock {
  const cell = cellAt(stage, x, y);
  if (!cell || cell.type !== 'empty' || placed[cellKey(x, y)]) return 'not_empty';
  if (remaining(stage, placed)[kind] <= 0) return 'none_left';
  return null;
}

/** Returns the same state object when the action does nothing, so callers can detect a no-op. */
export function placeRail(stage: Stage, state: EditorState, x: number, y: number, kind: RailKind): EditorState {
  if (placeBlock(stage, state.placed, x, y, kind)) return state;
  const rot = autoOrient(stage, state.placed, x, y, kind);
  return commit(state, { ...state.placed, [cellKey(x, y)]: { kind, rot, spin: rot } });
}

/**
 * Swaps a placed rail for the other kind in one step: the old piece goes back to the
 * inventory and the new one is auto-oriented. No-op if the cell holds the same kind,
 * holds nothing, or none of the new kind are left.
 */
export function replaceRail(stage: Stage, state: EditorState, x: number, y: number, kind: RailKind): EditorState {
  const key = cellKey(x, y);
  const current = state.placed[key];
  if (!current || current.kind === kind) return state;
  if (remaining(stage, state.placed)[kind] <= 0) return state;
  const without = { ...state.placed };
  delete without[key];
  const rot = autoOrient(stage, without, x, y, kind);
  return commit(state, { ...without, [key]: { kind, rot, spin: rot } });
}

export function rotateRail(state: EditorState, x: number, y: number): EditorState {
  const key = cellKey(x, y);
  const rail = state.placed[key];
  if (!rail) return state;
  const spin = rail.spin + 1;
  return commit(state, { ...state.placed, [key]: { ...rail, spin, rot: normalizeRot(rail.kind, spin) } });
}

export function eraseRail(state: EditorState, x: number, y: number): EditorState {
  const key = cellKey(x, y);
  if (!state.placed[key]) return state;
  const placed = { ...state.placed };
  delete placed[key];
  return commit(state, placed);
}

export function resetBoard(state: EditorState): EditorState {
  if (usedCount(state.placed) === 0) return state;
  return commit(state, {});
}

export function undo(state: EditorState): EditorState {
  if (state.history.length === 0) return state;
  return { placed: state.history[state.history.length - 1], history: state.history.slice(0, -1) };
}

function switchPorts(cell: Extract<Cell, { type: 'switch' }>): Dir[] {
  return [cell.trunk, opposite(cell.trunk), cell.turn];
}

/** Does the neighbour on side `d` of (x, y) offer a connection into this cell? */
function neighbourWants(stage: Stage, placed: Placements, x: number, y: number, d: Dir): boolean {
  const nx = x + DX[d];
  const ny = y + DY[d];
  const back = opposite(d);
  if (stage.start.x === nx && stage.start.y === ny) return stage.start.dir === back;
  if (stage.goal.x === nx && stage.goal.y === ny) return stage.goal.dir === back;
  const cell = cellAt(stage, nx, ny);
  if (cell?.type === 'tunnel') return cell.dir === back;
  if (cell?.type === 'switch') return switchPorts(cell).includes(back);
  const rail = railAt(stage, placed, nx, ny);
  return rail !== null && hasPort(rail, back);
}

/** Could track leaving (x, y) through side `d` possibly continue? */
function sideIsOpen(stage: Stage, placed: Placements, x: number, y: number, d: Dir): boolean {
  const nx = x + DX[d];
  const ny = y + DY[d];
  const cell = cellAt(stage, nx, ny);
  if (!cell) return false;
  if (cell.type === 'obstacle') return false;
  if (cell.type === 'start' || cell.type === 'goal' || cell.type === 'tunnel' || cell.type === 'switch') {
    return neighbourWants(stage, placed, x, y, d);
  }
  const rail = railAt(stage, placed, nx, ny);
  return rail === null || hasPort(rail, opposite(d));
}

/**
 * Picks the initial rotation for a newly placed piece: connect to as many neighbours
 * that point at this cell as possible, then prefer ports that lead somewhere usable.
 */
export function autoOrient(stage: Stage, placed: Placements, x: number, y: number, kind: RailKind): number {
  const wants = new Set(ALL_DIRS.filter((d) => neighbourWants(stage, placed, x, y, d)));
  let best = 0;
  let bestScore = -Infinity;
  for (let rot = 0; rot < rotationCount(kind); rot++) {
    let score = 0;
    for (const port of railPorts({ kind, rot })) {
      if (wants.has(port)) score += 10;
      else if (sideIsOpen(stage, placed, x, y, port)) score += 1;
      else score -= 3;
    }
    if (score > bestScore) {
      bestScore = score;
      best = rot;
    }
  }
  return best;
}
