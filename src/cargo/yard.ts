import type { CargoStage, Kind, Move } from './model';

/**
 * The yard's one rule, shared by the screen and the solver.
 *
 * Wagons stand in a line behind the locomotive, the front one (index 0) coupled to it. The crane
 * lifts the top run of one kind (as many as fit) onto an empty wagon or onto the same kind. A
 * wagon full of one kind is tied up with a ribbon: nothing comes out of it again. When the front
 * wagon is tied up (and, with a departure board, holds the kind whose turn it is) the
 * locomotive takes it away, the line moves up one place and an empty wagon of the same size
 * joins at the back. If the new front wagon is ready too, it leaves right after: a chain.
 *
 * A state is the boxes in every wagon (kind digits, bottom to top) with the wagons' sizes in line
 * order, the trains still on the board, and the longest chain one move has made so far (kept
 * only up to what a bonus stage asks for, so other stages never tell chains apart).
 */
export interface YardState {
  w: string[];
  sizes: number[];
  left: string;
  chain: number;
}

/** Variants for tests: how much the rules of the world change the answer. */
export interface Rules {
  /** Any tied-up wagon may leave where it stands (no line). */
  anyWagon?: boolean;
  /** The departure board is ignored. */
  noBoard?: boolean;
}

export interface Step {
  next: YardState;
  /** Boxes the crane carried. */
  carried: number;
  /** Trains that left, in order: where the wagon stood (in the line at that moment) and its kind. */
  departed: { wagon: number; kind: Kind }[];
}

const enc = (ks: Kind[]) => ks.join('');

export function initialState(stage: CargoStage): YardState {
  return { w: stage.start.map(enc), sizes: stage.sizes.slice(), left: enc(stage.board), chain: 0 };
}

export const boxes = (s: string): Kind[] => [...s].map((c) => Number(c) as Kind);

/** Length of the top run of one kind. */
export function topRun(s: string): number {
  let n = 0;
  while (n < s.length && s[s.length - 1 - n] === s[s.length - 1]) n++;
  return n;
}

/** A wagon full of one kind: tied up, waiting to leave. */
export const tiedUp = (s: string, size: number) => s.length === size && topRun(s) === size;

/** Sends the next ready wagon off, if any. Mutates `st`. */
function departOne(st: YardState, rules: Rules): Step['departed'][number] | null {
  const board = !rules.noBoard && st.left.length > 0;
  const ready = (i: number) => tiedUp(st.w[i], st.sizes[i]) && (!board || st.w[i][0] === st.left[0]);
  const at = rules.anyWagon ? st.w.findIndex((_, i) => ready(i)) : ready(0) ? 0 : -1;
  if (at < 0) return null;
  const out = { wagon: at, kind: Number(st.w[at][0]) as Kind };
  if (board) st.left = st.left.slice(1);
  if (rules.anyWagon) st.w[at] = '';
  else {
    st.w = [...st.w.slice(1), ''];
    st.sizes = [...st.sizes.slice(1), st.sizes[0]];
  }
  return out;
}

export type Refusal = 'same' | 'empty' | 'tied' | 'full' | 'kind';

/** Why a crane move is not possible, or null if it is. */
export function whyNot(s: YardState, [a, b]: Move): Refusal | null {
  if (a === b) return 'same';
  const from = s.w[a];
  const to = s.w[b];
  if (!from.length) return 'empty';
  if (tiedUp(from, s.sizes[a])) return 'tied';
  if (to.length >= s.sizes[b]) return 'full';
  if (to.length && to[to.length - 1] !== from[from.length - 1]) return 'kind';
  return null;
}

/** The crane's part of a move: boxes carried, nothing left yet. */
function carry(s: YardState, [a, b]: Move): { st: YardState; carried: number } {
  const carried = Math.min(topRun(s.w[a]), s.sizes[b] - s.w[b].length);
  const w = s.w.slice();
  w[b] = w[b] + w[a].slice(w[a].length - carried);
  w[a] = w[a].slice(0, w[a].length - carried);
  return { st: { w, sizes: s.sizes, left: s.left, chain: s.chain }, carried };
}

/** One crane move, then whatever leaves. Null if the move is not possible. */
export function move(stage: CargoStage, s: YardState, m: Move, rules: Rules = {}): Step | null {
  if (whyNot(s, m)) return null;
  const { st, carried } = carry(s, m);
  const departed: Step['departed'] = [];
  for (let d = departOne(st, rules); d; d = departOne(st, rules)) departed.push(d);
  st.chain = Math.min(stage.chain ?? 0, Math.max(s.chain, departed.length));
  return { next: st, carried, departed };
}

/**
 * A move as the screen plays it: the yard once the crane has put the boxes down, then the yard
 * after each train leaves (the last one is `move(...).next`).
 */
export function phases(stage: CargoStage, s: YardState, m: Move): { carried: number; landed: YardState; after: YardState[] } | null {
  if (whyNot(s, m)) return null;
  const { st, carried } = carry(s, m);
  const landed = { ...st, w: st.w.slice() };
  const after: YardState[] = [];
  while (departOne(st, {})) after.push({ ...st, w: st.w.slice(), sizes: st.sizes.slice() });
  const chain = Math.min(stage.chain ?? 0, Math.max(s.chain, after.length));
  after.forEach((a) => (a.chain = chain));
  if (!after.length) landed.chain = chain;
  return { carried, landed, after };
}

export const isWon = (stage: CargoStage, s: YardState, rules: Rules = {}) =>
  s.w.every((x) => !x.length) && (rules.noBoard || !s.left.length) && s.chain >= (stage.chain ?? 0);

export function keyOf(s: YardState, rules: Rules = {}): string {
  return `${s.w.join(',')}/${s.sizes.join('')}/${rules.noBoard ? '' : s.left}/${s.chain}`;
}

/** Every crane move possible from `s`. */
export function movesFrom(s: YardState): Move[] {
  const out: Move[] = [];
  for (let a = 0; a < s.w.length; a++) for (let b = 0; b < s.w.length; b++) if (!whyNot(s, [a, b])) out.push([a, b]);
  return out;
}
