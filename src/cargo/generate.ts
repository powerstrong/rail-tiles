import { hashString, rng } from '../depot/generate';
import { type CargoAudit, auditCargo } from './audit';
import { type CargoStage, type CargoStageDef, KIND_GLYPHS, type Kind, type Move, moveName, parseCargoStage, stageStrings } from './model';
import { explore, shortestFrom } from './solver';
import { type Rules, type YardState, initialState, isWon, keyOf, move, movesFrom, topRun } from './yard';

// ---------------------------------------------------------------- simple players

type Policy = (stage: CargoStage, s: YardState, m: Move) => number[];

const kindChanges = (w: string[]) => w.reduce((n, s) => n + [...s].filter((c, i) => i > 0 && c !== s[i - 1]).length, 0);

/**
 * Three ways a player might play without planning, each a list of things to want most (compared
 * in order; wagons further left win ties). None looks ahead more than the move it makes.
 */
const POLICIES: Policy[] = [
  // Send whatever can go, else pile onto the same kind, carrying as much as possible.
  (stage, s, m) => {
    const st = move(stage, s, m)!;
    return [st.departed.length, s.w[m[1]].length ? 1 : 0, st.carried];
  },
  // Build the biggest heaps.
  (stage, s, m) => {
    const st = move(stage, s, m)!;
    return [s.w[m[1]].length ? st.next.w[m[1]].length : 0, st.departed.length, -s.w[m[0]].length];
  },
  // Keep the yard tidy: as few kind changes inside wagons as possible.
  (stage, s, m) => {
    const st = move(stage, s, m)!;
    return [-kindChanges(st.next.w), st.departed.length, s.w[m[1]].length ? 1 : 0];
  },
];

const better = (a: number[], b: number[]) => {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return false;
};

/** Moves one simple player takes to clear (never revisiting a yard), or Infinity. */
export function playGreedy(stage: CargoStage, policy: number, cap = 40): number {
  let s = initialState(stage);
  const seen = new Set([keyOf(s)]);
  for (let n = 0; n < cap; n++) {
    if (isWon(stage, s)) return n;
    let best: Move | null = null;
    let bestScore: number[] = [];
    for (const m of movesFrom(s)) {
      const next = move(stage, s, m)!.next;
      if (seen.has(keyOf(next))) continue;
      const sc = POLICIES[policy](stage, s, m);
      if (!best || better(sc, bestScore)) {
        best = m;
        bestScore = sc;
      }
    }
    if (!best) return Infinity;
    s = move(stage, s, best)!.next;
    seen.add(keyOf(s));
  }
  return isWon(stage, s) ? cap : Infinity;
}

/** Fewest moves any of the simple players needs. */
export const naiveMoves = (stage: CargoStage) => Math.min(...POLICIES.map((_, i) => playGreedy(stage, i)));

/** Fewest moves under a variant of the rules (null if it cannot clear). */
export function parWith(stage: CargoStage, rules: Rules): number | null {
  const g = explore(stage, rules);
  return g && g.toWin[0] >= 0 ? g.toWin[0] : null;
}

/** Fewest moves if any tied-up wagon could leave where it stands (no line). */
export const parAnyWagon = (stage: CargoStage) => parWith(stage, { anyWagon: true });
/** Fewest moves with the departure board ignored. */
export const parNoBoard = (stage: CargoStage) => parWith(stage, { noBoard: true });
/** Fewest moves with no chain goal (for bonus stages). */
export const parNoChain = (stage: CargoStage) => parWith({ ...stage, chain: undefined }, {});

// ---------------------------------------------------------------- generator

export interface CargoSpec {
  id: string;
  title: string;
  tip: string;
  /** Wagon sizes, left to right (shuffled unless `fixed`). */
  sizes: number[];
  fixed?: boolean;
  /** Wagonloads to send. */
  trains: number;
  /** Show them on a departure board (their order counts). */
  board?: boolean;
  /** Kinds of gift (each at least once on the board). */
  kinds: number;
  /** Wagons that start empty. */
  empties: number;
  par: [number, number];
  /** The line must matter: if any tied-up wagon could leave, it would be quicker. */
  lineMatters?: boolean;
  /** The board must matter: without it, it would be quicker. */
  boardMatters?: boolean;
  /** Wagons may start tied up (waiting in the line). */
  allowTied?: boolean;
  /** At least this many trains must wait for their turn along the first shortest answer. */
  waits?: number;
  /** Along the shortest answer one move must send this many trains at once. */
  chainSeen?: number;
  /** Bonus: a crane move must send this many in a row. */
  chain?: number;
  /** Simple players must not manage ★★★. */
  beatNaive?: boolean;
  maxOptimal?: number;
  /** Share of reachable yards that are dead ends, at most. */
  maxTraps?: number;
  maxStates?: number;
  target?: number;
  tries?: number;
  seed?: number;
  keep?: number;
}

export interface CargoCandidate {
  stage: CargoStage;
  audit: CargoAudit;
}

const shuffle = <T>(rand: () => number, a: T[]): T[] => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** A random yard of the spec's shape (not checked for being solvable). */
export function randomYard(rand: () => number, spec: CargoSpec): CargoStage | null {
  const sizes = spec.fixed ? spec.sizes.slice() : shuffle(rand, spec.sizes.slice());
  const kinds = shuffle(rand, [0, 1, 2, 3, 4, 5] as Kind[]).slice(0, spec.kinds);
  // The board: every kind once, then repeats, never the same kind twice in a row.
  const board: Kind[] = shuffle(rand, kinds.slice());
  while (board.length < spec.trains) board.splice(1 + Math.floor(rand() * board.length), 0, kinds[Math.floor(rand() * kinds.length)]);
  for (let i = 1; i < board.length; i++) if (board[i] === board[i - 1]) return null;
  // Each train takes a wagon of some size on the platform.
  const items: Kind[] = board.flatMap((k) => Array<Kind>(sizes[Math.floor(rand() * sizes.length)]).fill(k));
  const empty = new Set(shuffle(rand, sizes.map((_, i) => i)).slice(0, spec.empties));
  const room = sizes.reduce((n, s, i) => n + (empty.has(i) ? 0 : s), 0);
  if (items.length > room || items.length > sizes.reduce((a, b) => a + b, 0) - 2) return null;
  const start: Kind[][] = sizes.map(() => []);
  for (const k of shuffle(rand, items)) {
    const open = sizes.map((_, i) => i).filter((i) => !empty.has(i) && start[i].length < sizes[i]);
    if (!open.length) return null;
    start[open[Math.floor(rand() * open.length)]].push(k);
  }
  // Nothing leaves before the first move; nothing waits unless asked for.
  const tied = start.map((w, i) => w.length === sizes[i] && new Set(w).size === 1);
  if (tied[0] || (!spec.allowTied && tied.some(Boolean))) return null;
  const stage: CargoStage = { id: spec.id, number: 0, title: spec.title, tip: spec.tip, sizes, start, board: spec.board ? board : [], par: 0, solution: [], chain: spec.chain };
  return stage;
}

/** Yards of the spec's shape that pass its checks, nearest the target score first. */
export function searchCargo(spec: CargoSpec): CargoCandidate[] {
  const rand = rng(spec.seed ?? 1);
  const out: CargoCandidate[] = [];
  const seen = new Set<string>();
  for (let t = 0; t < (spec.tries ?? 300); t++) {
    const y = randomYard(rand, spec);
    if (!y) continue;
    const key = keyOf(initialState(y));
    if (seen.has(key)) continue;
    seen.add(key);
    const g = explore(y, {}, initialState(y), spec.maxStates ?? 60_000);
    if (!g || g.toWin[0] < 0) continue;
    const par = g.toWin[0];
    if (par < spec.par[0] || par > spec.par[1]) continue;
    const audit = auditCargo(y, g)!;
    if (spec.maxOptimal !== undefined && audit.optimal > spec.maxOptimal) continue;
    if (spec.maxTraps !== undefined && audit.traps > spec.maxTraps) continue;
    if (spec.waits !== undefined && audit.waited < spec.waits) continue;
    if (spec.chainSeen !== undefined && audit.chain < spec.chainSeen) continue;
    const stage = { ...y, par, solution: shortestFrom(y, g, g.states[0])! };
    if (spec.beatNaive && naiveMoves(stage) <= par) continue;
    if (spec.lineMatters) {
      const free = parAnyWagon(stage);
      if (free !== null && free >= par) continue;
    }
    if (spec.boardMatters) {
      const free = parNoBoard(stage);
      if (free !== null && free >= par) continue;
    }
    if (spec.chain) {
      const plain = parNoChain(stage);
      if (plain === null || plain >= par) continue;
    }
    out.push({ stage, audit });
  }
  const target = spec.target ?? 0;
  out.sort((a, b) => Math.abs(a.audit.score - target) - Math.abs(b.audit.score - target));
  return out.slice(0, spec.keep ?? 5);
}

/** A stage as a definition for stages.ts. */
export function toDef(stage: CargoStage): CargoStageDef {
  const { wagons, board } = stageStrings(stage);
  const def: CargoStageDef = { id: stage.id, title: stage.title, tip: stage.tip, wagons, board, par: stage.par, solution: stage.solution.map(moveName).join(' ') };
  if (stage.chain) def.chain = stage.chain;
  return def;
}

export { KIND_GLYPHS, topRun };

// ---------------------------------------------------------------- daily puzzle

export const CARGO_DAILY_PREFIX = 'cargo-daily-';

type DailyShape = Omit<CargoSpec, 'id' | 'title' | 'tip'>;
/**
 * Daily yards open early (after 1-4), so they keep to the first chapter's rules: wagons of three,
 * no departure board. They still need the line and beat the simple players.
 */
const base: DailyShape = { sizes: [3, 3, 3, 3, 3], trains: 4, kinds: 3, empties: 1, par: [6, 10], lineMatters: true, beatNaive: true, maxTraps: 0.6, target: 21, tries: 150 };
/** One shape per weekday, Sunday first. */
const DAILY_SHAPES: { shape: DailyShape; what: string }[] = [
  { shape: { ...base, kinds: 4, par: [8, 12], target: 26, chainSeen: 3 }, what: '줄줄이 출발시켜' },
  { shape: { ...base, sizes: [3, 3, 3, 3], trains: 3, par: [5, 8], target: 16 }, what: '맨 앞 화차부터' },
  { shape: { ...base, trains: 3, par: [5, 8], target: 18 }, what: '차근차근 모아' },
  { shape: { ...base }, what: '두 번 나눠' },
  { shape: { ...base, kinds: 4 }, what: '네 가지 선물을 모아' },
  { shape: { ...base, chainSeen: 3, target: 23 }, what: '세 대를 줄줄이' },
  { shape: { ...base, kinds: 4, par: [7, 11], target: 25 }, what: '빠듯한 화물역에서' },
];

/** The yard for a calendar date (YYYY-MM-DD). The same everywhere; built in a worker. */
export function dailyCargoDef(date: string): CargoStageDef {
  const [, m, d] = date.split('-').map(Number);
  const { shape, what } = DAILY_SHAPES[new Date(`${date}T12:00:00`).getDay()];
  for (let round = 0; round < 40; round++) {
    const found = searchCargo({
      ...shape,
      id: `${CARGO_DAILY_PREFIX}${date}`,
      title: `${m}월 ${d}일 화물역`,
      tip: `오늘의 퍼즐 · 선물을 ${what} 보내요!`,
      seed: hashString(`cargo:${date}:${round}`),
      keep: 1,
    });
    if (found.length) return toDef(found[0].stage);
  }
  throw new Error(`no yard for ${date}`);
}

export function dailyCargoStage(def: CargoStageDef): CargoStage {
  return { ...parseCargoStage(def, 0), label: '오늘의 퍼즐' };
}
