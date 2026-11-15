/** Restored Flood Fill rules from archive/lab-v1, with movable origin and immutable rocks. */
export interface CoralStage {
  id: string; number: number; title: string; label: string;
  cols: number; rows: number; start: number[]; origin: number;
  par: number; solution: number[];
}
export interface CoralState { mask: number; color: number }
export const COLORS = ['#d96669', '#e4b843', '#359d86', '#508ecb', '#9b72c4'];
export const COLOR_NAMES = ['빨강', '노랑', '초록', '파랑', '보라'];
export const SYMBOLS = ['●', '◆', '▲', '■', '♥'];
export const count = (mask: number): number => { let n = 0; for (; mask; mask &= mask - 1) n++; return n; };

export function neighbors(stage: Pick<CoralStage, 'cols' | 'rows'>, cell: number): number[] {
  const x = cell % stage.cols, y = Math.floor(cell / stage.cols);
  return [y > 0 ? cell - stage.cols : -1, x < stage.cols - 1 ? cell + 1 : -1,
    y < stage.rows - 1 ? cell + stage.cols : -1, x > 0 ? cell - 1 : -1].filter(n => n >= 0);
}

/** At most 25 cells. No whole-state search is needed on entry or on a move. */
export class Reef {
  readonly adjacent: number[][];
  readonly all: number;
  readonly palette: number[];
  constructor(readonly stage: CoralStage) {
    if (stage.start.length !== stage.cols * stage.rows || stage.start.length > 25 || stage.start[stage.origin] < 0) throw new Error('Invalid reef');
    this.adjacent = stage.start.map((_, i) => neighbors(stage, i));
    this.all = stage.start.reduce((m, c, i) => c < 0 ? m : m | (1 << i), 0);
    this.palette = [...new Set(stage.start.filter(c => c >= 0))].sort();
  }
  /** Flood every matching neighbor, including chains beyond the first ring. */
  expand(mask: number, color: number): number {
    const queue = this.stage.start.flatMap((_, i) => mask & (1 << i) ? [i] : []);
    let next = mask;
    for (let at = 0; at < queue.length; at++) for (const n of this.adjacent[queue[at]]) {
      if (!(next & (1 << n)) && this.stage.start[n] === color) { next |= 1 << n; queue.push(n); }
    }
    return next;
  }
  initial(): CoralState {
    const color = this.stage.start[this.stage.origin];
    return { mask: this.expand(1 << this.stage.origin, color), color };
  }
  move(state: CoralState, color: number): CoralState | null {
    if (!this.palette.includes(color) || state.color === color || this.won(state)) return null;
    // Even a zero-growth recoloring is legal; it costs a move, never a failure.
    return { mask: this.expand(state.mask, color), color };
  }
  won(state: CoralState): boolean { return state.mask === this.all; }
  /** Wave distance is visual only: the full new mask takes effect immediately. */
  waves(before: number, after: number): Map<number, number> {
    const distance = new Map<number, number>();
    const queue = this.stage.start.flatMap((_, i) => before & (1 << i) ? [i] : []);
    queue.forEach(i => distance.set(i, 0));
    for (let at = 0; at < queue.length; at++) for (const n of this.adjacent[queue[at]]) {
      if ((after & (1 << n)) && !distance.has(n)) { distance.set(n, distance.get(queue[at])! + 1); queue.push(n); }
    }
    for (const i of [...distance.keys()]) if (before & (1 << i)) distance.delete(i);
    return distance;
  }
}

/** Exact BFS on absorbed sets. Current color can be omitted: it cannot grow the set again.
 * Zero-growth choices can also be omitted from any shortest solution. null means unproven.
 */
export function solve(reef: Reef, state = reef.initial(), budget = 200_000): number[] | null {
  if (reef.won(state)) return [];
  const queue = [state.mask];
  const previous = new Map<number, { mask: number; color: number }>();
  previous.set(state.mask, { mask: -1, color: -1 });
  for (let at = 0; at < queue.length; at++) {
    if (previous.size > budget) return null;
    const mask = queue[at];
    for (const color of reef.palette) {
      const next = reef.expand(mask, color);
      if (previous.has(next)) continue;
      previous.set(next, { mask, color });
      if (next === reef.all) {
        const path: number[] = [];
        for (let m = next; m !== state.mask;) { const step = previous.get(m)!; path.push(step.color); m = step.mask; }
        return path.reverse();
      }
      queue.push(next);
    }
  }
  return null;
}
