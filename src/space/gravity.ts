import { DX, DY, type Dir } from '../engine/dir';
import type { SpaceStage } from './model';

/**
 * The one set of movement rules, shared by the screen and the solver. A state is the cell of
 * every capsule, in the stage's capsule order.
 */
export type SpaceState = number[];

/** What one phase of a press did, for the screen to play back. */
export interface Frame {
  kind: 'gravity' | 'boost' | 'warp';
  at: SpaceState;
  /** Capsules that moved in this phase. */
  moved: boolean[];
}

export interface Press {
  next: SpaceState;
  /** Phases in which something moved, in order (empty when the press changes nothing). */
  frames: Frame[];
}

export const initialState = (stage: SpaceStage): SpaceState => [...stage.start];

/** One character per capsule. */
export const stateKey = (s: SpaceState) => String.fromCharCode(...s.map((c) => c + 40));

export const isWon = (stage: SpaceStage, s: SpaceState) => s.every((c, k) => c === stage.docks[k]);

/** The cell one step from `cell` towards `d`, or -1 past the edge or into a wall. */
export function stepCell(stage: SpaceStage, cell: number, d: Dir): number {
  const x = (cell % stage.width) + DX[d];
  const y = Math.floor(cell / stage.width) + DY[d];
  if (x < 0 || y < 0 || x >= stage.width || y >= stage.height) return -1;
  const to = y * stage.width + x;
  return stage.tiles[to].t === 'wall' ? -1 : to;
}

/**
 * Moves every capsule with a target (-1 = stays) at once. A capsule is stuck when its target is
 * -1, holds a capsule that is stuck, is wanted by another capsule too, or holds a capsule that
 * wants this one's cell (no passing through each other). Order never matters.
 */
export function resolve(at: SpaceState, targets: number[]): boolean[] {
  const n = at.length;
  const stuck = targets.map((t) => t < 0);
  for (let i = 0; i < n; i++) {
    if (stuck[i]) continue;
    for (let j = 0; j < n; j++) {
      if (j === i || targets[j] < 0) continue;
      if (targets[j] === targets[i] || (targets[j] === at[i] && targets[i] === at[j])) stuck[i] = true;
    }
  }
  for (let changed = true; changed; ) {
    changed = false;
    for (let i = 0; i < n; i++) {
      if (stuck[i]) continue;
      const j = at.indexOf(targets[i]);
      if (j >= 0 && stuck[j]) {
        stuck[i] = true;
        changed = true;
      }
    }
  }
  return stuck.map((s) => !s);
}

/** Everything one press of gravity towards `d` does. */
export function press(stage: SpaceStage, s: SpaceState, d: Dir): Press {
  const frames: Frame[] = [];
  let at = s;
  const run = (kind: Frame['kind'], targets: number[]) => {
    if (targets.every((t) => t < 0)) return [] as boolean[];
    const moved = resolve(at, targets);
    if (!moved.some(Boolean)) return moved;
    at = at.map((c, k) => (moved[k] ? targets[k] : c));
    frames.push({ kind, at, moved });
    return moved;
  };

  // 1. Gravity pulls every capsule one cell.
  const flew = run(
    'gravity',
    at.map((c) => stepCell(stage, c, d)),
  );
  // 2. A capsule that flew onto a booster goes one more cell its way.
  const boosted = run(
    'boost',
    at.map((c, k) => {
      const t = stage.tiles[c];
      return flew[k] && t.t === 'pad' ? stepCell(stage, c, t.dir) : -1;
    }),
  );
  // 3. A capsule that arrived on a wormhole comes out of its twin.
  run(
    'warp',
    at.map((c, k) => {
      const t = stage.tiles[c];
      return (flew[k] || boosted[k]) && t.t === 'hole' ? t.twin : -1;
    }),
  );
  return { next: at, frames };
}

/** The state after pressing `d`. */
export const after = (stage: SpaceStage, s: SpaceState, d: Dir) => press(stage, s, d).next;
