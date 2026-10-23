import { type Dir, DX, DY, opposite } from './dir';
import { type Rail, railExit } from './rail';
import { type Cell, type Stage, type SwitchState, cellAt, cellKey } from './stage';

/** Current branch of every switch, keyed by cell key. */
export type SwitchStates = Record<string, SwitchState>;

export type FailReason =
  | 'out_of_bounds'
  | 'no_track'
  | 'blocked'
  | 'misaligned'
  | 'goal_wrong_side'
  | 'tunnel_wrong_side'
  | 'start_reentry'
  | 'missed_waypoint'
  | 'undelivered'
  | 'loop';

/**
 * One tile the train travels through.
 * - start:  leaves the station centre through `outEdge`
 * - rail:   enters through `inEdge`, leaves through `outEdge` (rails, crossings, switches);
 *           `toggle` is set when a switch flips after this pass
 * - tunnel: into the mouth at (x, y), out of the paired mouth (toX, toY)
 * - goal:   enters through `inEdge`, stops at the centre
 */
export type TraceStep =
  | { kind: 'start'; x: number; y: number; outEdge: Dir }
  | { kind: 'rail'; x: number; y: number; inEdge: Dir; outEdge: Dir; toggle?: { key: string; to: SwitchState } }
  | { kind: 'tunnel'; x: number; y: number; inEdge: Dir; toX: number; toY: number; outEdge: Dir }
  | { kind: 'goal'; x: number; y: number; inEdge: Dir };

export type Entry =
  | { kind: 'goal'; step: TraceStep }
  | { kind: 'fail'; reason: FailReason }
  /** An empty cell with no rail yet: simulate fails, the solver tries pieces. */
  | { kind: 'unbuilt'; inEdge: Dir }
  | { kind: 'move'; x: number; y: number; heading: Dir; step: TraceStep };

/** Where a train entering a switch through `inEdge` leaves, and whether that pass flips it. */
export function switchExit(cell: Extract<Cell, { type: 'switch' }>, state: SwitchState, inEdge: Dir): { out: Dir; flips: boolean } | null {
  const straight = opposite(cell.trunk);
  if (inEdge === cell.trunk) return { out: state === 0 ? straight : cell.turn, flips: true };
  if (inEdge === straight || inEdge === cell.turn) return { out: cell.trunk, flips: false };
  return null;
}

/**
 * The single source of truth for movement rules: what happens when a train heading
 * `heading` from (x, y) moves into the next cell. Shared by `simulate` and the solver
 * so the two can never disagree.
 */
export function enter(
  stage: Stage,
  railAt: (x: number, y: number) => Rail | null,
  switches: SwitchStates,
  x: number,
  y: number,
  heading: Dir,
): Entry {
  const nx = x + DX[heading];
  const ny = y + DY[heading];
  const inEdge = opposite(heading);
  const cell = cellAt(stage, nx, ny);
  if (!cell) return { kind: 'fail', reason: 'out_of_bounds' };

  switch (cell.type) {
    case 'goal':
      if (stage.goal.dir !== inEdge) return { kind: 'fail', reason: 'goal_wrong_side' };
      return { kind: 'goal', step: { kind: 'goal', x: nx, y: ny, inEdge } };
    case 'start':
      return { kind: 'fail', reason: 'start_reentry' };
    case 'obstacle':
      return { kind: 'fail', reason: 'blocked' };
    case 'tunnel': {
      if (cell.dir !== inEdge) return { kind: 'fail', reason: 'tunnel_wrong_side' };
      const exit = cellAt(stage, cell.pair.x, cell.pair.y);
      const outEdge = exit?.type === 'tunnel' ? exit.dir : heading;
      return {
        kind: 'move',
        x: cell.pair.x,
        y: cell.pair.y,
        heading: outEdge,
        step: { kind: 'tunnel', x: nx, y: ny, inEdge, toX: cell.pair.x, toY: cell.pair.y, outEdge },
      };
    }
    case 'switch': {
      const key = cellKey(nx, ny);
      const state = switches[key] ?? cell.initial;
      const exit = switchExit(cell, state, inEdge);
      if (!exit) return { kind: 'fail', reason: 'misaligned' };
      const toggle = exit.flips ? { key, to: (1 - state) as SwitchState } : undefined;
      return { kind: 'move', x: nx, y: ny, heading: exit.out, step: { kind: 'rail', x: nx, y: ny, inEdge, outEdge: exit.out, toggle } };
    }
    case 'fixed':
    case 'empty': {
      const rail = cell.type === 'fixed' ? cell.rail : railAt(nx, ny);
      if (!rail) return { kind: 'unbuilt', inEdge };
      const out = railExit(rail, inEdge);
      if (out === null) return { kind: 'fail', reason: 'misaligned' };
      return { kind: 'move', x: nx, y: ny, heading: out, step: { kind: 'rail', x: nx, y: ny, inEdge, outEdge: out } };
    }
  }
}

/** Per delivery passenger: 0 waiting at the pickup, 1 aboard, 2 delivered. */
export type RiderProgress = Record<string, 0 | 1 | 2>;

export function initialRiders(stage: Stage): RiderProgress {
  return Object.fromEntries(stage.riders.map((r) => [r.id, 0]));
}

/**
 * The train has just driven through (x, y): a waiting passenger there boards, or the
 * passenger aboard whose stop this is gets off. Returns what happened (and mutates
 * `progress`), or null. Shared by simulate and the solver.
 */
export function riderPass(stage: Stage, progress: RiderProgress, x: number, y: number): { id: string; event: 'board' | 'drop' } | null {
  const cell = cellAt(stage, x, y);
  const mark = cell?.type === 'empty' ? cell.rider : undefined;
  if (!mark) return null;
  const state = progress[mark.id];
  if (mark.role === 'pickup' && state === 0) {
    progress[mark.id] = 1;
    return { id: mark.id, event: 'board' };
  }
  if (mark.role === 'drop' && state === 1) {
    progress[mark.id] = 2;
    return { id: mark.id, event: 'drop' };
  }
  return null;
}

/** Initial branch of every switch on the stage. */
export function initialSwitches(stage: Stage): SwitchStates {
  const states: SwitchStates = {};
  for (const key of stage.switches) {
    const [x, y] = key.split(',').map(Number);
    const cell = cellAt(stage, x, y);
    if (cell?.type === 'switch') states[key] = cell.initial;
  }
  return states;
}

/** Position + heading + every switch: if this repeats, the train is looping forever. */
export function motionKey(stage: Stage, x: number, y: number, heading: Dir, switches: SwitchStates): string {
  return `${x},${y},${heading}|${stage.switches.map((k) => switches[k]).join('')}`;
}
