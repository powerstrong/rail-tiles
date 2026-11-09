/**
 * Gift freight yard world ("선물 화물역"): sorting puzzles with a departure board.
 *
 * Wagons stand side by side on the platform, each a stack of gift boxes (bottom → top). The
 * crane lifts the top run of one kind (all the same boxes on top, as many as fit) onto an
 * empty wagon or onto the same kind, never over a wagon's size. That is one move.
 *
 * The departure board lists the trains in order. When a wagon is full of the kind whose turn it
 * is, it leaves at once (free) and an empty wagon of the same size rolls in. A full wagon of
 * another kind waits for its turn, and the next ready wagons leave right after, one after
 * another (a chain). Every gift sent and the board done: cleared. Fewest moves is ★★★.
 *
 * Wagons are written `'3:FWF'`: size, then boxes bottom to top. Kinds: F fish (펭귄), W flower
 * (들꽃 마을), C cheese (시계탑), S star (우주), M melon (화산 섬), G gear (로봇 공장).
 */

export const KIND_GLYPHS = 'FWCSMG';
export type Kind = 0 | 1 | 2 | 3 | 4 | 5;

export interface KindInfo {
  name: string;
  /** Whose world it is sent to (shown on the departure board). */
  to: string;
  color: string;
  dark: string;
}

export const KINDS: readonly KindInfo[] = [
  { name: '물고기', to: '펭귄 얼음 나라', color: '#4A9BE8', dark: '#2A6CB0' },
  { name: '꽃', to: '들꽃 기차 마을', color: '#F07AA8', dark: '#C2477A' },
  { name: '치즈', to: '시계탑', color: '#F6C443', dark: '#C9921A' },
  { name: '별', to: '우주 정거장', color: '#8E6CE0', dark: '#5E40B0' },
  { name: '수박', to: '화산 섬', color: '#5DBB5A', dark: '#33873A' },
  { name: '톱니', to: '로봇 공장', color: '#9AA6B4', dark: '#5F6B7A' },
];

export interface CargoStageDef {
  id: string;
  title: string;
  tip: string;
  /** `size:boxes`, boxes bottom to top. */
  wagons: string[];
  /** Kinds in departure order, one letter per train; empty for no departure board (any kind may leave). */
  board: string;
  /** Fewest moves (★★★). Checked by tests against the solver. */
  par: number;
  /** One shortest answer: `13` = from wagon 1 to wagon 3 (1-based), space separated. */
  solution: string;
  /** Bonus stage ("축제 기차"): one crane move must send at least this many trains in a row. */
  chain?: number;
}

export interface CargoStage {
  id: string;
  number: number;
  title: string;
  tip: string;
  label?: string;
  boss?: boolean;
  sizes: number[];
  /** Boxes per wagon, bottom to top. */
  start: Kind[][];
  board: Kind[];
  par: number;
  solution: Move[];
  chain?: number;
}

/** Crane move: from wagon, to wagon (0-based). */
export type Move = [number, number];

export const MAX_WAGONS = 7;
export const MAX_SIZE = 5;

export class CargoStageError extends Error {}

export const moveName = ([a, b]: Move) => `${a + 1}${b + 1}`;

export function parseMoves(s: string): Move[] {
  return s
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((m) => {
      if (!/^\d\d$/.test(m)) throw new CargoStageError(`bad move "${m}"`);
      return [Number(m[0]) - 1, Number(m[1]) - 1] as Move;
    });
}

const kindOf = (c: string): Kind => {
  const k = KIND_GLYPHS.indexOf(c);
  if (k < 0) throw new CargoStageError(`unknown gift "${c}"`);
  return k as Kind;
};

export function parseCargoStage(def: CargoStageDef, number: number): CargoStage {
  const fail = (msg: string): never => {
    throw new CargoStageError(`[${def.id}] ${msg}`);
  };
  if (def.wagons.length < 2 || def.wagons.length > MAX_WAGONS) fail(`2..${MAX_WAGONS} wagons, got ${def.wagons.length}`);
  const sizes: number[] = [];
  const start: Kind[][] = [];
  for (const w of def.wagons) {
    const m = /^(\d):([A-Z]*)$/.exec(w);
    if (!m) return fail(`bad wagon "${w}"`);
    const size = Number(m[1]);
    if (size < 2 || size > MAX_SIZE) fail(`wagon "${w}" must hold 2..${MAX_SIZE}`);
    if (m[2].length > size) fail(`wagon "${w}" is over its size`);
    sizes.push(size);
    start.push([...m[2]].map(kindOf));
  }
  const board = [...def.board].map(kindOf);
  return {
    id: def.id,
    number,
    title: def.title,
    tip: def.tip,
    sizes,
    start,
    board,
    par: def.par,
    solution: parseMoves(def.solution),
    chain: def.chain,
  };
}

/** A stage's wagons and board as definition strings. */
export function stageStrings(stage: Pick<CargoStage, 'sizes' | 'start' | 'board'>): { wagons: string[]; board: string } {
  return {
    wagons: stage.sizes.map((n, i) => `${n}:${stage.start[i].map((k) => KIND_GLYPHS[k]).join('')}`),
    board: stage.board.map((k) => KIND_GLYPHS[k]).join(''),
  };
}
