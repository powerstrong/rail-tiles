/** npx vite-node src/lab/bee50/generate.ts. Only writes the NEW 31–50 boards. */
import { writeFileSync } from 'node:fs';
import { act, DIRS, isWon, neighbor, type Stage } from '../model';
import { BeeSearch } from '../beeSearch';
import { arrowQuality } from './quality';
import { beeQuality } from '../../../scripts/bee-quality';

// Independent xorshift32: no dependency on the old 1–30 generator or its seed.
let seed = 0xbee50031;
const random = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; };
const int = (n: number) => Math.floor(random() * n);
const range = (n: number) => Array.from({ length: n }, (_, i) => i);
const names = ['꽃밭 사이 작은 길', '건너기 전 인사', '여섯 줄 꽃밭', '위쪽부터 아래쪽으로', '한 칸 다리', '가까워도 나중에', '두 꽃밭의 약속', '길 건너 친구들', '건너갈 때를 골라요', '큰 꽃밭 잔치',
  '화살표를 따라 톡톡', '들어오는 쪽은 자유', '나갈 꽃을 남겨요', '꺾어 가는 초대장', '두 화살표의 약속', '돌아올 길을 먼저', '꽃밭 건너 화살표', '이쪽으로 나가요', '벌집 앞의 화살표', '보리의 쉰 번째 초대장'];
function rectangle(cols: number, rows: number): number[] {
  const shape = { cols, rows };
  let path = range(rows).flatMap(y => range(cols).map(x => y * cols + (y % 2 ? cols - 1 - x : x)));
  for (let k = 0; k < 90; k++) {
    if (random() < .5) path.reverse();
    const at = path.at(-1)!;
    const options = DIRS.map((_, d) => neighbor(shape, at, d)).filter(n => n >= 0 && n !== path.at(-2));
    if (!options.length) continue;
    const join = path.indexOf(options[int(options.length)]);
    path = [...path.slice(0, join + 1), ...path.slice(join + 1).reverse()];
  }
  return path;
}
function divided(cols: number, rows: number, transpose: boolean): number[] | null {
  const width = transpose ? rows : cols, height = transpose ? cols : rows;
  const leftWidth = width - 3, rightWidth = 2;
  const left = rectangle(leftWidth, height);
  if (left.at(-1)! % leftWidth !== leftWidth - 1) return null;
  const bridgeY = Math.floor(left.at(-1)! / leftWidth);
  let right: number[] | null = null;
  for (let i = 0; i < 100; i++) {
    const candidate = rectangle(rightWidth, height);
    if (candidate[0] === bridgeY * rightWidth) { right = candidate; break; }
  }
  if (!right) return null;
  const path = [...left.map(n => Math.floor(n / leftWidth) * width + n % leftWidth), bridgeY * width + leftWidth,
    ...right.map(n => Math.floor(n / rightWidth) * width + n % rightWidth + leftWidth + 1)];
  // A horizontal waist alternates with a vertical waist. Same one-cell connector judgment.
  return transpose ? path.map(n => (n % width) * cols + Math.floor(n / width)) : path;
}
function make(number: number): Stage {
  const cols = number <= 32 || number === 41 || number === 42 ? 5 : 6, rows = 6;
  for (let attempt = 0; attempt < 10_000; attempt++) {
    let path: number[] | null;
    if (number <= 40 || number >= 47) path = divided(cols, rows, number % 2 === 0);
    else if (number === 41) path = [0, 1, 6, 5, 10, 15, 20, 21, 22, 23, 24, 19, 14, 9, 4, 3, 8, 13, 18];
    else {
      path = rectangle(cols, rows);
      const trim = number <= 44 ? 4 : 2;
      const offset = int(trim + 1);
      path = path.slice(offset, path.length - (trim - offset));
    }
    if (!path) continue;
    const stage: Stage = { id: `lab-v1-bee-${number}`, kind: 'bee', number, title: names[number - 31], cols, rows,
      start: [path[0]], goal: [path.at(-1)!], terrain: range(cols * rows).map(n => +path.includes(n)), solution: path.slice(1), par: path.length - 1 };
    if (number >= 41) {
      stage.arrows = {};
      const count = number === 41 ? 2 : number <= 44 ? 1 : number <= 47 ? 2 : 3;
      const candidates = range(path.length - 1).filter(i => {
        const at = path![i];
        return DIRS.filter((_, d) => { const n = neighbor(stage, at, d); return n >= 0 && stage.terrain![n] && n !== path![i - 1]; }).length > 1;
      });
      // 41 demonstrates right then down with the very first two taps; later arrows
      // have competing forward exits so their rule actually changes a choice.
      const indices = number === 41 ? [0, 1] : [];
      while (indices.length < count && candidates.length) indices.push(candidates.splice(int(candidates.length), 1)[0]);
      if (indices.length < count) continue;
      for (const i of indices) stage.arrows[path[i]] = DIRS.findIndex((_, d) => neighbor(stage, path![i], d) === path![i + 1]);
    }
    let state = stage.start;
    for (const a of stage.solution) { const next = act(stage, state, a); if (!next) throw Error(`${stage.id}: illegal answer`); state = next; }
    if (!isWon(stage, state)) throw Error(`${stage.id}: unfinished answer`);
    const search = new BeeSearch(stage), entry = search.query(stage.start, 6_000, Infinity);
    if (entry.answer !== 'possible' || search.visited > 350) continue;
    const quality = beeQuality(stage, 0);
    const min = number === 31 || number === 32 ? 4 : number === 41 ? 0 : number <= 44 ? 6 : 8;
    if (quality.unknown || quality.decisions < min || quality.decisions > (number === 41 ? 5 : 14)) continue;
    // Every legal deviation along the answer must be proved under the UI work budget.
    let known = true;
    state = stage.start;
    for (const a of stage.solution) {
      for (const n of search.exits[state.at(-1)!]) {
        const next = act(stage, state, n);
        if (next && next.length > state.length && search.query(next, 6_000, Infinity).answer === 'unknown') known = false;
      }
      state = act(stage, state, a)!;
    }
    if (!known || (number >= 42 && arrowQuality(stage).preserveExitDecisions < 1)) continue;
    console.log(`${number}: ${cols}×${rows}, par=${stage.par}, decisions=${quality.decisions}, arrows=${Object.keys(stage.arrows ?? {}).length}, attempt=${attempt}`);
    return stage;
  }
  throw Error(`No candidate for ${number}`);
}
const stages = range(20).map(i => make(i + 31));
const signatures = stages.map(s => JSON.stringify([s.cols, s.rows, s.start, s.goal, s.terrain, s.arrows]));
if (new Set(signatures).size !== stages.length) throw Error('Duplicate board');
writeFileSync(new URL('./stages.generated.json', import.meta.url), JSON.stringify(stages, null, 2) + '\n');
