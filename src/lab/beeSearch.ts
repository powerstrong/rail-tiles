import { DIRS, neighbor, type Stage, type State } from './model';

export type BeeAnswer = 'possible' | 'impossible' | 'unknown';
const has = (mask: number, bit: number) => bit <= 0x40000000 ? (mask & bit) !== 0 : Math.floor(mask / bit) % 2 === 1;
/** A Hamiltonian path depends on the visited set and head, never the order of its prefix.
 * Number masks are exact through 36 cells; avoid JS's 32-bit shifts for the upper cells. */
export class BeeSearch {
  readonly bits: number[];
  readonly neighbors: number[][];
  readonly exits: number[][];
  readonly rulesKey: string;
  readonly full: number;
  readonly memo = new Map<number | string, number>(); // next cell, -1 = impossible, -2 = won
  readonly size: number;
  readonly goal: number;
  visited = 0;
  exhausted = false;
  constructor(readonly stage: Stage) {
    this.size = stage.cols * stage.rows;
    if (this.size > 36) throw new Error('Bee search supports boards up to 6×6');
    this.bits = Array.from({ length: this.size }, (_, i) => 2 ** i);
    this.neighbors = this.bits.map((_, at) => DIRS.map((_, d) => neighbor(stage, at, d)).filter(n => n >= 0 && stage.terrain![n]));
    this.exits = this.neighbors.map((ns, at) => stage.arrows?.[at] === undefined
      ? ns : ns.filter(n => n === neighbor(stage, at, stage.arrows![at])));
    // The tile layout is immutable during a play. Namespace its state keys so proofs
    // for equal heads/visited sets with different arrow rules cannot be confused.
    this.rulesKey = stage.arrows ? Object.entries(stage.arrows).sort(([a], [b]) => +a - +b).map(([at, d]) => `${at}:${d}`).join(';') : '';
    this.full = this.bits.reduce((mask, bit, i) => mask + (stage.terrain![i] ? bit : 0), 0);
    this.goal = stage.goal[0];
  }
  mask(state: State) { return state.reduce((mask, at) => mask + this.bits[at], 0); }
  private stateKey(mask: number, at: number): number | string {
    const position = mask * this.size + at;
    return this.rulesKey ? `${this.rulesKey}|${position}` : position;
  }
  key(state: State) { return this.stateKey(this.mask(state), state.at(-1)!); }
  /** A query has both a work and a wall-clock limit. Limits never establish impossibility.
   * Proven subproblems survive between moves, including retracing and recovery. */
  query(state: State, budget = 6_000, milliseconds = 8): { answer: BeeAnswer; path: number[] | null } {
    this.visited = 0; this.exhausted = false;
    const deadline = milliseconds === Infinity ? Infinity : performance.now() + milliseconds;
    const walk = (at: number, mask: number): BeeAnswer => {
      const key = this.stateKey(mask, at), cached = this.memo.get(key);
      if (cached !== undefined) return cached === -1 ? 'impossible' : 'possible';
      if (this.visited >= budget || this.memo.size >= 50_000 || (deadline !== Infinity && this.visited % 32 === 0 && performance.now() >= deadline)) {
        this.exhausted = true; return 'unknown';
      }
      this.visited++;
      const remember = (next: number): BeeAnswer => {
        if (this.memo.size >= 50_000) { this.exhausted = true; return 'unknown'; }
        this.memo.set(key, next); return next === -1 ? 'impossible' : 'possible';
      };
      if (mask === this.full) return remember(at === this.goal ? -2 : -1);
      if (at === this.goal) return remember(-1);
      const remaining = this.full - mask + this.bits[at];
      // Every remaining internal flower needs an entrance AND an exit. Both endpoints need one.
      for (let i = 0; i < this.size; i++) if (has(remaining, this.bits[i])) {
        let degree = 0;
        for (const n of this.neighbors[i]) if (has(remaining, this.bits[n])) degree++;
        if (degree < (i === at || i === this.goal ? 1 : 2)) return remember(-1);
      }
      // No path can reconnect two separated groups without revisiting a flower.
      let connected = this.bits[at];
      const queue = [at];
      for (let head = 0; head < queue.length; head++) for (const n of this.neighbors[queue[head]]) {
        if (has(remaining, this.bits[n]) && !has(connected, this.bits[n])) { connected += this.bits[n]; queue.push(n); }
      }
      if (connected !== remaining) return remember(-1);
      let unknown = false;
      for (const n of this.exits[at]) {
        if (has(mask, this.bits[n]) || (n === this.goal && mask + this.bits[n] !== this.full)) continue;
        const answer = walk(n, mask + this.bits[n]);
        if (answer === 'possible') return remember(n);
        if (answer === 'unknown') unknown = true;
      }
      return unknown ? 'unknown' : remember(-1);
    };
    const answer = walk(state.at(-1)!, this.mask(state));
    this.exhausted = answer === 'unknown';
    if (answer !== 'possible') return { answer, path: null };
    const path: number[] = [];
    let mask = this.mask(state), at = state.at(-1)!;
    for (;;) {
      const next = this.memo.get(this.stateKey(mask, at))!;
      if (next < 0) break;
      path.push(next); mask += this.bits[next]; at = next;
    }
    return { answer, path };
  }
}
