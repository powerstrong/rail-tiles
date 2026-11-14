import { describe, expect, it } from 'vitest';
import { act, connected, crossing, degrees, describeAction, isWon, same, type Stage } from './model';
import { breadthFirst, bridgeSolutions, cloudSolutions, runs, solve, solveLights } from './solver';
const stage = (kind: Stage['kind'], extra: Partial<Stage> = {}): Stage => ({ id: `lab-v1-${kind}-1`, kind, number: 1, title: '규칙 검사', cols: 3, rows: 3, start: [], goal: [], solution: [], par: 1, ...extra });
const replay = (s: Stage, actions: number[], start = s.start) => actions.reduce((v, a) => {
  const next = act(s, v, a); expect(next, `illegal action ${a}`).not.toBeNull(); return next!;
}, start);

describe('lab mechanics: behavior at the boundaries of each rule', () => {
  it('acorns push one at a time, never pull or wrap across rows', () => {
    const s = stage('acorn', { cols: 4, rows: 3, terrain: Array(12).fill(1), start: [4, 5, 6], goal: [2, 3] });
    expect(act(s, s.start, 1)).toBeNull();
    expect(act(s, [4, 5, 7], 1)).toEqual([5, 6, 7]);
    expect(act(s, [4, 5, 7], 3)).toBeNull();
    expect(act(s, [3, 5, 7], 1)).toBeNull();
    expect(act(s, [5, 6, 7], 3)).toEqual([4, 6, 7]);
    expect(isWon(s, [8, 3, 2])).toBe(true);
  });
  it('mirror rabbits reverse horizontal motion, blocked rabbit waits, homes do not lock rabbits', () => {
    const floor = Array(9).fill(1) as number[];
    const s = stage('twins', { terrain: floor, terrain2: floor, start: [0, 0], goal: [1, 0] });
    const next = act(s, s.start, 1)!;
    expect(next).toEqual([1, 0]); expect(isWon(s, next)).toBe(true);
    expect(act(s, next, 2)).toEqual([4, 3]);
    expect(act(s, [0, 0], 0)).toBeNull();
  });
  it('lanterns toggle exactly the cross, and a second tap restores the entire board', () => {
    const s = stage('lights', { start: Array(9).fill(0) });
    expect(act(s, s.start, 4)).toEqual([0, 1, 0, 1, 1, 1, 0, 1, 0]);
    expect(act(s, s.start, 0)).toEqual([1, 1, 0, 1, 0, 0, 0, 0, 0]);
    expect(replay(s, [4, 4])).toEqual(s.start);
    expect(act(s, s.start, 9)).toBeNull();
  });
  it('coral absorbs only orthogonally connected color, never diagonal islands', () => {
    const s = stage('coral', { cols: 2, rows: 2, start: [0, 1, 1, 0] });
    expect(act(s, s.start, 1)).toEqual([1, 1, 1, 0]);
    expect(isWon(s, replay(s, [1, 0]))).toBe(true);
    expect(act(s, s.start, 0)).toBeNull();
  });
  it('nonograms require every filled clue cell, reject extra filled cells, and permit unmarked empty cells', () => {
    const s = stage('cloud', { cols: 2, rows: 2, goal: [1, 0, 0, 1] });
    expect(isWon(s, [1, 0, 2, 1])).toBe(true);
    expect(isWon(s, [1, 1, 2, 1])).toBe(false);
    expect(isWon(s, [1, 0, 0, 0])).toBe(false);
    expect(runs([1, 1, 0, 1, 0, 1, 1, 1])).toEqual([2, 1, 3]);
    expect(cloudSolutions(s)).toHaveLength(2);
  });
  it('a balance includes the fixed right weight and every candy must leave the tray', () => {
    const s = stage('balance', { start: [0, 0, 0], weights: [2, 3, 1], target: 4 });
    expect(isWon(s, [1, 1, 2])).toBe(true);
    expect(isWon(s, [1, 0, 2])).toBe(false);
    const hint = solve(s, [2, 1, 2]).path!;
    expect(isWon(s, replay(s, hint, [2, 1, 2]))).toBe(true);
  });
  it('moon stones jump exactly one occupied neighbor into a vacant landing and must finish on the star', () => {
    const s = stage('moon', { start: [1, 1, 0, 0, 0, 0, 0, 0, 0], terrain: Array(9).fill(1), goal: [2] });
    const next = act(s, s.start, 2)!;
    expect(next).toEqual([0, 0, 1, 0, 0, 0, 0, 0, 0]); expect(isWon(s, next)).toBe(true);
    expect(act(s, s.start, 0 * 9 + 3)).toBeNull();
    expect(isWon({ ...s, goal: [1] }, next)).toBe(false);
    expect(act({ ...s, terrain: [1, 1, 0, 1, 1, 1, 1, 1, 1] }, s.start, 2)).toBeNull();
  });
  it('mosaic moves only a neighbor of the blank, including row edge checks', () => {
    const s = stage('mosaic', { start: [1, 2, 3, 4, 5, 6, 7, 0, 8], goal: [1, 2, 3, 4, 5, 6, 7, 8, 0] });
    expect(isWon(s, act(s, s.start, 8)!)).toBe(true);
    expect(act(s, s.start, 3)).toBeNull();
    const path = solve(s, s.start).path!;
    expect(path).toEqual([8]); expect(isWon(s, replay(s, path))).toBe(true);
  });
  it('bee visits each flower once and the hive strictly last', () => {
    const s = stage('bee', { cols: 2, rows: 2, terrain: [1, 1, 1, 1], start: [0], goal: [1] });
    expect(act(s, [0], 1)).toBeNull();
    expect(act(s, [0, 2], 0)).toBeNull();
    expect(isWon(s, replay(s, [2, 3, 1]))).toBe(true);
  });
  it('bridges count double links, reject crossings and require a single connected network', () => {
    const s = stage('bridges', { cols: 3, rows: 3, islands: [{ at: 3, need: 1 }, { at: 5, need: 1 }, { at: 1, need: 1 }, { at: 7, need: 1 }], edges: [[0, 1], [2, 3]], start: [0, 0], goal: [] });
    expect(crossing(s, 0, 1)).toBe(true);
    expect(act(s, [1, 0], 4)).toBeNull();
    const disconnected = { ...s, islands: [{ at: 0, need: 1 }, { at: 2, need: 1 }, { at: 6, need: 1 }, { at: 8, need: 1 }] };
    expect(degrees(disconnected, [1, 1])).toEqual([1, 1, 1, 1]);
    expect(connected(disconnected, [1, 1])).toBe(false); expect(isWon(disconnected, [1, 1])).toBe(false);
    const simple = stage('bridges', { islands: [{ at: 0, need: 2 }, { at: 2, need: 2 }], edges: [[0, 1]], start: [0], goal: [2] });
    expect(bridgeSolutions(simple)).toEqual([[2]]); expect(isWon(simple, [2])).toBe(true);
  });
});

describe('lab search correctness', () => {
  it('explains two taps when a clue, candy or bridge must cycle through an intermediate value', () => {
    expect(describeAction(stage('cloud'), [2], 1)).toContain('두 번');
    expect(describeAction(stage('balance', { weights: [3] }), [0], 2)).toContain('두 번');
    const bridge = stage('bridges', { islands: [{ at: 0, need: 2 }, { at: 2, need: 2 }], edges: [[0, 1]], start: [1], goal: [2] });
    expect(solve(bridge, bridge.start).path).toEqual([2]);
    expect(describeAction(bridge, [0], 2)).toContain('두 번');
    expect(describeAction(bridge, [1], 0)).toContain('두 번');
    expect(describeAction(bridge, [2], 0)).toContain('한 번');
  });
  it('finds shortest lantern flips for every reachable 3×3 configuration (independent exhaustive BFS)', () => {
    const s = stage('lights', { start: Array(9).fill(1) });
    const queue = [{ v: s.start, depth: 0 }], seen = new Set([s.start.join('')]);
    for (let at = 0; at < queue.length; at++) {
      const { v, depth } = queue[at];
      const path = solveLights(s, v)!;
      expect(path.length).toBe(depth); expect(isWon(s, replay(s, path, v))).toBe(true);
      for (let a = 0; a < 9; a++) {
        const next = act(s, v, a)!, key = next.join('');
        if (!seen.has(key)) { seen.add(key); queue.push({ v: next, depth: depth + 1 }); }
      }
    }
    expect(seen.size).toBe(512);
  });
  it('distinguishes an exhausted budget from a proven dead end', () => {
    const s = stage('twins', { start: [0, 0], goal: [8, 8], terrain: Array(9).fill(1), terrain2: Array(9).fill(1) });
    expect(breadthFirst(s, s.start, 1).exhausted).toBe(true);
    const dead = { ...s, terrain: [1, 0, 0, 0, 0, 0, 0, 0, 0], terrain2: [1, 0, 0, 0, 0, 0, 0, 0, 0] };
    expect(breadthFirst(dead, dead.start)).toEqual({ path: null, visited: 1, exhausted: false });
  });
  it('finds the optimal mosaic answer for every reachable six-tile board', () => {
    const s = stage('mosaic', { cols: 3, rows: 2, start: [1, 2, 3, 4, 5, 0], goal: [1, 2, 3, 4, 5, 0] });
    const queue = [{ v: s.goal, depth: 0 }], seen = new Set([s.goal.join(',')]);
    for (let head = 0; head < queue.length; head++) {
      const { v, depth } = queue[head];
      const result = solve(s, v);
      expect(result.exhausted).toBe(false);
      expect(result.path?.length).toBe(depth);
      expect(isWon(s, replay(s, result.path!, v))).toBe(true);
      for (let a = 0; a < v.length; a++) {
        const next = act(s, v, a);
        if (!next || seen.has(next.join(','))) continue;
        seen.add(next.join(',')); queue.push({ v: next, depth: depth + 1 });
      }
    }
    expect(seen.size).toBe(360);
  });
  it('rejects invalid integer actions and does not mutate previous states', () => {
    const s = stage('lights', { start: Array(9).fill(0) });
    expect(act(s, s.start, -1)).toBeNull(); expect(act(s, s.start, 1.5)).toBeNull();
    act(s, s.start, 4); expect(same(s.start, Array(9).fill(0))).toBe(true);
  });
});
