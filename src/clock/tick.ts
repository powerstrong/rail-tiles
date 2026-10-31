import { DX, DY, type Dir } from '../engine/dir';
import { type Action, type ClockStage, REST } from './model';

/**
 * The one set of rules, shared by the screen and the solver. A state packs the mouse's cell,
 * the hands' quarter turn (0..3, also the tick's parity) and whether the hands run backwards:
 * `cell * 8 + turn * 2 + reversed`.
 */
export type ClockState = number;

export const pack = (cell: number, turn: number, reversed: number): ClockState => cell * 8 + turn * 2 + reversed;
export const cellOf = (s: ClockState) => s >> 3;
export const turnOf = (s: ClockState) => (s >> 1) & 3;
export const reversedOf = (s: ClockState) => s & 1;

export const initialState = (stage: ClockStage): ClockState => pack(stage.start, 0, 0);
export const isWon = (stage: ClockStage, s: ClockState) => cellOf(s) === stage.exit;

/** Which way a hand points at a quarter turn. */
export const handDir = (stage: ClockStage, k: number, turn: number) => ((stage.hands[k].start + turn) % 4) as Dir;

/** Cells a hand covers at a quarter turn (its hub not included), on the board only. */
export function handCells(stage: ClockStage, k: number, turn: number): number[] {
  const h = stage.hands[k];
  const d = handDir(stage, k, turn);
  const out: number[] = [];
  const x0 = h.hub % stage.width;
  const y0 = Math.floor(h.hub / stage.width);
  for (let i = 1; i <= h.len; i++) {
    const x = x0 + DX[d] * i;
    const y = y0 + DY[d] * i;
    if (x < 0 || y < 0 || x >= stage.width || y >= stage.height) break;
    out.push(y * stage.width + x);
  }
  return out;
}

/** Red blocks stand on even ticks, blue ones on odd ticks. */
export const blockUp = (color: 0 | 1, turn: number) => color === (turn & 1);

/** Whether the mouse may be on `cell` once the clock shows `turn`. */
export function free(stage: ClockStage, cell: number, turn: number): boolean {
  const t = stage.tiles[cell];
  if (t.t === 'wall' || t.t === 'hub') return false;
  if (t.t === 'block' && blockUp(t.color, turn)) return false;
  for (let k = 0; k < stage.hands.length; k++) if (handCells(stage, k, turn).includes(cell)) return false;
  return true;
}

/** The state after `a` (one tick), or -1 when the mouse cannot do that. */
export function act(stage: ClockStage, s: ClockState, a: Action): ClockState {
  const at = cellOf(s);
  const rev = reversedOf(s);
  const turn = (turnOf(s) + (rev ? 3 : 1)) & 3;
  let to = at;
  if (a !== REST) {
    const x = (at % stage.width) + DX[a];
    const y = Math.floor(at / stage.width) + DY[a];
    if (x < 0 || y < 0 || x >= stage.width || y >= stage.height) return -1;
    to = y * stage.width + x;
  }
  if (!free(stage, to, turn)) return -1;
  // Stepping onto a lever turns the hands the other way from the next tick.
  const flip = a !== REST && stage.tiles[to].t === 'lever' ? 1 : 0;
  return pack(to, turn, rev ^ flip);
}

/** Why an action is not possible, for the screen to explain. */
export function whyNot(stage: ClockStage, s: ClockState, a: Action): 'edge' | 'wall' | 'block' | 'hand' | null {
  if (act(stage, s, a) >= 0) return null;
  const at = cellOf(s);
  const turn = (turnOf(s) + (reversedOf(s) ? 3 : 1)) & 3;
  let to = at;
  if (a !== REST) {
    const x = (at % stage.width) + DX[a];
    const y = Math.floor(at / stage.width) + DY[a];
    if (x < 0 || y < 0 || x >= stage.width || y >= stage.height) return 'edge';
    to = y * stage.width + x;
  }
  const t = stage.tiles[to];
  if (t.t === 'wall' || t.t === 'hub') return 'wall';
  if (t.t === 'block' && blockUp(t.color, turn)) return 'block';
  return 'hand';
}
