import { writeFileSync } from 'node:fs';
import { auditStage } from '../src/flow/solver';
import { adjacent, type FlowStage } from '../src/flow/model';

// No wall-clock decisions: the seed and deterministic acceptance rules reproduce the JSON byte for byte.
export const FLOW_SEED = 0x6f10cafe;
let seed = FLOW_SEED;
const random = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; };
const int = (n: number) => Math.floor(random() * n);
const titles = ['첫 바늘땀', '모퉁이를 돌아', '두 가지 실', '꽃잎 조각', '마주 보는 단추', '양보하는 실', '작은 골목', '안쪽과 바깥쪽', '함께 꿰매요', '마을의 손수건', '빈칸도 포근하게', '가장자리 먼저', '돌아서 만나요', '가운데 자리', '작은 천의 비밀', '긴 실의 양보', '테두리 산책', '나란한 물결', '빈칸 하나까지', '커다란 담요', '무늬 고리를 지나', '고리가 부르는 길', '안쪽 단추', '두 고리의 약속', '길을 나눠 쓰기', '가운데로 돌아', '세 가지 이정표', '먼 길의 단추', '모두의 자리', '마을 잔치 깃발'];
function make(number: number, cols: number, rows: number, solution: number[][], cells = Array.from({ length: cols * rows }, (_, i) => i), via: number[][] = []): FlowStage {
  return { id: `flow-${number}`, number, title: titles[number - 1], label: `STAGE ${Math.ceil(number / 10)}-${(number - 1) % 10 + 1}`, cols, rows, cells: [...cells].sort((a, b) => a - b), fill: number > 10, pairs: solution.map((p, i) => ({ ends: [p[0], p.at(-1)!], via: via[i] ?? [] })), solution, par: solution.reduce((n, p) => n + p.length - 1, 0) };
}
function hamiltonian(cols: number, rows: number) {
  let p = Array.from({ length: rows }, (_, y) => Array.from({ length: cols }, (_, x) => y * cols + (y % 2 ? cols - 1 - x : x))).flat();
  for (let k = 0; k < 150; k++) {
    if (int(2)) p.reverse();
    const choices = p.flatMap((c, i) => i > 1 && adjacent({ cols }, p[0], c) ? [i] : []);
    if (choices.length) { const at = choices[int(choices.length)]; p = [...p.slice(0, at).reverse(), ...p.slice(at)]; }
  }
  return p;
}
function signature(s: FlowStage) {
  const variants: string[] = [];
  for (let r = 0; r < 4; r++) for (let mirror = 0; mirror < 2; mirror++) {
    const transform = (cell: number) => {
      let x = cell % s.cols, y = Math.floor(cell / s.cols);
      if (mirror) x = s.cols - 1 - x;
      for (let i = 0; i < r; i++) [x, y] = [s.cols - 1 - y, x];
      return y * s.cols + x;
    };
    variants.push(JSON.stringify([s.fill, s.cells.map(transform).sort((a,b) => a-b), s.pairs.map(p => [p.ends.map(transform).sort((a,b) => a-b), p.via.map(transform).sort((a,b) => a-b)]).sort((a,b) => JSON.stringify(a) < JSON.stringify(b) ? -1 : JSON.stringify(a) > JSON.stringify(b) ? 1 : 0)]));
  }
  return variants.sort()[0];
}
const stages: FlowStage[] = [make(1, 3, 3, [[3, 4, 5]], [1,3,4,5]), make(2, 3, 3, [[0,3,6,7]], [0,3,6,7,8]), make(3, 3, 3, [[0,1,2],[8,7,6]], [0,1,2,3,6,7,8])];
const seen = new Set(stages.map(signature));
for (let number = 4; number <= 30; number++) {
  let accepted = false;
  for (let attempt = 0; attempt < 30000; attempt++) {
    const size = number <= 13 || number === 21 ? 4 : 5;
    const pairCount = number <= 10 ? 3 : number <= 13 ? 3 : number <= 20 ? 4 : 3 + Number(number >= 24);
    const p = hamiltonian(size, size);
    const lengths = Array(pairCount).fill(3) as number[];
    for (let left = p.length - pairCount * 3; left > 0; left--) lengths[int(pairCount)]++;
    const solution: number[][] = [];
    let at = 0;
    for (const length of lengths) {
      const route = p.slice(at, at + length); at += length;
      // First chapter has visible cloth patches that cannot take a thread; filling is not required.
      if (number <= 10 && route.length > 3 && int(3) !== 0) route.splice(int(2) ? 0 : route.length - 1, 1);
      solution.push(route);
    }
    const via = solution.map(() => [] as number[]);
    if (number >= 21) {
      const count = number <= 23 ? 1 : number <= 26 ? 2 : 3;
      const eligible = solution.flatMap((p, i) => p.length >= 4 ? [i] : []);
      for (let k = 0; k < Math.min(count, eligible.length); k++) {
        const i = eligible[k]; via[i] = [solution[i][1 + int(solution[i].length - 2)]];
      }
      if (via.flat().length !== count) continue;
    }
    const unused = p.filter(c => !solution.flat().includes(c));
    const cells = number <= 10 ? [...solution.flat(), ...unused.slice(0, 1)] : undefined;
    const s = make(number, size, size, solution, cells, via);
    const key = signature(s);
    if (seen.has(key)) continue;
    const audit = auditStage(s);
    if (audit.solutions !== 1 || !audit.logicSolved) continue;
    if (number <= 10 && audit.candidates.filter(n => n > 1).length < 1) continue;
    if (number > 13 && audit.candidates.reduce((a,b) => a+b, 0) < 12) continue;
    if ([20, 30].includes(number) && (audit.rounds < 2 || audit.candidates.reduce((a,b) => a+b, 0) < 40)) continue;
    // The ring must change reasoning: the third chapter's plain board admits multiple solutions.
    if (number >= 21 && auditStage({ ...s, pairs: s.pairs.map(p => ({ ...p, via: [] })) }).solutions < 2) continue;
    seen.add(key); stages.push(s); accepted = true;
    console.log(number, `attempt ${attempt + 1}`, audit);
    break;
  }
  if (!accepted) throw new Error(`No stage ${number}`);
}
writeFileSync(new URL('../src/flow/stages.generated.json', import.meta.url), JSON.stringify(stages, null, 2) + '\n');
console.log(`Generated ${stages.length} stages with seed ${FLOW_SEED}`);
