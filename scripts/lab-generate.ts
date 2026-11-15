/** Deterministic bee curation; preserve the published rabbit boards. npm run lab:generate */
import { readFileSync, writeFileSync } from 'node:fs';
import { act, DIRS, isWon, neighbor, type Stage } from '../src/lab/model';
import { solve } from '../src/lab/solver';

import { beeQuality } from './bee-quality';
import { beeIntro } from '../src/lab/beeIntros';

// Independent of other worlds and their generation order.
let seed = 3721119816;
function random() { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; }
const int = (n: number) => Math.floor(random() * n);
const pick = <T>(xs: T[]) => xs[int(xs.length)];
const range = (n: number) => Array.from({ length: n }, (_, i) => i);
function base(cols: number, rows = cols): Stage { return { id: '', kind: 'bee', number: 0, title: '', cols, rows, start: [], goal: [], solution: [], par: 0 }; }
const names = [
  ['첫 초대장', '꽃 옆의 꽃', '돌아가는 인사', '짧은 꽃길', '모든 꽃에 안녕', '벌집은 마지막', '두 갈림길', '모퉁이 꽃', '꿀벌의 약속', '첫 꽃잔치'],
  ['넓어진 꽃밭', '길을 남겨요', '먼 꽃 가까운 꽃', '갈림길의 편지', '모퉁이를 먼저', '돌아올 수 없는 길', '꽃밭을 한 바퀴', '한 번씩의 약속', '마지막 꽃의 자리', '열 장의 초대장'],
  ['큰 꽃밭 여행', '멀리 보는 보리', '벌집으로 가는 지도', '꽃 사이의 지혜', '잊지 않은 친구', '접어 놓은 꽃길', '두 줄의 꽃밭', '모두에게 전해요', '마지막 초대장', '모두 함께 꽃잔치'],
];
function finish(s: Stage, number: number, solution: number[]): Stage {
  s.id = `lab-v1-${s.kind}-${number}`; s.number = number;
  s.title = names[Math.floor((number - 1) / 10)][(number - 1) % 10];
  s.solution = solution; s.par = solution.length;
  let v = s.start;
  if (isWon(s, v)) throw new Error(`${s.id}: starts won`);
  for (const a of solution) { const next = act(s, v, a); if (!next) throw new Error(`${s.id}: invalid action ${a}`); v = next; }
  if (!isWon(s, v)) throw new Error(`${s.id}: not won after solution`);
  return s;
}
const used = new Set<string>();
function unique(s: Stage): boolean {
  const key = JSON.stringify([s.kind, s.cols, s.rows, s.start, s.goal, s.terrain, s.terrain2]);
  if (used.has(key)) return false;
  used.add(key); return true;
}
function makeBee(n: number): Stage {
  if (n <= 3) return beeIntro(n);
  const rows = n <= 20 ? 5 : 6;
  const length = n <= 10 ? 19 + Math.floor((n - 4) / 2) : n <= 20 ? 23 + Math.floor((n - 11) / 4) : 26 + Math.floor((n - 21) / 3);
  const minDecisions = n <= 10 ? 3 + Math.floor((n - 4) / 2) : n <= 20 ? 7 + Math.floor((n - 11) / 4) : 10 + Math.floor((n - 21) / 4);
  const maxRate = n <= 10 ? .20 / (1 + (n - 4) / 2) : n <= 20 ? .015 : .002;
  for (let attempt = 0; attempt < 30_000; attempt++) {
    const s = base(5, rows);
    // Backbite a full rectangular Hamiltonian walk, then trim its ends. Unlike a
    // greedy growth walk, this reliably supplies dense late boards without gaps.
    let path = range(rows).flatMap(y => range(5).map(x => y * 5 + (y % 2 ? 4 - x : x)));
    for (let k = 0; k < 120; k++) {
      if (random() < .5) path.reverse();
      const at = path.at(-1)!;
      const options = DIRS.map((_, d) => neighbor(s, at, d)).filter(i => i >= 0 && i !== path.at(-2));
      const join = path.indexOf(pick(options));
      path = [...path.slice(0, join + 1), ...path.slice(join + 1).reverse()];
    }
    const offset = int(path.length - length + 1);
    path = path.slice(offset, offset + length);
    s.terrain = range(5 * rows).map(i => +path.includes(i)); s.start = [path[0]]; s.goal = [path.at(-1)!];
    finish(s, n, path.slice(1));
    const preliminary = beeQuality(s, 0);
    if (preliminary.unknown || preliminary.decisions < minDecisions || preliminary.decisions > minDecisions + (n <= 20 ? 1 : 2)) continue;
    const quality = beeQuality(s);
    if (quality.unknown || quality.decisions < minDecisions || quality.randomRate > maxRate || !unique(s)) continue;
    console.log(`${s.id}: par ${s.par}, decisions ${quality.decisions}, random ${quality.wins}/${quality.trials} (attempt ${attempt})`);
    return s;
  }
  throw new Error(`bee ${n}: no candidate`);
}
const destination = 'src/lab/stages.generated.json';
const stages: Stage[] = (JSON.parse(readFileSync(destination, 'utf8')) as Stage[]).filter(s => s.kind === 'twins');
if (stages.length !== 30) throw Error('Expected the 30 published rabbit boards to preserve');
for (let n = 1; n <= 30; n++) stages.push(makeBee(n));
for (const stage of stages) {
  const result = solve(stage, stage.start);
  if (!result.path || result.exhausted) throw Error(`${stage.id}: validation failed`);
}
writeFileSync(destination, JSON.stringify(stages, null, 2) + '\n');
console.log('Regenerated 30 bee stages; preserved 30 rabbit stages. Run npm test before publishing.');
