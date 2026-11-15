/** Shared rules for mirror rabbits and flower paths. */
export const KINDS = ['twins', 'bee'] as const;
export type Kind = typeof KINDS[number];
export type State = number[];
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
export function isWon(s: Stage, v: State): boolean {
  switch (s.kind) {
    case 'twins': return same(v, s.goal);
    case 'bee': return v.length === s.terrain!.filter(Boolean).length && v.at(-1) === s.goal[0];

  }
}
/** All actions are small integers, so they can cross a Worker boundary and be replayed in tests. */
export function act(s: Stage, v: State, action: number): State | null {
  if (!Number.isInteger(action) || action < 0) return null;
  const out = [...v];
  switch (s.kind) {
    case 'twins': {
      if (action > 3) return null;
      for (let i = 0; i < 2; i++) {
        const d = i === 1 && action % 2 === 1 ? (action + 2) % 4 : action;
        const dest = neighbor(s, v[i], d);
        if (dest >= 0 && (i === 0 ? s.terrain! : s.terrain2!)[dest]) out[i] = dest;
      }
      return same(out, v) ? null : out;
    }
    case 'bee': {
      if (action >= s.cols * s.rows || !s.terrain![action] || v.includes(action)) return null;
      if (!DIRS.some((_, d) => neighbor(s, v.at(-1)!, d) === action)) return null;
      if (action === s.goal[0] && v.length + 1 !== s.terrain!.filter(Boolean).length) return null;
      return [...v, action];
    }

  }
}
export function actions(s: Stage, v: State): number[] {
  switch (s.kind) {
    case 'twins': return [0, 1, 2, 3];
    case 'bee': return DIRS.map((_, d) => neighbor(s, v.at(-1)!, d)).filter(n => n >= 0);
  }
}
export const keyOf = (v: State) => v.join(',');
export const moveWord = (a: number) => ['↑ 위', '→ 오른쪽', '↓ 아래', '← 왼쪽'][a];
export const location = (s: Stage, cell: number) => `${Math.floor(cell / s.cols) + 1}행 ${cell % s.cols + 1}열`;
export function describeAction(s: Stage, _v: State, a: number): string {
  switch (s.kind) {
    case 'twins': return `${moveWord(a)} 버튼으로 두 토끼를 함께 움직여 보세요.`;
    case 'bee': return `${location(s, a)} 꽃으로 날아가 보세요.`;

  }
}
