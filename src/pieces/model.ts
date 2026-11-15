/** Pure polyomino rules, shared by input, hints, the generator and replay tests. */
export type Cell = [number, number];
export interface Pose { x: number; y: number; turn: number; flip: boolean }
export type Layout = (Pose | null)[];
export interface Piece { cells: Cell[] }
export interface PiecesStage {
  id: string; title: string; label: string; number: number;
  cols: number; rows: number; target: Cell[]; pieces: Piece[];
  allowFlip: boolean; solution: Pose[]; par: number;
  picture: 'fish' | 'boat' | 'bird' | 'cat' | 'rocket' | 'turtle' | 'car';
  audit: { greedyWins: number; samples: number; legalStarts: number; deadStarts: number };
}
export const key = ([x, y]: Cell) => `${x},${y}`;
export function normalize(cells: Cell[]): Cell[] {
  const x = Math.min(...cells.map(c => c[0])), y = Math.min(...cells.map(c => c[1]));
  return cells.map(([a, b]): Cell => [a - x, b - y]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}
export const shapeKey = (cells: Cell[]) => normalize(cells).map(key).join(';');
export function shape(piece: Piece, turn = 0, flip = false): Cell[] {
  let cells = piece.cells.map(([x, y]): Cell => [flip ? -x : x, y]);
  for (let i = 0; i < ((turn % 4) + 4) % 4; i++) cells = cells.map(([x, y]) => [-y, x]);
  return normalize(cells);
}
export const occupied = (piece: Piece, p: Pose): Cell[] => shape(piece, p.turn, p.flip).map(([x, y]) => [x + p.x, y + p.y]);
export function canPlace(s: PiecesStage, layout: Layout, index: number, p: Pose): boolean {
  if (!s.pieces[index] || !Number.isInteger(p.x) || !Number.isInteger(p.y) || !Number.isInteger(p.turn) || p.turn < 0 || p.turn > 3 || (p.flip && !s.allowFlip)) return false;
  const target = new Set(s.target.map(key));
  const used = new Set(layout.flatMap((at, i) => at && i !== index ? occupied(s.pieces[i], at).map(key) : []));
  return occupied(s.pieces[index], p).every(c => target.has(key(c)) && !used.has(key(c)));
}
export function place(s: PiecesStage, layout: Layout, index: number, p: Pose): Layout | null {
  if (!canPlace(s, layout, index, p)) return null;
  const next = [...layout]; next[index] = { ...p }; return next;
}
export function isComplete(s: PiecesStage, layout: Layout): boolean {
  return layout.length === s.pieces.length && layout.every((p, i) => p !== null && canPlace(s, layout, i, p)) && s.pieces.reduce((n, p) => n + p.cells.length, 0) === s.target.length;
}
export function samePlacement(piece: Piece, a: Pose | null, b: Pose | null): boolean {
  return a === null || b === null ? a === b : occupied(piece, a).map(key).sort().join(';') === occupied(piece, b).map(key).sort().join(';');
}
export function orientations(piece: Piece, allowFlip: boolean): { turn: number; flip: boolean; cells: Cell[] }[] {
  const seen = new Set<string>();
  const out = [];
  for (const flip of allowFlip ? [false, true] : [false]) for (let turn = 0; turn < 4; turn++) {
    const cells = shape(piece, turn, flip), k = shapeKey(cells);
    if (!seen.has(k)) { seen.add(k); out.push({ turn, flip, cells }); }
  }
  return out;
}
export interface Candidate { pose: Pose; mask: bigint }
export function candidates(s: PiecesStage): Candidate[][] {
  const ids = new Map(s.target.map((c, i) => [key(c), i]));
  return s.pieces.map(piece => orientations(piece, s.allowFlip).flatMap(({ cells, turn, flip }) => {
    const out: Candidate[] = [];
    for (let y = 0; y < s.rows; y++) for (let x = 0; x < s.cols; x++) {
      const indices = cells.map(([a, b]) => ids.get(key([a + x, b + y])));
      if (indices.every(i => i !== undefined)) out.push({ pose: { x, y, turn, flip }, mask: indices.reduce<bigint>((m, i) => m | (1n << BigInt(i!)), 0n) });
    }
    return out;
  }));
}
/** Exact cover, choosing the uncovered cell with the fewest options. A limit is unknown, never proof of failure. */
export function solve(s: PiecesStage, fixed: Layout = s.pieces.map(() => null), limit = 100_000): { solution: Pose[] | null; exhausted: boolean; nodes: number } {
  const all = candidates(s), byCell = s.target.map((_, cell) => all.flatMap((list, i) => list.filter(c => !!(c.mask & (1n << BigInt(cell)))).map(c => ({ ...c, i }))));
  const full = (1n << BigInt(s.target.length)) - 1n;
  const answer = [...fixed];
  let used = 0n, taken = 0, nodes = 0, exhausted = false;
  for (let i = 0; i < fixed.length; i++) if (fixed[i]) {
    if (!canPlace(s, fixed, i, fixed[i]!)) return { solution: null, exhausted: false, nodes };
    const found = all[i].find(c => samePlacement(s.pieces[i], c.pose, fixed[i]));
    if (!found) return { solution: null, exhausted: false, nodes };
    used |= found.mask; taken |= 1 << i;
  }
  const visit = (mask: bigint, pieces: number): boolean => {
    if (++nodes > limit) { exhausted = true; return false; }
    if (mask === full) return true;
    let choices: (Candidate & { i: number })[] | undefined;
    for (let cell = 0; cell < s.target.length; cell++) {
      if (mask & (1n << BigInt(cell))) continue;
      const possible = byCell[cell].filter(c => !(pieces & (1 << c.i)) && !(mask & c.mask));
      if (!possible.length) return false;
      if (!choices || possible.length < choices.length) choices = possible;
    }
    for (const c of choices ?? []) {
      answer[c.i] = c.pose;
      if (visit(mask | c.mask, pieces | (1 << c.i))) return true;
      answer[c.i] = null;
      if (exhausted) return false;
    }
    return false;
  };
  const ok = visit(used, taken);
  return { solution: ok ? answer as Pose[] : null, exhausted, nodes };
}
