import { act, actions, connected, crossing, degrees, DIRS, isWon, keyOf, neighbor, same, type Stage, type State } from './model';
export interface SearchResult { path: number[] | null; visited: number; exhausted: boolean }
/** Bounded BFS for push, simultaneous motion and flood puzzles. Runs in a Worker in the UI. */
export function breadthFirst(s: Stage, start: State, budget = 160_000): SearchResult {
  const nodes: { v: State; parent: number; action: number }[] = [{ v: start, parent: -1, action: -1 }];
  const seen = new Set([keyOf(start)]);
  for (let head = 0; head < nodes.length; head++) {
    const { v } = nodes[head];
    if (isWon(s, v)) {
      const path: number[] = [];
      for (let i = head; nodes[i].parent >= 0; i = nodes[i].parent) path.push(nodes[i].action);
      return { path: path.reverse(), visited: seen.size, exhausted: false };
    }
    for (const action of actions(s, v)) {
      const next = act(s, v, action);
      if (!next) continue;
      const key = keyOf(next);
      if (seen.has(key)) continue;
      if (seen.size >= budget) return { path: null, visited: seen.size, exhausted: true };
      seen.add(key); nodes.push({ v: next, parent: head, action });
    }
  }
  return { path: null, visited: seen.size, exhausted: false };
}
/** Gaussian elimination over GF(2), then enumerate the small null space for a shortest answer. */
export function solveLights(s: Stage, start: State): number[] | null {
  const n = start.length;
  const rows = start.map((v, i) => {
    let mask = (1 - v) << n;
    for (const j of [i, ...DIRS.map((_, d) => neighbor(s, i, d))]) if (j >= 0) mask |= 1 << j;
    return mask;
  });
  const pivots: number[] = [];
  let rank = 0;
  for (let c = 0; c < n; c++) {
    const p = rows.findIndex((v, i) => i >= rank && (v & (1 << c)) !== 0);
    if (p < 0) continue;
    [rows[rank], rows[p]] = [rows[p], rows[rank]];
    for (let r = 0; r < n; r++) if (r !== rank && (rows[r] & (1 << c))) rows[r] ^= rows[rank];
    pivots.push(c); rank++;
  }
  const vars = (1 << n) - 1;
  if (rows.some(v => (v & vars) === 0 && (v & (1 << n)))) return null;
  const free = start.map((_, i) => i).filter(i => !pivots.includes(i));
  let best: number[] | null = null;
  for (let mask = 0; mask < 2 ** free.length; mask++) {
    const x = Array(n).fill(0) as number[];
    free.forEach((c, i) => { x[c] = (mask >> i) & 1; });
    pivots.forEach((c, r) => {
      let value = (rows[r] >> n) & 1;
      free.forEach(f => { if (rows[r] & (1 << f)) value ^= x[f]; });
      x[c] = value;
    });
    const path = x.flatMap((v, i) => v ? [i] : []);
    if (!best || path.length < best.length) best = path;
  }
  return best;
}
export function runs(line: number[]): number[] {
  const out: number[] = []; let n = 0;
  for (const x of [...line, 0]) { if (x === 1) n++; else if (n) { out.push(n); n = 0; } }
  return out;
}
function linePatterns(n: number, clue: number[]): number[][] {
  const out: number[][] = [];
  for (let mask = 0; mask < 2 ** n; mask++) {
    const v = Array.from({ length: n }, (_, i) => (mask >> i) & 1);
    if (same(runs(v), clue)) out.push(v);
  }
  return out;
}
/** Counts solutions from clues alone, independently of the supplied picture. */
export function cloudSolutions(s: Stage, limit = 2): State[] {
  const rowOptions = Array.from({ length: s.rows }, (_, y) => linePatterns(s.cols, runs(s.goal.slice(y * s.cols, (y + 1) * s.cols))));
  const colOptions = Array.from({ length: s.cols }, (_, x) => linePatterns(s.rows, runs(Array.from({ length: s.rows }, (_, y) => s.goal[y * s.cols + x]))));
  const answers: State[] = [];
  const walk = (rows: number[][]) => {
    if (answers.length >= limit) return;
    if (rows.length === s.rows) { answers.push(rows.flat()); return; }
    for (const row of rowOptions[rows.length]) {
      const next = [...rows, row];
      if (colOptions.every((options, x) => options.some(v => next.every((r, y) => r[x] === v[y])))) walk(next);
    }
  };
  walk([]); return answers;
}
export function bridgeSolutions(s: Stage, limit = 2): State[] {
  const answers: State[] = [], v = Array(s.edges!.length).fill(0) as State;
  const walk = (at: number) => {
    if (answers.length >= limit) return;
    const deg = degrees(s, v);
    for (let i = 0; i < deg.length; i++) {
      const left = s.edges!.slice(at).filter(([a, b]) => a === i || b === i).length;
      if (deg[i] > s.islands![i].need || deg[i] + left * 2 < s.islands![i].need) return;
    }
    if (at === v.length) { if (connected(s, v)) answers.push([...v]); return; }
    for (let n = 0; n <= 2; n++) {
      if (n && v.some((count, e) => e < at && count > 0 && crossing(s, at, e))) break;
      v[at] = n; walk(at + 1);
    }
    v[at] = 0;
  };
  walk(0); return answers;
}
/** Choose a valid balance assignment requiring the fewest changes from the player's arrangement. */
function solveBalance(s: Stage, v: State): number[] | null {
  let best: number[] | null = null;
  for (let mask = 0; mask < 2 ** v.length; mask++) {
    const goal = v.map((_, i) => (mask >> i) & 1 ? 1 : 2);
    const total = goal.reduce((n, x, i) => n + s.weights![i] * (x === 1 ? 1 : -1), 0);
    if (total !== s.target) continue;
    const path = goal.flatMap((x, i) => x !== v[i] ? [i * 3 + x] : []);
    if (!best || path.length < best.length) best = path;
  }
  return best;
}
/** IDA* avoids allocating a 9! permutation graph on a child's device. */
export function solveMosaic(s: Stage, v: State, budget = 600_000): SearchResult {
  let visited = 0;
  const dist = (board: State) => board.reduce((n, value, at) => {
    if (!value) return n;
    const goal = value - 1;
    return n + Math.abs(at % s.cols - goal % s.cols) + Math.abs(Math.floor(at / s.cols) - Math.floor(goal / s.cols));
  }, 0);
  const path: number[] = [];
  const board = [...v];
  let answer: number[] | null = null;
  const walk = (g: number, bound: number, lastBlank: number): number => {
    visited++;
    if (visited > budget) return Infinity;
    const h = dist(board);
    if (g + h > bound) return g + h;
    if (h === 0) { answer = [...path]; return -1; }
    const blank = board.indexOf(0);
    let nextBound = Infinity;
    for (let d = 0; d < 4; d++) {
      const n = neighbor(s, blank, d);
      if (n < 0 || n === lastBlank) continue;
      [board[blank], board[n]] = [board[n], board[blank]];
      path.push(n);
      const found = walk(g + 1, bound, blank);
      path.pop(); [board[blank], board[n]] = [board[n], board[blank]];
      if (found === -1) return -1;
      nextBound = Math.min(nextBound, found);
      if (visited > budget) break;
    }
    return nextBound;
  };
  let bound = dist(v);
  while (bound <= 80 && visited <= budget) {
    const next = walk(0, bound, -1);
    if (next === -1 || !Number.isFinite(next)) break;
    bound = next;
  }
  return { path: answer, visited, exhausted: visited > budget };
}
function depthFirst(s: Stage, start: State, budget: number): SearchResult {
  const seen = new Set<string>(); let visited = 0;
  const walk = (v: State): number[] | null => {
    if (isWon(s, v)) return [];
    if (++visited > budget) return null;
    const key = keyOf(v);
    if (seen.has(key)) return null;
    seen.add(key);
    for (const action of actions(s, v)) {
      const next = act(s, v, action);
      if (!next) continue;
      const tail = walk(next);
      if (tail) return [action, ...tail];
      if (visited > budget) return null;
    }
    return null;
  };
  return { path: walk(start), visited, exhausted: visited > budget };
}
export function solve(s: Stage, v: State, budget = 160_000): SearchResult {
  if (isWon(s, v)) return { path: [], visited: 0, exhausted: false };
  switch (s.kind) {
    case 'lights': return { path: solveLights(s, v), visited: 1, exhausted: false };
    case 'mosaic': return solveMosaic(s, v, Math.max(budget, 600_000));
    case 'cloud': return { path: s.goal.flatMap((n, i) => n === 1 && v[i] !== 1 ? [i * 3 + 1] : n === 0 && v[i] === 1 ? [i * 3 + 2] : []), visited: 1, exhausted: false };
    case 'balance': return { path: solveBalance(s, v), visited: 2 ** v.length, exhausted: false };
    case 'bridges': {
      // Clear crossing/incorrect bridges before adding to the unique intended network.
      const goal = s.goal;
      const clear = v.flatMap((n, i) => n && goal[i] === 0 ? [i * 3] : []);
      const add = goal.flatMap((n, i) => n && n !== v[i] ? [i * 3 + n] : []);
      return { path: [...clear, ...add], visited: 1, exhausted: false };
    }
    case 'moon': case 'bee': return depthFirst(s, v, budget);
    default: return breadthFirst(s, v, budget);
  }
}
