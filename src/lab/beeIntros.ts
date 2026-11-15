import type { Stage } from './model';
/** Full-size guided walks: the gaps teach turning before any irreversible branch. */
export function beeIntro(number: number): Stage {
  const walk = [0, 1, 2, 3, 4, 9, 14, 13, 12, 11, 10, 15, 20, 21, 22, 23, 24];
  const path = number === 1 ? walk : number === 2
    ? walk.map(at => (at % 5) * 5 + 4 - Math.floor(at / 5)) : [...walk].reverse();
  return {
    id: `lab-v1-bee-${number}`, kind: 'bee', number,
    title: ['첫 초대장', '꽃 옆의 꽃', '돌아가는 인사'][number - 1],
    cols: 5, rows: 5, start: [path[0]], goal: [path.at(-1)!],
    terrain: Array.from({ length: 25 }, (_, i) => +path.includes(i)),
    solution: path.slice(1), par: path.length - 1,
  };
}
