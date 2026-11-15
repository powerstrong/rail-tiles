/** 0 = unknown, 1 = thread, 2 = deliberately empty. */
export type Mark = 0 | 1 | 2;
export interface Clues { rows: number[][]; cols: number[][] }
export interface CloudStage {
  id: string; number: number; title: string; label: string; rows: number; cols: number;
  goal: number[]; clues: Clues; lesson: string; par: number;
}
export function runs(line: number[]): number[] {
  const result: number[] = [];
  let n = 0;
  for (const v of [...line, 0]) { if (v === 1) n++; else if (n) { result.push(n); n = 0; } }
  return result;
}
export const cluesOf = (goal: number[], rows: number, cols: number): Clues => ({
  rows: Array.from({ length: rows }, (_, y) => runs(goal.slice(y * cols, (y + 1) * cols))),
  cols: Array.from({ length: cols }, (_, x) => runs(Array.from({ length: rows }, (_, y) => goal[y * cols + x]))),
});
/** Enumerate placements from the clue alone. No stored artwork is consulted. */
export function patterns(size: number, clue: number[], marks: number[] = Array(size).fill(0)): number[][] {
  const out: number[][] = [];
  for (let mask = 0; mask < 2 ** size; mask++) {
    const line = Array.from({ length: size }, (_, i) => (mask >> i) & 1);
    if (runs(line).join(',') !== clue.join(',')) continue;
    if (line.every((v, i) => !marks[i] || v === (marks[i] === 1 ? 1 : 0))) out.push(line);
  }
  return out;
}
export interface Line {
  axis: 'row' | 'col'; index: number; cells: number[]; clue: number[]; candidates: number[][];
}
export function lines(clues: Clues, state: number[]): Line[] {
  const rows = clues.rows.length, cols = clues.cols.length;
  return (['row', 'col'] as const).flatMap(axis => (axis === 'row' ? clues.rows : clues.cols).map((clue, index) => {
    const cells = Array.from({ length: axis === 'row' ? cols : rows }, (_, k) => axis === 'row' ? index * cols + k : k * cols + index);
    return { axis, index, cells, clue, candidates: patterns(cells.length, clue, cells.map(i => state[i])) };
  }));
}
export const lineName = (line: Pick<Line, 'axis' | 'index'>) => `${line.index + 1}${line.axis === 'row' ? '행' : '열'}`;
export interface Deduction { line: Line; cell: number; value: Mark; reason: string }
export function logicalHint(clues: Clues, state: number[]): Deduction | null {
  const all = lines(clues, state);
  if (all.some(l => !l.candidates.length)) return null;
  for (const line of all) {
    for (let k = 0; k < line.cells.length; k++) {
      const cell = line.cells[k], v = line.candidates[0][k];
      if (state[cell] || !line.candidates.every(p => p[k] === v)) continue;
      const clue = line.clue.join('·') || '0';
      const why = line.clue.length === 0 ? '0은 모두 비우라는 뜻이에요.'
        : line.candidates.length === 1 ? '숫자 묶음과 사이의 빈칸을 놓는 방법이 하나뿐이에요.'
        : `가능한 ${line.candidates.length}가지 배치가 이 칸에서 모두 겹쳐요.`;
      return { line, cell, value: v ? 1 : 2, reason: `${lineName(line)} 단서 ${clue}: ${why} 그래서 ${k + 1}번째 칸은 ${v ? '수놓아요' : '×로 비워요'}.` };
    }
  }
  return null;
}
export function isComplete(clues: Clues, state: number[]): boolean {
  return state.every(v => v !== 0) && lines(clues, state).every(l => l.candidates.length === 1);
}
/** Proof trace: each move follows just one line, without branching. */
export function solveByLines(clues: Clues): Deduction[] | null {
  const state = Array(clues.rows.length * clues.cols.length).fill(0), trace: Deduction[] = [];
  while (!isComplete(clues, state)) {
    const hint = logicalHint(clues, state);
    if (!hint) return null;
    state[hint.cell] = hint.value; trace.push(hint);
  }
  return trace;
}
/** Independent row enumeration with column-prefix pruning; count up to two. */
export function countSolutions(clues: Clues): number {
  const rows = clues.rows.map(c => patterns(clues.cols.length, c));
  const cols = clues.cols.map(c => patterns(clues.rows.length, c));
  let count = 0;
  function visit(board: number[][]) {
    if (count >= 2) return;
    if (board.length === rows.length) { count++; return; }
    for (const row of rows[board.length]) {
      const next = [...board, row];
      if (cols.every((ps, x) => ps.some(p => next.every((r, y) => r[x] === p[y])))) visit(next);
    }
  }
  visit([]); return count;
}
