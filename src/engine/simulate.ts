import { type Dir, DX, DY, opposite } from './dir';
import { type Rail, railExit } from './rail';
import { type Pos, type Stage, cellAt, cellKey } from './stage';

/** Player-placed rails keyed by `cellKey(x, y)`. */
export type RailMap = Readonly<Record<string, Rail>>;

export type FailReason =
  | 'out_of_bounds'
  | 'no_track'
  | 'blocked'
  | 'misaligned'
  | 'goal_wrong_side'
  | 'tunnel_wrong_side'
  | 'start_reentry'
  | 'missed_waypoint'
  | 'step_limit';

/**
 * One tile the train travels through.
 * - start: leaves the station centre through `outEdge`
 * - rail:  enters through `inEdge`, leaves through `outEdge`
 * - goal:  enters through `inEdge`, stops at the centre
 */
export type TraceStep =
  | { kind: 'start'; x: number; y: number; outEdge: Dir }
  | { kind: 'rail'; x: number; y: number; inEdge: Dir; outEdge: Dir }
  /** Into the mouth at (x, y) through `inEdge`, out of the paired mouth (toX, toY) through `outEdge`. */
  | { kind: 'tunnel'; x: number; y: number; inEdge: Dir; toX: number; toY: number; outEdge: Dir }
  | { kind: 'goal'; x: number; y: number; inEdge: Dir };

export interface Failure {
  reason: FailReason;
  /** The tile the train could not continue into (may be off the board), or the goal for missed_waypoint. */
  cell: Pos;
  /** Last tile the train stood on. */
  from: Pos;
  /** Edge of `from` where the train stopped. Absent for missed_waypoint (train reached the goal centre). */
  edge?: Dir;
  missedWaypoints?: Pos[];
}

export interface Trace {
  steps: TraceStep[];
  success: boolean;
  failure: Failure | null;
}

export function railAt(stage: Stage, placed: RailMap, x: number, y: number): Rail | null {
  const cell = cellAt(stage, x, y);
  if (!cell) return null;
  if (cell.type === 'fixed') return cell.rail;
  if (cell.type === 'empty') return placed[cellKey(x, y)] ?? null;
  return null;
}

/**
 * Runs the train from the start station until it arrives or fails.
 * The result is fully computed up front; the renderer only replays it.
 *
 * With two-port pieces the track from the start station is always a simple chain
 * (the station is a one-port endpoint), so the train cannot loop. The step limit
 * is a safety net for future pieces such as switches.
 */
export function simulate(stage: Stage, placed: RailMap): Trace {
  const steps: TraceStep[] = [{ kind: 'start', x: stage.start.x, y: stage.start.y, outEdge: stage.start.dir }];
  const visited = new Set<string>();
  const maxSteps = stage.width * stage.height * 4 + 4;

  let x = stage.start.x;
  let y = stage.start.y;
  let heading = stage.start.dir;

  const fail = (reason: FailReason, cell: Pos, extra: Partial<Failure> = {}): Trace => ({
    steps,
    success: false,
    failure: { reason, cell, from: { x, y }, edge: heading, ...extra },
  });

  for (let i = 0; i < maxSteps; i++) {
    const nx = x + DX[heading];
    const ny = y + DY[heading];
    const next = { x: nx, y: ny };
    const inEdge = opposite(heading);
    const cell = cellAt(stage, nx, ny);

    if (!cell) return fail('out_of_bounds', next);

    switch (cell.type) {
      case 'goal': {
        if (stage.goal.dir !== inEdge) return fail('goal_wrong_side', next);
        steps.push({ kind: 'goal', x: nx, y: ny, inEdge });
        const missed = stage.waypoints.filter((p) => !visited.has(cellKey(p.x, p.y)));
        if (missed.length > 0) {
          return {
            steps,
            success: false,
            failure: { reason: 'missed_waypoint', cell: next, from: next, missedWaypoints: missed },
          };
        }
        return { steps, success: true, failure: null };
      }
      case 'start':
        return fail('start_reentry', next);
      case 'tunnel': {
        if (cell.dir !== inEdge) return fail('tunnel_wrong_side', next);
        const out = cellAt(stage, cell.pair.x, cell.pair.y);
        const outEdge = out?.type === 'tunnel' ? out.dir : heading;
        steps.push({ kind: 'tunnel', x: nx, y: ny, inEdge, toX: cell.pair.x, toY: cell.pair.y, outEdge });
        x = cell.pair.x;
        y = cell.pair.y;
        heading = outEdge;
        break;
      }
      case 'obstacle':
        return fail('blocked', next);
      case 'fixed':
      case 'empty': {
        const rail = railAt(stage, placed, nx, ny);
        if (!rail) return fail('no_track', next);
        const outEdge = railExit(rail, inEdge);
        if (outEdge === null) return fail('misaligned', next);
        steps.push({ kind: 'rail', x: nx, y: ny, inEdge, outEdge });
        visited.add(cellKey(nx, ny));
        x = nx;
        y = ny;
        heading = outEdge;
        break;
      }
    }
  }
  return fail('step_limit', { x, y });
}
