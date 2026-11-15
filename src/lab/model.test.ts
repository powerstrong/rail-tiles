import { describe, expect, it } from 'vitest';
import { act, isWon, type Stage } from './model';
import { breadthFirst } from './solver';
const stage = (kind: Stage['kind'], extra: Partial<Stage> = {}): Stage => ({ id: `lab-v1-${kind}-1`, kind, number: 1, title: '규칙 검사', cols: 3, rows: 3, start: [], goal: [], solution: [], par: 1, ...extra });
const replay = (s: Stage, actions: number[], start = s.start) => actions.reduce((v, a) => {
  const next = act(s, v, a); expect(next, `illegal action ${a}`).not.toBeNull(); return next!;
}, start);

describe('lab mechanics: behavior at the boundaries of each rule', () => {

  it('mirror rabbits reverse horizontal motion, blocked rabbit waits, homes do not lock rabbits', () => {
    const floor = Array(9).fill(1) as number[];
    const s = stage('twins', { terrain: floor, terrain2: floor, start: [0, 0], goal: [1, 0] });
    const next = act(s, s.start, 1)!;
    expect(next).toEqual([1, 0]); expect(isWon(s, next)).toBe(true);
    expect(act(s, next, 2)).toEqual([4, 3]);
    expect(act(s, [0, 0], 0)).toBeNull();
  });

  it('bee visits each flower once and the hive strictly last', () => {
    const s = stage('bee', { cols: 2, rows: 2, terrain: [1, 1, 1, 1], start: [0], goal: [1] });
    expect(act(s, [0], 1)).toBeNull();
    expect(act(s, [0, 2], 0)).toEqual([0]);
    expect(isWon(s, replay(s, [2, 3, 1]))).toBe(true);
  });

});

describe('lab search correctness', () => {

  it('distinguishes an exhausted budget from a proven dead end', () => {
    const s = stage('twins', { start: [0, 0], goal: [8, 8], terrain: Array(9).fill(1), terrain2: Array(9).fill(1) });
    expect(breadthFirst(s, s.start, 1).exhausted).toBe(true);
    const dead = { ...s, terrain: [1, 0, 0, 0, 0, 0, 0, 0, 0], terrain2: [1, 0, 0, 0, 0, 0, 0, 0, 0] };
    expect(breadthFirst(dead, dead.start)).toEqual({ path: null, visited: 1, exhausted: false });
  });

});
