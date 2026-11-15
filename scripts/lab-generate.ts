/** Deterministic, offline curation for the laboratory. Run: npx vite-node scripts/lab-generate.ts */
import { writeFileSync } from 'node:fs';
import { act,  DIRS, isWon, keyOf, KINDS, neighbor, type Kind, type Stage, type State } from '../src/lab/model';
import { solve } from '../src/lab/solver';

import { beeIntro } from '../src/lab/beeIntros';

let seed = 0x51ab2026;
function random() { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; }
const int = (n: number) => Math.floor(random() * n);
const pick = <T>(xs: T[]) => xs[int(xs.length)];
const range = (n: number) => Array.from({ length: n }, (_, i) => i);
function base(kind: Kind, cols: number, rows = cols): Stage { return { id: '', kind, number: 0, title: '', cols, rows, start: [], goal: [], solution: [], par: 0 }; }
const names: Record<Kind, [string[], string[], string[]]> = {
  twins: [['함께 위로', '반대쪽 인사', '벽과 악수', '한 토끼가 쉬어요', '나란한 출발', '짧은 우회', '거울의 모퉁이', '잠깐 기다려요', '두 집의 불빛', '첫 달빛 차'], ['엇갈린 산책', '다른 길 같은 마음', '기다림의 벽', '한 걸음 뒤로', '집 앞의 갈림길', '숲의 왼쪽 오른쪽', '라라가 먼저', '루루의 차례', '약속 장소', '거울 숲 친구'], ['멀리 있는 두 집', '잠시 집을 떠나요', '돌아가는 인사', '벽을 이용해요', '두 갈림길', '마주 보는 숲', '함께 도착하려면', '달빛 산책로', '마지막 약속', '둘이 마시는 차']],
  bee: [['첫 초대장', '꽃 옆의 꽃', '돌아가는 인사', '짧은 꽃길', '모든 꽃에 안녕', '벌집은 마지막', '두 갈림길', '모퉁이 꽃', '꿀벌의 약속', '첫 꽃잔치'], ['넓어진 꽃밭', '길을 남겨요', '먼 꽃 가까운 꽃', '갈림길의 편지', '모퉁이를 먼저', '돌아올 수 없는 길', '꽃밭을 한 바퀴', '한 번씩의 약속', '마지막 꽃의 자리', '열 장의 초대장'], ['큰 꽃밭 여행', '멀리 보는 보리', '벌집으로 가는 지도', '꽃 사이의 지혜', '잊지 않은 친구', '접어 놓은 꽃길', '두 줄의 꽃밭', '모두에게 전해요', '마지막 초대장', '모두 함께 꽃잔치']],
};
function finish(s: Stage, number: number, solution: number[]): Stage {
  s.id = `lab-v1-${s.kind}-${number}`; s.number = number;
  s.title = names[s.kind][Math.floor((number - 1) / 10)][(number - 1) % 10];
  s.solution = solution; s.par = solution.length;
  let v = s.start;
  if (isWon(s, v)) throw new Error(`${s.id}: starts won`);
  for (const a of solution) { const next = act(s, v, a); if (!next) throw new Error(`${s.id}: invalid action ${a}`); v = next; }
  if (!isWon(s, v)) throw new Error(`${s.id}: not won after solution`);
  return s;
}
const used = new Set<string>();
function unique(s: Stage): boolean {
  const key = JSON.stringify([s.kind, s.start, s.goal, s.terrain, s.terrain2]);
  if (used.has(key)) return false;
  used.add(key); return true;
}
function floorConnected(s: Stage, terrain: number[]) {
  const first = terrain.indexOf(1); if (first < 0) return false;
  const seen = new Set([first]);
  for (const at of seen) for (let d = 0; d < 4; d++) { const n = neighbor(s, at, d); if (n >= 0 && terrain[n]) seen.add(n); }
  return seen.size === terrain.filter(Boolean).length;
}
function makeTwins(n:number):Stage {
  if(n===1) { const s=base('twins',3,3); s.terrain=Array(9).fill(1); s.terrain2=Array(9).fill(1); s.start=[7,7]; s.goal=[4,4]; return finish(s,n,[0]); }
  const size=n<=10?3:n<=20?4:5, target=n<=10?2+Math.floor(n/2):n<=20?6+Math.floor((n-11)/2):10+Math.floor((n-21)/2);
  for(let attempt=0;attempt<2000;attempt++) {
    const s=base('twins',size);
    s.terrain=range(size*size).map(()=>random()<(n<6?.12:.24)?0:1);
    s.terrain2=range(size*size).map(()=>random()<(n<6?.12:.24)?0:1);
    if(!floorConnected(s,s.terrain)||!floorConnected(s,s.terrain2)) continue;
    s.start=[pick(range(size*size).filter(i=>s.terrain![i])),pick(range(size*size).filter(i=>s.terrain2![i]))];
    const nodes:{v:State,path:number[]}[]=[{v:s.start,path:[]}], seen=new Set([keyOf(s.start)]);
    const choices:typeof nodes=[];
    for(let head=0;head<nodes.length;head++) {
      const node=nodes[head];
      if(node.path.length>=target&&node.path.length<=target+2&&node.v[0]!==s.start[0]&&node.v[1]!==s.start[1]) choices.push(node);
      for(const d of [0,1,2,3]) { const v=act(s,node.v,d); if(v&&!seen.has(keyOf(v))) { seen.add(keyOf(v)); nodes.push({v,path:[...node.path,d]}); } }
    }
    if(!choices.length) continue;
    const answer=pick(choices); s.goal=answer.v;
    if(!unique(s)) continue;
    return finish(s,n,answer.path);
  }
  throw new Error(`twins ${n}: no candidate`);
}
function makeBee(n:number):Stage {
  if (n <= 3) return beeIntro(n);
  const size=n<=5?3:n<=20?4:5;
  const length=n<=5?4+n:n<=10?7+Math.floor(n/2):n<=20?11+Math.floor((n-11)/2):16+Math.floor((n-21)/2);
  for(let attempt=0;attempt<5000;attempt++) {
    const s=base('bee',size), path=[int(size*size)];
    for(let k=1;k<length;k++) {
      const options=DIRS.map((_,d)=>neighbor(s,path.at(-1)!,d)).filter(i=>i>=0&&!path.includes(i));
      if(!options.length) break; path.push(pick(options));
    }
    if(path.length!==length) continue;
    s.terrain=range(size*size).map(i=>path.includes(i)?1:0);s.start=[path[0]];s.goal=[path.at(-1)!];
    // Avoid long one-cell corridors posing as late puzzles: count genuine branch points.
    const branches=path.filter(at=>DIRS.filter((_,d)=>{const j=neighbor(s,at,d);return j>=0&&s.terrain![j];}).length>=3).length;
    if(n>5&&branches<(n<=10?2:n<=20?4:7)) continue;
    const found=solve(s,s.start,100_000);
    if(!found.path||!unique(s)) continue;
    return finish(s,n,found.path);
  }
  throw new Error(`bee ${n}: no candidate`);
}
const makers: Record<Kind, (n: number) => Stage> = { twins: makeTwins, bee: makeBee };
const stages: Stage[] = [];
for (const kind of KINDS) for (let n = 1; n <= 30; n++) {
  const stage = makers[kind](n);
  const result = solve(stage, stage.start);
  if (!result.path || result.exhausted) throw Error(`${stage.id}: validation failed`);
  stages.push(stage);
}
writeFileSync('src/lab/stages.generated.json', JSON.stringify(stages, null, 2) + '\n');
console.log(`Generated ${stages.length} stages. Run npm test to verify before publishing.`);
