export interface FlowPair { ends: [number, number]; via: number[] }
export interface FlowStage {
  id: string;
  number: number;
  title: string;
  label: string;
  cols: number;
  rows: number;
  cells: number[];
  fill: boolean;
  pairs: FlowPair[];
  solution: number[][];
  par: number;
}
export type Threads = number[][];
export const THREADS = [
  { name: '산호 동그라미', color: '#bc4b3c', mark: '●' },
  { name: '바다 세모', color: '#246f9c', mark: '▲' },
  { name: '포도 마름모', color: '#80539c', mark: '◆' },
  { name: '풀잎 네모', color: '#397849', mark: '■' },
];
export const emptyThreads = (s: FlowStage): Threads => s.pairs.map(() => []);
export const adjacent = (s: Pick<FlowStage, 'cols'>, a: number, b: number) =>
  Math.abs(a % s.cols - b % s.cols) + Math.abs(Math.floor(a / s.cols) - Math.floor(b / s.cols)) === 1;
export function neighbors(s: Pick<FlowStage, 'cols' | 'rows' | 'cells'>, cell: number): number[] {
  return [cell - s.cols, cell + 1, cell + s.cols, cell - 1].filter(n => n >= 0 && n < s.cols * s.rows && s.cells.includes(n) && adjacent(s, cell, n));
}
export const endpointAt = (s: FlowStage, cell: number) => s.pairs.findIndex(p => p.ends.includes(cell));
export const buttonAt = (s: FlowStage, cell: number) => s.pairs.findIndex(p => p.via.includes(cell));
export const ownerAt = (paths: Threads, cell: number) => paths.findIndex(p => p.includes(cell));
export function connected(s: FlowStage, paths: Threads, color: number): boolean {
  const p = paths[color], pair = s.pairs[color];
  return p.length >= 2 && pair.ends.includes(p[0]) && pair.ends.includes(p.at(-1)!) && p[0] !== p.at(-1) && pair.via.every(c => p.includes(c));
}
export function feedback(s: FlowStage, paths: Threads) {
  const joined = paths.filter((_, i) => connected(s, paths, i)).length;
  // Endpoint buttons already occupy their own squares, even before a thread starts.
  const occupied = new Set([...s.pairs.flatMap(p => p.ends), ...paths.flat()]);
  return { joined, loose: s.pairs.length - joined, remaining: s.cells.filter(c => !occupied.has(c)).length };
}
export const isComplete = (s: FlowStage, paths: Threads) => {
  const f = feedback(s, paths);
  return f.loose === 0 && (!s.fill || f.remaining === 0);
};

/** Starting on an existing thread keeps the part before that square; endpoints start afresh. */
export function beginThread(s: FlowStage, paths: Threads, cell: number): { paths: Threads; color: number } | null {
  if (!s.cells.includes(cell)) return null;
  const end = endpointAt(s, cell), color = end >= 0 ? end : ownerAt(paths, cell);
  if (color < 0) return null;
  const next = paths.map(p => [...p]);
  next[color] = end >= 0 ? [cell] : next[color].slice(0, next[color].indexOf(cell) + 1);
  return { paths: next, color };
}

/** One adjacent move. Other threads are cut immediately before the shared square. */
export function extendThread(s: FlowStage, paths: Threads, color: number, cell: number): Threads {
  const path = paths[color];
  if (!path?.length || !s.cells.includes(cell) || !adjacent(s, path.at(-1)!, cell)) return paths;
  const end = endpointAt(s, cell), button = buttonAt(s, cell);
  if ((end >= 0 && end !== color) || (button >= 0 && button !== color)) return paths;
  const at = path.indexOf(cell), next = paths.map(p => [...p]);
  if (at >= 0) { next[color] = path.slice(0, at + 1); return next; }
  // A finished line can be edited from any of its squares, but cannot grow past its endpoint.
  if (s.pairs[color].ends.includes(path.at(-1)!) && path.length > 1) return paths;
  const other = ownerAt(paths, cell);
  if (other >= 0) next[other] = next[other].slice(0, next[other].indexOf(cell));
  next[color].push(cell);
  return next;
}

export const threadLength = (paths: Threads) => paths.reduce((sum, p) => sum + Math.max(0, p.length - 1), 0);
export const sameThreads = (a: Threads, b: Threads) => JSON.stringify(a) === JSON.stringify(b);

export interface FlowPlay {
  paths: Threads;
  history: Threads[];
  active: number | null;
  before: Threads | null;
  hinted: boolean;
  note: string;
}
export type FlowAction = { type: 'begin' | 'extend'; cell: number } | { type: 'end' | 'cancel' | 'undo' | 'reset' | 'hint' };
export const initialPlay = (s: FlowStage): FlowPlay => ({ paths: emptyThreads(s), history: [], active: null, before: null, hinted: false, note: '' });
const commit = (g: FlowPlay): FlowPlay => ({ ...g, before: null, history: g.before && !sameThreads(g.before, g.paths) ? [...g.history, g.before] : g.history });
export function reducePlay(s: FlowStage, g: FlowPlay, action: FlowAction): FlowPlay {
  if (action.type === 'reset') return initialPlay(s);
  if (action.type === 'cancel') return { ...g, paths: g.before ?? g.paths, before: null, active: null };
  if (action.type === 'undo') {
    if (g.before && !sameThreads(g.before, g.paths)) return { ...g, paths: g.before, before: null, active: null, note: '이번 실 긋기를 되돌렸어요.' };
    return g.history.length ? { ...g, paths: g.history.at(-1)!, history: g.history.slice(0, -1), active: null, before: null, note: '한 번의 실 긋기를 되돌렸어요.' } : g;
  }
  if (action.type === 'end') return commit(g);
  if (action.type === 'hint') {
    const current = commit(g);
    const color = s.solution.findIndex((p, i) => !sameThreads([p], [g.paths[i]]) && !sameThreads([[...p].reverse()], [g.paths[i]]));
    if (color < 0) return g;
    const route = s.solution[color];
    let paths = beginThread(s, current.paths, route[0])!.paths;
    for (const cell of route.slice(1)) paths = extendThread(s, paths, color, cell);
    return { ...current, paths, active: null, history: [...current.history, current.paths], hinted: true, note: `${THREADS[color].name} 실을 이었어요. 겹쳤던 실은 다시 이어 주세요. 힌트 사용: 최대 ★★` };
  }
  if (action.type === 'begin') {
    const current = commit(g);
    // Tapping the other matching endpoint continues a selected line, just like dragging into it.
    if (current.active !== null && endpointAt(s, action.cell) === current.active && current.paths[current.active][0] !== action.cell && adjacent(s, current.paths[current.active].at(-1)!, action.cell)) {
      return reducePlay(s, { ...current, before: current.paths }, { type: 'extend', cell: action.cell });
    }
    const started = beginThread(s, current.paths, action.cell);
    if (!started) {
      if (current.active !== null) return reducePlay(s, { ...current, before: current.paths }, { type: 'extend', cell: action.cell });
      return { ...current, note: '무늬 단추나 그려 둔 실에서 시작해요.' };
    }
    return { ...current, ...started, active: started.color, before: current.paths, note: '' };
  }
  if (action.type !== 'extend' || g.active === null) return g;
  const paths = extendThread(s, g.paths, g.active, action.cell);
  if (paths === g.paths) return g;
  const cut = g.paths.findIndex((p, i) => i !== g.active && paths[i].length < p.length);
  return { ...g, paths, note: cut >= 0 ? `${THREADS[cut].name} 실이 끊겼어요. 그 자리에서 다시 이을 수 있어요.` : g.note };
}
