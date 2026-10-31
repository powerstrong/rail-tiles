import { type DepotStage, GONE, type Move, cellOf } from './model';

/**
 * The one set of movement rules, shared by the screen and the solver. A state is the offset of
 * every vehicle along its line (GONE once a locomotive has left).
 */
export type DepotState = number[];

export const initialState = (stage: DepotStage): DepotState => [...stage.start];

/** One character per vehicle (offset + 50, so a departed locomotive is '1'). */
export const stateKey = (s: DepotState) => String.fromCharCode(...s.map((o) => o + 50));

export function isWon(stage: DepotStage, s: DepotState): boolean {
  return stage.vehicles.every((v, i) => v.kind !== 'loco' || s[i] === GONE);
}

/** Vehicle index on each cell, or -1. */
export function occupancy(stage: DepotStage, s: DepotState): Int8Array {
  const occ = new Int8Array(stage.width * stage.height).fill(-1);
  stage.vehicles.forEach((v, i) => {
    if (s[i] === GONE) return;
    for (let k = 0; k < v.len; k++) occ[cellOf(stage, v, s[i], k)] = i;
  });
  return occ;
}

/** Barriers are open while a wagon other than `mover` stands on a button. */
export function barriersOpen(stage: DepotStage, occ: Int8Array, mover: number): boolean {
  return stage.buttons.some((c) => occ[c] >= 0 && occ[c] !== mover);
}

/** Whether vehicle `v` may roll onto `cell`. */
function free(stage: DepotStage, occ: Int8Array, v: number, cell: number, open: boolean): boolean {
  const tile = stage.tiles[cell];
  if (tile.t === 'block') return false;
  if (occ[cell] >= 0 && occ[cell] !== v) return false;
  return tile.t !== 'barrier' || open || occ[cell] === v;
}

export interface Reach {
  /** Lowest and highest offsets the vehicle can slide to (its own offset is in between). */
  min: number;
  max: number;
  /** A locomotive whose way to its gate is clear can leave. */
  canLeave: boolean;
}

/** How far vehicle `v` can slide each way from where it stands. */
export function reach(stage: DepotStage, s: DepotState, v: number, occ: Int8Array = occupancy(stage, s)): Reach {
  const veh = stage.vehicles[v];
  const at = s[v];
  if (at === GONE) return { min: GONE, max: GONE, canLeave: false };
  const open = barriersOpen(stage, occ, v);
  const size = veh.horizontal ? stage.width : stage.height;
  let min = at;
  while (min > 0 && free(stage, occ, v, cellOf(stage, veh, min - 1, 0), open)) min--;
  let max = at;
  while (max + veh.len < size && free(stage, occ, v, cellOf(stage, veh, max + 1, veh.len - 1), open)) max++;
  // Gates sit on the east/south (offsets grow) or west/north (offsets shrink) end of the line.
  const leavesHigh = veh.exit === 1 || veh.exit === 2;
  const canLeave = veh.kind === 'loco' && (leavesHigh ? max + veh.len === size : min === 0);
  return { min, max, canLeave };
}

/** Every move from `s` that changes it. */
export function legalMoves(stage: DepotStage, s: DepotState): Move[] {
  const occ = occupancy(stage, s);
  const out: Move[] = [];
  for (let v = 0; v < stage.vehicles.length; v++) {
    if (s[v] === GONE) continue;
    const r = reach(stage, s, v, occ);
    for (let to = r.min; to <= r.max; to++) if (to !== s[v]) out.push({ vehicle: v, to });
    if (r.canLeave) out.push({ vehicle: v, to: GONE });
  }
  return out;
}

/** Whether `m` is a legal move from `s`. */
export function canMove(stage: DepotStage, s: DepotState, m: Move): boolean {
  if (s[m.vehicle] === undefined || s[m.vehicle] === GONE || m.to === s[m.vehicle]) return false;
  const r = reach(stage, s, m.vehicle);
  return m.to === GONE ? r.canLeave : m.to >= r.min && m.to <= r.max;
}

export function applyMove(s: DepotState, m: Move): DepotState {
  const next = [...s];
  next[m.vehicle] = m.to;
  return next;
}
