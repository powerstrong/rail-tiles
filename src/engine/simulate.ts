import { type Dir, DX, DY } from './dir';
import type { Rail } from './rail';
import { type Pos, type Stage, cellAt, cellKey } from './stage';
import { type FailReason, type TraceStep, enter, initialRiders, initialSwitches, motionKey, riderPass } from './step';

export type { FailReason, TraceStep } from './step';

/** Player-placed rails keyed by `cellKey(x, y)`. */
export type RailMap = Readonly<Record<string, Rail>>;

export interface Failure {
  reason: FailReason;
  /** The tile the train could not continue into (may be off the board), or the goal for missed_waypoint. */
  cell: Pos;
  /** Last tile the train stood on. */
  from: Pos;
  /** Edge of `from` where the train stopped. Absent for missed_waypoint (train reached the goal centre). */
  edge?: Dir;
  missedWaypoints?: Pos[];
  /** Delivery passengers not yet dropped off (undelivered). */
  undelivered?: string[];
}

/** A delivery passenger boarding or getting off while the train drives through step `index`. */
export interface RiderEvent {
  index: number;
  id: string;
  event: 'board' | 'drop';
}

export interface Trace {
  steps: TraceStep[];
  riderEvents: RiderEvent[];
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
 * Switches make the train's state more than its position, so an endless loop is
 * detected exactly: the same cell, heading and switch settings seen twice.
 */
export function simulate(stage: Stage, placed: RailMap): Trace {
  const steps: TraceStep[] = [{ kind: 'start', x: stage.start.x, y: stage.start.y, outEdge: stage.start.dir }];
  const visited = new Set<string>();
  const seen = new Set<string>();
  const switches = initialSwitches(stage);
  const riders = initialRiders(stage);
  const riderEvents: RiderEvent[] = [];
  const lookup = (x: number, y: number) => placed[cellKey(x, y)] ?? null;

  let x = stage.start.x;
  let y = stage.start.y;
  let heading = stage.start.dir;

  const fail = (reason: FailReason, extra: Partial<Failure> = {}): Trace => ({
    steps,
    riderEvents,
    success: false,
    failure: { reason, cell: { x: x + DX[heading], y: y + DY[heading] }, from: { x, y }, edge: heading, ...extra },
  });

  for (;;) {
    const key = motionKey(stage, x, y, heading, switches);
    if (seen.has(key)) return fail('loop', { cell: { x, y } });
    seen.add(key);

    const entry = enter(stage, lookup, switches, x, y, heading);
    if (entry.kind === 'fail') return fail(entry.reason);
    if (entry.kind === 'unbuilt') return fail('no_track');
    if (entry.kind === 'goal') {
      steps.push(entry.step);
      const missed = stage.waypoints.filter((p) => !visited.has(cellKey(p.x, p.y)));
      if (missed.length > 0) {
        const at = { x: entry.step.x, y: entry.step.y };
        return { steps, riderEvents, success: false, failure: { reason: 'missed_waypoint', cell: at, from: at, missedWaypoints: missed } };
      }
      const undelivered = stage.riders.filter((r) => riders[r.id] !== 2).map((r) => r.id);
      if (undelivered.length > 0) {
        const at = { x: entry.step.x, y: entry.step.y };
        return { steps, riderEvents, success: false, failure: { reason: 'undelivered', cell: at, from: at, undelivered } };
      }
      return { steps, riderEvents, success: true, failure: null };
    }

    steps.push(entry.step);
    if (entry.step.kind === 'rail') {
      visited.add(cellKey(entry.step.x, entry.step.y));
      const ride = riderPass(stage, riders, entry.step.x, entry.step.y);
      if (ride) riderEvents.push({ index: steps.length - 1, ...ride });
      if (entry.step.toggle) switches[entry.step.toggle.key] = entry.step.toggle.to;
    }
    x = entry.x;
    y = entry.y;
    heading = entry.heading;
  }
}
