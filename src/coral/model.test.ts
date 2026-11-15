import { describe, expect, it } from 'vitest';
import { count, Reef, solve, type CoralStage } from './model';
import { CORAL_STAGES } from './stages';

// Deliberately independent board-array flood and BFS, including zero-growth recolorings.
function rawMove(stage: CoralStage, board: number[], color: number): number[] {
  const seen = new Set([stage.origin]), old = board[stage.origin];
  for (const i of seen) for (let n = 0; n < board.length; n++) {
    if (Math.abs(i % stage.cols - n % stage.cols) + Math.abs(Math.floor(i / stage.cols) - Math.floor(n / stage.cols)) === 1 && board[n] === old) seen.add(n);
  }
  return board.map((v, i) => seen.has(i) ? color : v);
}
const rawWon = (s: CoralStage, board: number[]) => board.every(c => c < 0 || c === board[s.origin]);
function rawShortest(stage: CoralStage): number {
  const queue = [{ board: stage.start, moves: 0 }], seen = new Set([stage.start.join(',')]);
  const palette = [...new Set(stage.start.filter(c => c >= 0))];
  for (let at = 0; at < queue.length; at++) {
    const { board, moves } = queue[at];
    if (rawWon(stage, board)) return moves;
    for (const c of palette) {
      const next = rawMove(stage, board, c), key = next.join(',');
      if (!seen.has(key)) { seen.add(key); queue.push({ board: next, moves: moves + 1 }); }
    }
  }
  return Infinity;
}

describe('restored coral rules and exact par', () => {
  for (const stage of CORAL_STAGES) it(`${stage.number}: replays the full solution, checks every preview, independent shortest path`, () => {
    const reef = new Reef(stage);
    let state = reef.initial(), board = stage.start;
    expect(solve(reef)?.length).toBe(stage.par);
    expect(rawShortest(stage)).toBe(stage.par);
    expect(stage.solution).toHaveLength(stage.par);
    for (const color of stage.solution) {
      for (const c of reef.palette) {
        const projected = rawMove(stage, board, c);
        // Extract the flag's connected region from the independent board, using a distinct marker.
        const marked = rawMove(stage, projected, 99);
        const mask = marked.reduce((m, v, i) => v === 99 ? m | (1 << i) : m, 0);
        expect(reef.expand(state.mask, c)).toBe(mask);
      }
      const before = state.mask;
      state = reef.move(state, color)!;
      board = rawMove(stage, board, color);
      expect(state.mask & before).toBe(before);
      expect(stage.start.map((v, i) => v < 0 ? -1 : state.mask & (1 << i) ? state.color : v)).toEqual(board);
    }
    expect(reef.won(state)).toBe(true);
    expect(rawWon(stage, board)).toBe(true);
  });
  it('teaches with one and two moves, changes origin at chapter 2, adds connected rock detours at chapter 3', () => {
    expect(CORAL_STAGES.slice(0, 2).map(s => s.par)).toEqual([1, 2]);
    for (const s of CORAL_STAGES) {
      expect(s.origin).toBe(s.number <= 10 ? 0 : 12);
      expect(s.start.some(c => c < 0)).toBe(s.number > 20);
      const reef = new Reef(s);
      let mask = 1 << s.origin;
      for (let pass = 0; pass < 25; pass++) for (const c of reef.palette) mask = reef.expand(mask, c);
      expect(mask).toBe(reef.all);
    }
  });
  it('never creates a dead end: every reachable unfinished set has a growing choice', () => {
    for (const s of CORAL_STAGES) {
      const reef = new Reef(s), seen = new Set([reef.initial().mask]);
      for (const mask of seen) {
        const next = reef.palette.map(c => reef.expand(mask, c));
        if (mask !== reef.all) expect(next.some(m => m !== mask), s.id).toBe(true);
        next.forEach(m => seen.add(m));
      }
    }
  });
  it('allows inefficient recoloring, rejects invalid colors and leaves rocks untouched', () => {
    const s: CoralStage = { ...CORAL_STAGES[0], cols: 3, rows: 2, start: [0, 1, 2, -1, -1, 2], origin: 0, par: 2, solution: [1, 2] };
    const reef = new Reef(s), initial = reef.initial();
    expect(reef.move(initial, 2)).toEqual({ mask: initial.mask, color: 2 });
    expect(reef.move(initial, -1)).toBeNull();
    expect(reef.move(initial, 12)).toBeNull();
    expect(reef.move(initial, 0)).toBeNull();
    expect(reef.waves(1, 1 | 2 | 4 | 32)).toEqual(new Map([[1, 1], [2, 2], [5, 3]]));
    expect(count(reef.all)).toBe(4);
    expect(solve(reef, reef.move(initial, 2)!)?.length).toBe(2);
    expect(solve(reef, initial, 0)).toBeNull();
  });
  it('offers consequential first choices after the tutorials, without making large immediate gain always optimal', () => {
    let smallerWins = 0;
    for (const s of CORAL_STAGES.slice(3)) {
      const reef = new Reef(s), initial = reef.initial();
      const choices = reef.palette.map(c => ({ c, gain: count(reef.expand(initial.mask, c)) - count(initial.mask) })).filter(v => v.gain > 0);
      const evaluated = choices.map(v => ({ ...v, distance: 1 + solve(reef, reef.move(initial, v.c)!)!.length }));
      expect(Math.max(...evaluated.map(v => v.distance)), s.id).toBeGreaterThan(s.par);
      const biggest = Math.max(...evaluated.map(v => v.gain));
      if (evaluated.some(v => v.gain < biggest && v.distance === s.par) && evaluated.some(v => v.gain === biggest && v.distance > s.par)) smallerWins++;
    }
    expect(smallerWins).toBeGreaterThan(0);
  });
});
