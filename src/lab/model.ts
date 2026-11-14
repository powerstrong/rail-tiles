import { withTo } from '../ui/korean';

/** Experimental games deliberately have no dependency on the shipped world/unlock registry. */
export const KINDS = ['acorn', 'twins', 'lights', 'coral', 'cloud', 'balance', 'moon', 'mosaic', 'bee', 'bridges'] as const;
export type Kind = typeof KINDS[number];
export type State = number[];
export interface Island { at: number; need: number }
export interface Stage {
  id: string;
  kind: Kind;
  number: number;
  title: string;
  cols: number;
  rows: number;
  start: State;
  goal: State;
  terrain?: number[];
  terrain2?: number[];
  weights?: number[];
  target?: number;
  islands?: Island[];
  edges?: [number, number][];
  /** A checked solution, used for the stage audit, never for pretending arbitrary states are solved. */
  solution: number[];
  par: number;
}
export const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]] as const;
export const same = (a: State, b: State) => a.length === b.length && a.every((v, i) => v === b[i]);
export function neighbor(s: Pick<Stage, 'cols' | 'rows'>, cell: number, dir: number): number {
  const [dx, dy] = DIRS[dir];
  const x = cell % s.cols + dx, y = Math.floor(cell / s.cols) + dy;
  return x >= 0 && x < s.cols && y >= 0 && y < s.rows ? y * s.cols + x : -1;
}
export function floodRegion(s: Stage, state: State): Set<number> {
  const region = new Set([0]);
  for (const cell of region) for (let d = 0; d < 4; d++) {
    const n = neighbor(s, cell, d);
    if (n >= 0 && state[n] === state[0]) region.add(n);
  }
  return region;
}
export function crossing(s: Stage, e: number, f: number): boolean {
  const edge = (i: number) => s.edges![i].map(k => s.islands![k].at);
  const [a, b] = edge(e), [c, d] = edge(f);
  if ([a, b].includes(c) || [a, b].includes(d)) return false;
  const x = (p: number) => p % s.cols, y = (p: number) => Math.floor(p / s.cols);
  const horizontal = (p: number, q: number) => y(p) === y(q);
  if (horizontal(a, b) === horizontal(c, d)) return false;
  const [h1, h2, v1, v2] = horizontal(a, b) ? [a, b, c, d] : [c, d, a, b];
  return Math.min(x(h1), x(h2)) < x(v1) && x(v1) < Math.max(x(h1), x(h2)) && Math.min(y(v1), y(v2)) < y(h1) && y(h1) < Math.max(y(v1), y(v2));
}
export function degrees(s: Stage, state: State): number[] {
  return s.islands!.map((_, i) => s.edges!.reduce((n, [a, b], e) => n + (a === i || b === i ? state[e] : 0), 0));
}
export function connected(s: Stage, state: State): boolean {
  const seen = new Set([0]);
  for (const i of seen) s.edges!.forEach(([a, b], e) => {
    if (state[e] > 0 && (a === i || b === i)) seen.add(a === i ? b : a);
  });
  return seen.size === s.islands!.length;
}
export function isWon(s: Stage, v: State): boolean {
  switch (s.kind) {
    case 'acorn': return same(v.slice(1).sort((a, b) => a - b), [...s.goal].sort((a, b) => a - b));
    case 'twins': case 'mosaic': return same(v, s.goal);
    case 'lights': return v.every(x => x === 1);
    case 'coral': return v.every(x => x === v[0]);
    case 'cloud': return v.every((x, i) => (x === 1 ? 1 : 0) === s.goal[i]);
    case 'balance': return v.every(x => x > 0) && v.reduce((n, x, i) => n + s.weights![i] * (x === 1 ? 1 : -1), 0) === s.target;
    case 'moon': return v[s.goal[0]] === 1 && v.reduce((a, b) => a + b, 0) === 1;
    case 'bee': return v.length === s.terrain!.filter(Boolean).length && v.at(-1) === s.goal[0];
    case 'bridges': return degrees(s, v).every((n, i) => n === s.islands![i].need) && connected(s, v);
  }
}
/** All actions are small integers, so they can cross a Worker boundary and be replayed in tests. */
export function act(s: Stage, v: State, action: number): State | null {
  if (!Number.isInteger(action) || action < 0) return null;
  const out = [...v];
  switch (s.kind) {
    case 'acorn': {
      if (action > 3) return null;
      const dest = neighbor(s, v[0], action);
      if (dest < 0 || !s.terrain![dest]) return null;
      const box = v.indexOf(dest, 1);
      if (box > 0) {
        const beyond = neighbor(s, dest, action);
        if (beyond < 0 || !s.terrain![beyond] || v.slice(1).includes(beyond)) return null;
        out[box] = beyond;
      }
      out[0] = dest;
      return [out[0], ...out.slice(1).sort((a, b) => a - b)];
    }
    case 'twins': {
      if (action > 3) return null;
      for (let i = 0; i < 2; i++) {
        const d = i === 1 && action % 2 === 1 ? (action + 2) % 4 : action;
        const dest = neighbor(s, v[i], d);
        if (dest >= 0 && (i === 0 ? s.terrain! : s.terrain2!)[dest]) out[i] = dest;
      }
      return same(out, v) ? null : out;
    }
    case 'lights': {
      if (action >= v.length) return null;
      for (const n of [action, ...DIRS.map((_, d) => neighbor(s, action, d))]) if (n >= 0) out[n] = 1 - out[n];
      return out;
    }
    case 'coral': {
      if (action > 4 || action === v[0]) return null;
      for (const n of floodRegion(s, v)) out[n] = action;
      return out;
    }
    case 'cloud': case 'balance': {
      const at = Math.floor(action / 3), value = action % 3;
      if (at >= v.length || v[at] === value) return null;
      out[at] = value;
      return out;
    }
    case 'moon': {
      const from = Math.floor(action / v.length), to = action % v.length;
      if (from >= v.length || v[from] !== 1 || v[to] !== 0) return null;
      for (let d = 0; d < 4; d++) {
        const middle = neighbor(s, from, d);
        if (middle >= 0 && neighbor(s, middle, d) === to && v[middle] === 1 && s.terrain![to]) {
          out[from] = 0; out[middle] = 0; out[to] = 1;
          return out;
        }
      }
      return null;
    }
    case 'mosaic': {
      if (action >= v.length) return null;
      const blank = v.indexOf(0);
      if (!DIRS.some((_, d) => neighbor(s, blank, d) === action)) return null;
      [out[blank], out[action]] = [out[action], out[blank]];
      return out;
    }
    case 'bee': {
      if (action >= s.cols * s.rows || !s.terrain![action] || v.includes(action)) return null;
      if (!DIRS.some((_, d) => neighbor(s, v.at(-1)!, d) === action)) return null;
      if (action === s.goal[0] && v.length + 1 !== s.terrain!.filter(Boolean).length) return null;
      return [...v, action];
    }
    case 'bridges': {
      const e = Math.floor(action / 3), value = action % 3;
      if (e >= v.length || v[e] === value) return null;
      if (value > 0 && v.some((n, f) => n > 0 && f !== e && crossing(s, e, f))) return null;
      out[e] = value;
      return out;
    }
  }
}
export function actions(s: Stage, v: State): number[] {
  switch (s.kind) {
    case 'acorn': case 'twins': return [0, 1, 2, 3];
    case 'lights': return v.map((_, i) => i);
    case 'coral': return [...new Set(v)].filter(n => n !== v[0]);
    case 'cloud': case 'balance': case 'bridges': return v.flatMap((_, i) => [i * 3, i * 3 + 1, i * 3 + 2]);
    case 'moon': return v.flatMap((n, i) => n ? DIRS.flatMap((_, d) => {
      const mid = neighbor(s, i, d), dest = mid >= 0 ? neighbor(s, mid, d) : -1;
      return dest >= 0 ? [i * v.length + dest] : [];
    }) : []);
    case 'mosaic': return DIRS.map((_, d) => neighbor(s, v.indexOf(0), d)).filter(n => n >= 0);
    case 'bee': return DIRS.map((_, d) => neighbor(s, v.at(-1)!, d)).filter(n => n >= 0);
  }
}
export const keyOf = (v: State) => v.join(',');
export const moveWord = (a: number) => ['↑ 위', '→ 오른쪽', '↓ 아래', '← 왼쪽'][a];
export const location = (s: Stage, cell: number) => `${Math.floor(cell / s.cols) + 1}행 ${cell % s.cols + 1}열`;
export function describeAction(s: Stage, v: State, a: number): string {
  const at = Math.floor(a / 3), value = a % 3;
  const presses = s.kind === 'cloud' || s.kind === 'balance' || s.kind === 'bridges'
    ? (value - v[at] + 3) % 3 : 1;
  const times = presses === 2 ? '두 번' : '한 번';
  switch (s.kind) {
    case 'acorn': return `${withTo(moveWord(a))} 다람쥐를 한 칸 움직여 보세요.`;
    case 'twins': return `${moveWord(a)} 버튼으로 두 토끼를 함께 움직여 보세요.`;
    case 'lights': return `${location(s, a)} 반딧불을 눌러 보세요.`;
    case 'coral': return `${['● 빨강', '◆ 노랑', '▲ 초록', '■ 파랑', '♥ 보라'][a]} 색을 골라 보세요.`;
    case 'cloud': return `${location(s, at)}을 ${times} 눌러 ${value === 1 ? '수놓아' : '빈칸으로 표시해'} 보세요.`;
    case 'balance': return `${at + 1}번 별사탕(${s.weights![at]}) 카드를 ${times} 눌러 ${value === 1 ? '왼쪽' : '오른쪽'}에 놓아 보세요.`;
    case 'moon': return `${location(s, Math.floor(a / v.length))} 돌을 ${location(s, a % v.length)}로 뛰게 해 보세요.`;
    case 'mosaic': return `${a >= 0 ? v[a] : ''}번 조각을 빈칸으로 밀어 보세요.`;
    case 'bee': return `${location(s, a)} 꽃으로 날아가 보세요.`;
    case 'bridges': {
      const e = Math.floor(a / 3), [i, j] = s.edges![e];
      return `${i + 1}번 섬과 ${j + 1}번 섬을 ${times} 이어 ${value === 0 ? '다리를 지워' : `다리 ${value}개로 바꿔`} 보세요.`;
    }
  }
}
