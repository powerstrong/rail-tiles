import type { Stage } from './model';
/** Three hand-curated walks teach adjacency, turning, and returning along the edge. */
export function beeIntro(number: number): Stage {
  const path = [[0, 1, 2, 5, 8], [6, 3, 0, 1, 2, 5], [0, 3, 6, 7, 8, 5, 2]][number - 1];
  return {
    id: `lab-v1-bee-${number}`, kind: 'bee', number,
    title: ['첫 초대장', '꽃 옆의 꽃', '돌아가는 인사'][number - 1],
    cols: 3, rows: 3, start: [path[0]], goal: [path.at(-1)!],
    terrain: Array.from({ length: 9 }, (_, i) => +path.includes(i)),
    solution: path.slice(1), par: path.length - 1,
  };
}
