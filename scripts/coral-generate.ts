import { writeFileSync } from 'node:fs';
import { Reef, count, neighbors, solve, type CoralStage } from '../src/coral/model';

// Separate per-stage seeds keep regeneration independent of the other restored worlds.
export const SEED = 0xc0a12026;
const titles = ['첫 물결', '두 번의 인사', '옆으로 쭉', '큰 무리 찾기', '모퉁이 너머', '다음 이웃', '다시 만난 색', '이어지는 물결', '한 번 덜 고르기', '무지개 만',
  '가운데서 안녕', '네 방향 친구', '양쪽을 한꺼번에', '작은 다리', '밖으로 퍼져요', '마주 보는 무리', '돌아오는 색', '먼 쪽 이웃', '갈래를 이어요', '빛나는 소용돌이',
  '바위 옆으로', '좁은 물길', '돌아서 만나요', '두 물길 합치기', '바위 뒤 친구', '작은 입구', '이어지는 골목', '먼저 여는 길', '온 바다의 색', '무지개 산호 정원'];
const pars = [1, 2, 3, 3, 4, 4, 4, 5, 5, 6, 3, 4, 5, 5, 5, 6, 6, 6, 7, 7, 4, 5, 5, 6, 6, 6, 7, 7, 8, 8];

function generate(number: number): CoralStage {
  let seed = (SEED + number * 7919) >>> 0;
  const random = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; };
  const cols = number <= 3 ? 3 : number <= 10 ? 4 : 5, rows = cols;
  const origin = number <= 10 ? 0 : 12;
  const colors = number <= 2 ? number + 1 : number <= 10 ? 3 : number <= 26 ? 4 : 5;
  for (let attempt = 0; attempt < 15_000; attempt++) {
    const start = Array.from({ length: cols * rows }, () => Math.floor(random() * colors));
    if (number === 1) start.splice(0, 9, 0, 0, 1, 0, 1, 1, 1, 1, 1);
    if (number > 20) {
      // Rocks make detours, never separated islands. Center remains the source.
      const rocks = number === 21 ? [7, 17] : Array.from({ length: 3 + number % 3 }, () => Math.floor(random() * 25));
      for (const i of rocks) if (i !== origin) start[i] = -1;
      const seen = new Set([origin]);
      for (const i of seen) for (const n of neighbors({ cols, rows }, i)) if (start[n] >= 0) seen.add(n);
      if (seen.size !== start.filter(c => c >= 0).length) continue;
    }
    const stage: CoralStage = { id: `lab-v1-coral-${number}`, number, title: titles[number - 1], label: `STAGE ${Math.ceil(number / 10)}-${(number - 1) % 10 + 1}`, cols, rows, start, origin, par: pars[number - 1], solution: [] };
    const reef = new Reef(stage), initial = reef.initial(), solution = solve(reef);
    if (!solution || solution.length !== stage.par) continue;
    if (number >= 4) {
      const choices = reef.palette.filter(c => count(reef.expand(initial.mask, c)) > count(initial.mask));
      if (choices.length < 2) continue;
      const lengths = choices.map(c => solve(reef, reef.move(initial, c)!)!.length + 1);
      // A visible efficiency choice on every non-intro board; never blocks completion.
      if (Math.max(...lengths) === Math.min(...lengths)) continue;
    }
    stage.solution = solution;
    return stage;
  }
  throw new Error(`No candidate for ${number}`);
}
const stages = Array.from({ length: 30 }, (_, i) => generate(i + 1));
writeFileSync('src/coral/stages.generated.json', JSON.stringify(stages, null, 2) + '\n');
console.log(stages.map(s => `${s.number}: ${s.cols}×${s.rows}, par ${s.par}, rocks ${s.start.filter(c => c < 0).length}`).join('\n'));
