/** Deterministic, offline curation for the laboratory. Run: npx vite-node scripts/lab-generate.ts */
import { writeFileSync, mkdirSync } from 'node:fs';
import { act, actions, connected, crossing, degrees, DIRS, isWon, keyOf, KINDS, neighbor, same, type Kind, type Stage, type State } from '../src/lab/model';
import { breadthFirst, bridgeSolutions, cloudSolutions, runs, solve, solveLights, solveMosaic } from '../src/lab/solver';

let seed = 0x51ab2026;
function random() { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; }
const int = (n: number) => Math.floor(random() * n);
const pick = <T>(xs: T[]) => xs[int(xs.length)];
function shuffled<T>(xs: T[]): T[] { const out = [...xs]; for (let i = out.length - 1; i > 0; i--) { const j = int(i + 1); [out[i], out[j]] = [out[j], out[i]]; } return out; }
const range = (n: number) => Array.from({ length: n }, (_, i) => i);
function base(kind: Kind, cols: number, rows = cols): Stage { return { id: '', kind, number: 0, title: '', cols, rows, start: [], goal: [], solution: [], par: 0 }; }
const names: Record<Kind, [string[], string[], string[]]> = {
  acorn: [['첫 도토리', '새싹 옆에서', '돌아가는 길', '모퉁이 인사', '두 개의 씨앗', '길을 비켜요', '작은 흙밭', '한 칸의 여유', '먼저 옮길 씨앗', '첫 정원 완성'], ['좁은 산책로', '마주 본 새싹', '돌담 사이', '함께 심어요', '돌아올 자리', '가운데 길', '빈자리를 지켜요', '두 번의 양보', '숨은 순서', '숲속 정원사'], ['세 친구의 정원', '길목을 열어요', '멀리 보는 모모', '도토리 약속', '차례를 바꿔요', '돌아서 만나요', '작은 숲의 설계', '마지막 빈자리', '겨울잠의 선물', '우리 숲의 탄생']],
  twins: [['함께 위로', '반대쪽 인사', '벽과 악수', '한 토끼가 쉬어요', '나란한 출발', '짧은 우회', '거울의 모퉁이', '잠깐 기다려요', '두 집의 불빛', '첫 달빛 차'], ['엇갈린 산책', '다른 길 같은 마음', '기다림의 벽', '한 걸음 뒤로', '집 앞의 갈림길', '숲의 왼쪽 오른쪽', '라라가 먼저', '루루의 차례', '약속 장소', '거울 숲 친구'], ['멀리 있는 두 집', '잠시 집을 떠나요', '돌아가는 인사', '벽을 이용해요', '두 갈림길', '마주 보는 숲', '함께 도착하려면', '달빛 산책로', '마지막 약속', '둘이 마시는 차']],
  lights: [['작은 인사', '가운데 인사', '모서리 친구', '이웃의 손짓', '마주 보는 등', '별 모양 인사', '반짝의 순서', '가운데와 가장자리', '잠든 세 친구', '첫 축제의 밤'], ['넓어진 숲', '네모 광장', '빛의 발자국', '이웃의 이웃', '서로 돕는 등', '작은 빛의 지도', '안쪽에서 바깥쪽', '두 모퉁이', '빛을 나누어요', '숲속 무대'], ['큰 축제 준비', '멀리 전하는 인사', '반짝 모자이크', '빛나는 오솔길', '사방으로 번져요', '축제의 약속', '빛과 그림자', '잠든 숲의 비밀', '마지막 등불', '모두의 반딧불 축제']],
  coral: [['첫 물감 한 방울', '옆 산호와 인사', '세 가지 색', '작은 물결', '멀리 있는 친구', '노랑을 건너서', '모양을 찾아요', '산호 모퉁이', '함께 자라는 색', '작은 바다 정원'], ['물결의 갈림길', '먼저 만날 색', '넓은 산호밭', '묶어서 만나요', '모서리 여행', '새 물감의 날', '깊은 바다 친구', '다음 색의 약속', '돌아오는 물결', '커다란 산호 가족'], ['다섯 색의 바다', '빛나는 물감', '커다란 물결', '색 너머의 친구', '산호숲 지도', '한꺼번에 만나요', '두 물결의 만남', '바다 끝 초대장', '마지막 한 방울', '무지개 바다 완성']],
  cloud: [['첫 바느질', '긴 실 한 가닥', '작은 빈자리', '두 줄의 약속', '구름 조각', '붙이고 띄어요', '나란한 실', '가장자리 무늬', '숫자의 속삭임', '첫 작품 완성'], ['새 도안 상자', '다섯 칸의 실', '줄 사이의 비밀', '차례로 이어요', '작은 바람 무늬', '흰 자리도 단서', '갈라진 실마리', '가로와 세로', '구름의 창문', '공방의 초대장'], ['큰 도안 펼치기', '바람의 자수', '긴 줄 짧은 줄', '빈자리의 약속', '양쪽에서 만나요', '여섯 칸의 무늬', '겹치는 실마리', '조용한 구름', '마지막 바늘땀', '구름의 전시회']],
  balance: [['하나와 둘', '똑같이 나눠요', '작은 별 세 개', '짝을 찾아요', '함께 올리면', '첫 작은 추', '곰의 계산대', '왼쪽 오른쪽', '숫자 친구들', '공평한 첫 선물'], ['다섯 별사탕', '추까지 세어요', '다르게 나누어요', '바꿔 놓기', '둘을 묶어요', '가벼운 별 무거운 별', '새 친구의 몫', '한쪽에서 다른 쪽', '가게의 주문서', '별사탕 한 봉지'], ['여섯 친구의 간식', '작은 수 큰 생각', '두 접시의 약속', '추의 무게', '서로 다른 별', '일곱 개의 선물', '곰 제빵사의 부탁', '모두의 간식', '마지막 저울', '별사탕 잔치']],
  moon: [['첫 폴짝', '별 옆의 달돌', '두 번의 도약', '먼저 건널 돌', '작은 달길', '가운데 친구', '돌아오는 토끼', '빈자리의 비밀', '서로 잇는 돌', '첫 달맞이'], ['달빛 갈림길', '한 돌 먼저', '돌이 남긴 자리', '점프의 순서', '멀리 보는 토끼', '둘러 가는 달길', '달의 모퉁이', '돌다리 약속', '마지막을 생각해요', '달의 작은 지도'], ['넓어진 밤하늘', '모이는 달돌', '달 위의 발자국', '빈자리를 만들어요', '별로 가는 순서', '하나로 모아요', '조용한 도약', '달의 건너편', '마지막 폴짝', '별이 깨어난 밤']],
  mosaic: [['첫 조각 밀기', '빈칸과 인사', '세 조각의 춤', '작은 순환', '윗줄 아랫줄', '돌아서 제자리', '여섯 조각 여행', '자리를 비켜요', '번호의 약속', '여섯 조각의 밤'], ['아홉 조각 지도', '새로운 빈칸', '첫째 줄부터', '가운데 길', '조각을 돌려요', '잠시 옆으로', '박물관 복도', '한 칸을 남겨요', '조각들의 약속', '별빛 지도 완성'], ['밤하늘 정리', '빈칸의 산책', '세 줄의 지도', '돌아오는 번호', '길을 만드는 조각', '모퉁이의 비밀', '별을 모아 보아요', '마지막 줄의 춤', '큐레이터의 부탁', '별빛 박물관 개장']],
  bee: [['첫 초대장', '꽃 옆의 꽃', '돌아가는 인사', '짧은 꽃길', '모든 꽃에 안녕', '벌집은 마지막', '두 갈림길', '모퉁이 꽃', '꿀벌의 약속', '첫 꽃잔치'], ['넓어진 꽃밭', '길을 남겨요', '먼 꽃 가까운 꽃', '갈림길의 편지', '모퉁이를 먼저', '돌아올 수 없는 길', '꽃밭을 한 바퀴', '한 번씩의 약속', '마지막 꽃의 자리', '열 장의 초대장'], ['큰 꽃밭 여행', '멀리 보는 보리', '벌집으로 가는 지도', '꽃 사이의 지혜', '잊지 않은 친구', '접어 놓은 꽃길', '두 줄의 꽃밭', '모두에게 전해요', '마지막 초대장', '모두 함께 꽃잔치']],
  bridges: [['이웃 섬에 인사', '다리 세기', '작은 연못', '가운데 섬', '두 갈래 물길', '나란한 두 다리', '섬의 숫자', '양쪽의 약속', '연못 한 바퀴', '첫 다리 개통'], ['넓어진 연못', '두 줄 다리', '모든 섬의 약속', '멀리 있는 이웃', '물길을 지켜요', '숫자를 나누어요', '건너편 친구', '다리의 갈림길', '이어지는 마음', '수달 건축가'], ['큰 연못 지도', '숫자들의 대화', '작은 섬 큰 연결', '따로 남지 않게', '물길 너머 인사', '모두를 잇는 길', '서로 돕는 섬', '연못 끝 초대장', '마지막 다리', '하나가 된 연못']],
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
/** Reject rotated/reflected copies as well as literal duplicates (fixed-order mosaic and
 * horizontal mirror controls are intentionally orientation-sensitive). */
function signature(s:Stage):string {
  if(s.kind==='balance') return JSON.stringify([s.kind,s.weights,s.target]);
  if(s.kind==='mosaic'||s.kind==='twins') return JSON.stringify([s.kind,s.cols,s.rows,s.start,s.goal,s.terrain,s.terrain2]);
  const candidates:string[]=[];
  for(let reflect=0;reflect<2;reflect++) for(let rotation=0;rotation<(s.cols===s.rows?4:2);rotation++) {
    const turn=s.cols===s.rows?rotation:rotation*2;
    const transform=(at:number)=>{let x=at%s.cols,y=Math.floor(at/s.cols);if(reflect)x=s.cols-1-x;if(s.cols!==s.rows){if(turn===2){x=s.cols-1-x;y=s.rows-1-y;}return y*s.cols+x;}for(let i=0;i<turn;i++){const nx=s.cols-1-y;y=x;x=nx;}return y*s.cols+x;};
    const cells=(values:number[]|undefined)=>{if(!values)return undefined;const out=Array(values.length).fill(0) as number[];values.forEach((v,i)=>{out[transform(i)]=v;});return out;};
    let start:unknown=s.start,goal:unknown=s.goal,islands:unknown,edges:unknown;
    if(s.kind==='acorn') {start=[transform(s.start[0]),...s.start.slice(1).map(transform).sort((a,b)=>a-b)];goal=s.goal.map(transform).sort((a,b)=>a-b);}
    else if(s.kind==='bee') {start=s.start.map(transform);goal=s.goal.map(transform);}
    else if(s.kind==='moon') {start=cells(s.start);goal=s.goal.map(transform);}
    else if(s.kind==='bridges') {
      const transformed=s.islands!.map((v,i)=>({at:transform(v.at),need:v.need,old:i})).sort((a,b)=>a.at-b.at);
      const ids=new Map(transformed.map((v,i)=>[v.old,i]));
      const links=s.edges!.map(([a,b],e)=>({pair:[ids.get(a)!,ids.get(b)!].sort((x,y)=>x-y),count:s.goal[e]})).sort((a,b)=>a.pair[0]-b.pair[0]||a.pair[1]-b.pair[1]);
      islands=transformed.map(v=>[v.at,v.need]);edges=links.map(v=>v.pair);goal=links.map(v=>v.count);start=Array(links.length).fill(0);
    } else {start=cells(s.start);goal=cells(s.goal);}
    candidates.push(JSON.stringify([s.kind,s.cols,s.rows,start,goal,cells(s.terrain),islands,edges]));
  }
  return candidates.sort()[0];
}
function unique(s: Stage): boolean {
  const key=signature(s);
  if (used.has(key)) return false; used.add(key); return true;
}
function floorConnected(s: Stage, terrain: number[]) {
  const first = terrain.indexOf(1); if (first < 0) return false;
  const seen = new Set([first]);
  for (const at of seen) for (let d = 0; d < 4; d++) { const n = neighbor(s, at, d); if (n >= 0 && terrain[n]) seen.add(n); }
  return seen.size === terrain.filter(Boolean).length;
}
function room(cols: number, rows: number, walls: number): number[] {
  const s = base('acorn', cols, rows);
  const terrain = range(cols * rows).map(i => i % cols > 0 && i % cols < cols - 1 && Math.floor(i / cols) > 0 && Math.floor(i / cols) < rows - 1 ? 1 : 0);
  for (const at of shuffled(range(terrain.length).filter(i => terrain[i]))) {
    if (walls <= 0) break;
    terrain[at] = 0;
    if (floorConnected(s, terrain)) walls--; else terrain[at] = 1;
  }
  return terrain;
}
function makeAcorn(n: number): Stage {
  if (n === 1) { const s = base('acorn', 5); s.terrain = [0,0,0,0,0, 0,1,1,1,0, 0,1,1,1,0, 0,1,1,1,0, 0,0,0,0,0]; s.start = [11,12]; s.goal = [13]; return finish(s,n,[1]); }
  const boxes = n <= 4 ? 1 : n <= 21 ? 2 : 3;
  const min = n <= 10 ? 2 + Math.floor(n / 2) : n <= 20 ? 8 + Math.floor((n-11) / 2) : 13 + Math.floor((n-21)/2);
  for (let attempt = 0; attempt < 6000; attempt++) {
    const size = boxes === 1 ? (n<=3?5:6) : n < 16 ? 6 : 7;
    const s = base('acorn', size, n > 20 ? 6 : size);
    s.terrain = room(s.cols, s.rows, n < 6 ? 0 : 1 + int(n > 20 ? 4 : 3));
    const floors = range(s.terrain.length).filter(i => s.terrain![i]);
    // Goal seeds are interior: reverse pulling needs room on both sides.
    const goals = shuffled(floors.filter(i => DIRS.filter((_,d) => { const a=neighbor(s,i,d), b=neighbor(s,i,(d+2)%4); return a>=0&&b>=0&&s.terrain![a]&&s.terrain![b]; }).length >= 2)).slice(0,boxes);
    if (goals.length !== boxes) continue;
    s.goal = goals.sort((a,b)=>a-b);
    let v = [pick(floors.filter(i => !goals.includes(i))), ...s.goal];
    let pulls = 0;
    // Reverse-walk the keeper and optionally pull the seed behind into the keeper's old place.
    for (let k=0;k<80+n*6;k++) {
      const options: State[] = [];
      for(let d=0;d<4;d++) {
        const to=neighbor(s,v[0],d), behind=neighbor(s,v[0],(d+2)%4);
        if(to<0||!s.terrain[to]||v.slice(1).includes(to)) continue;
        options.push([to,...v.slice(1)]);
        const at=v.indexOf(behind,1);
        if(at>0) { const next=[...v]; next[at]=v[0]; next[0]=to; options.unshift([next[0],...next.slice(1).sort((a,b)=>a-b)]); }
      }
      if(!options.length) break;
      const next = pick(options);
      if(!same(next.slice(1),v.slice(1))) pulls++;
      v=next;
    }
    if(pulls<boxes||same(v.slice(1),s.goal)) continue;
    s.start=v;
    const found=breadthFirst(s,v,n>20?90_000:35_000);
    if(!found.path||found.path.length<min||found.path.length>min+(n<=10?2:4)||!unique(s)) continue;
    return finish(s,n,found.path);
  }
  throw new Error(`acorn ${n}: no candidate`);
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
function makeLights(n:number):Stage {
  const size=n<=10?3:n<=20?4:5, target=n<=10?1+Math.floor((n-1)/2):n<=20?3+Math.floor((n-11)/2):6+Math.floor((n-21)/2);
  for(let attempt=0;attempt<5000;attempt++) {
    const s=base('lights',size); s.start=Array(size*size).fill(1); s.goal=[...s.start];
    for(const a of shuffled(range(size*size)).slice(0,target)) s.start=act(s,s.start,a)!;
    const answer=solveLights(s,s.start);
    if(!answer||answer.length!==target||!unique(s)) continue;
    return finish(s,n,answer);
  }
  throw new Error(`lights ${n}: no candidate`);
}
function makeCoral(n:number):Stage {
  const size=n<=6?3:n<=20?4:5, colors=n<=5?3:n<=22?4:5;
  const min=n<=10?2+Math.floor((n-1)/4):n<=20?4+Math.floor((n-11)/5):6+Math.floor((n-21)/4);
  for(let attempt=0;attempt<1500;attempt++) {
    const s=base('coral',size); s.start=range(size*size).map(()=>int(colors)); s.goal=Array(size*size).fill(0);
    // Intro keeps a substantial starting region and only two color changes.
    if(n===1) s.start=[0,0,1,0,1,1,2,2,1];
    const found=breadthFirst(s,s.start,90_000);
    if(!found.path||found.path.length<min||found.path.length>min+1||!unique(s)) continue;
    return finish(s,n,found.path);
  }
  throw new Error(`coral ${n}: no candidate`);
}
/** Solve by line-overlap deductions only; use rounds as a curation metric, not fill count. */
function cloudLogic(s:Stage):{rounds:number,solved:boolean} {
  const v=Array(s.goal.length).fill(-1) as State;
  const patterns=(length:number, clue:number[])=>range(2**length).map(mask=>range(length).map(i=>(mask>>i)&1)).filter(row=>same(runs(row),clue));
  const rows=range(s.rows).map(y=>patterns(s.cols,runs(s.goal.slice(y*s.cols,(y+1)*s.cols))));
  const cols=range(s.cols).map(x=>patterns(s.rows,runs(range(s.rows).map(y=>s.goal[y*s.cols+x]))));
  for(let round=1;round<30;round++) {
    let changed=false;
    for(const axis of [0,1]) for(let line=0;line<(axis?s.cols:s.rows);line++) {
      const cells=range(axis?s.rows:s.cols).map(i=>axis?i*s.cols+line:line*s.cols+i);
      const options=(axis?cols:rows)[line].filter(p=>cells.every((at,i)=>v[at]<0||v[at]===p[i]));
      if(!options.length) return {rounds:round,solved:false};
      cells.forEach((at,i)=>{ if(v[at]<0&&options.every(p=>p[i]===options[0][i])) { v[at]=options[0][i];changed=true; } });
    }
    if(v.every(x=>x>=0)) return {rounds:round,solved:true};
    if(!changed) return {rounds:round,solved:false};
  }
  return {rounds:30,solved:false};
}
/** Hand-drawn, named pixel art. A solution should reveal something worth finishing,
 * rather than a random occupancy mask. Each silhouette is checked from its clues. */
const CLOUD_MOTIFS: [string, string[]][] = [
  ['첫 꽃송이', ['.##.', '####', '####', '.##.']],
  ['한 칸씩 계단', ['#...', '##..', '###.', '####']],
  ['바람의 깃발', ['###.', '#.#.', '###.', '#...']],
  ['작은 우산', ['.##.', '####', '..#.', '.##.']],
  ['초승달의 인사', ['.###', '##..', '##..', '.###']],
  ['하늘을 나는 연', ['.#..', '###.', '.#..', '.#..']],
  ['작은 나무', ['.#..', '###.', '###.', '.#..']],
  ['구름 왕관', ['#..#', '####', '.##.', '.##.']],
  ['작은 나비', ['#..#', '####', '.##.', '#..#']],
  ['첫 마음 선물', ['#.#.', '####', '####', '.##.']],
  ['숲속 오두막', ['..#..', '.###.', '#####', '.#.#.', '.###.']],
  ['전나무 한 그루', ['..#..', '.###.', '#####', '..#..', '..#..']],
  ['활짝 펼친 날개', ['##.##', '#####', '.###.', '#####', '##.##']],
  ['고양이의 수염', ['#...#', '#.#.#', '#####', '.###.', '..#..']],
  ['바람의 음표', ['..###', '..#.#', '..#.#', '.##.#', '##.##']],
  ['비 오는 날 장화', ['.##..', '.##..', '.##..', '.####', '#####']],
  ['빨간 사과', ['..#..', '.####', '#####', '#####', '.###.']],
  ['출발하는 기차', ['.###.', '.#.#.', '#####', '#####', '.#.#.']],
  ['축제의 종', ['..#..', '.###.', '.###.', '#####', '..#..']],
  ['별에게 보내는 편지', ['..#..', '#####', '.###.', '.#.#.', '#...#']],
  ['창문 있는 로켓', ['..##..', '.####.', '.#..#.', '.####.', '######', '.#..#.']],
  ['잎이 난 꽃', ['..##..', '.####.', '.####.', '..##..', '..#.#.', '..##..']],
  ['헤엄치는 물고기', ['....#.', '.#####', '######', '.#####', '....#.', '......']],
  ['빗방울 우산', ['.####.', '######', '..#...', '..#...', '..#.#.', '..###.']],
  ['강아지의 인사', ['##..##', '######', '#.##.#', '######', '.####.', '..##..']],
  ['바다의 고래', ['....#.', '.#####', '##.###', '######', '.####.', '..##..']],
  ['먼바다 돛단배', ['...#..', '...##.', '...###', '######', '.####.', '..##..']],
  ['느긋한 달팽이', ['..###.', '.#####', '.##.##', '..###.', '######', '#.....']],
  ['호수의 백조', ['.....#', '....##', '#..##.', '#####.', '.###..', '......']],
  ['마음을 수놓아요', ['##..##', '######', '######', '.####.', '..##..', '......']],
];
function makeCloud(n:number):Stage {
  const [title, pixels] = CLOUD_MOTIFS[n-1], size = pixels.length;
  if(pixels.some(row=>row.length!==size)) throw new Error(`cloud ${n}: malformed drawing`);
  const s=base('cloud',size);s.start=Array(size*size).fill(0);
  s.goal=pixels.join('').split('').map(pixel=>pixel==='#'?1:0);
  const logic=cloudLogic(s),answers=cloudSolutions(s,2);
  if(!logic.solved||answers.length!==1||!unique(s)) throw new Error(`cloud ${n}: silhouette needs revision`);
  const result=finish(s,n,s.goal.flatMap((x,i)=>x?[i*3+1]:[]));
  result.title=title;
  return result;
}
function makeBalance(n:number):Stage {
  const count=n<=5?3:n<=10?4:n<=15?5:n<=23?6:7;
  if(n<=5) {
    const s=base('balance',3,1);s.start=[0,0,0];s.weights=[[1,1,2],[1,2,3],[1,3,4],[2,2,4],[2,3,5]][n-1];s.target=0;
    const path=solve(s,s.start).path!;s.goal=path.map(a=>a%3);unique(s);return finish(s,n,path);
  }
  for(let attempt=0;attempt<3000;attempt++) {
    const s=base('balance',count,1); s.start=Array(count).fill(0);
    const max=n<=5?5:n<=15?6:9;
    s.weights=range(count).map(()=>1+int(max)).sort((a,b)=>a-b);
    if(new Set(s.weights).size<Math.min(3,count-1)) continue;
    const assignment: number[]=range(count).map(()=>random()<.5?1:2);
    if(!assignment.includes(1)||!assignment.includes(2)) continue;
    let target=assignment.reduce((sum,x,i)=>sum+s.weights![i]*(x===1?1:-1),0);
    if(target<0) { assignment.forEach((v,i)=>{assignment[i]=3-v;}); target=-target; }
    if((n<=5&&target!==0)||(n>5&&(target<1||target>Math.min(10,Math.ceil(n/3))))) continue;
    if(s.weights.reduce((a,b)=>a+b,0)>45) continue;
    s.target=target; s.goal=assignment;
    if(!unique(s)) continue;
    const answer=solve(s,s.start).path;
    if(!answer) continue;
    return finish(s,n,answer);
  }
  throw new Error(`balance ${n}: no candidate`);
}
function makeMoon(n:number):Stage {
  const size=5, jumps=n<=10?1+Math.floor(n/2):n<=20?6+Math.floor((n-11)/2):10+Math.floor((n-21)/3);
  for(let attempt=0;attempt<7000;attempt++) {
    const s=base('moon',size); s.terrain=Array(size*size).fill(1); s.goal=[n<=4?12:pick([6,7,8,11,12,13,16,17,18])];
    let v=Array(size*size).fill(0) as State; v[s.goal[0]]=1;
    const reverse:number[]=[];
    for(let k=0;k<jumps;k++) {
      const options:{v:State,forward:number}[]=[];
      v.forEach((stone,to)=>{ if(!stone) return; for(let d=0;d<4;d++) {
        const middle=neighbor(s,to,d),from=middle>=0?neighbor(s,middle,d):-1;
        if(from>=0&&v[middle]===0&&v[from]===0) { const next=[...v]; next[to]=0;next[middle]=1;next[from]=1; options.push({v:next,forward:from*v.length+to}); }
      }});
      if(!options.length) break;
      const next=pick(options); v=next.v;reverse.push(next.forward);
    }
    if(reverse.length!==jumps) continue;
    s.start=v;
    // Search independently, rejecting puzzles with an expensive or unavailable hint.
    const found=solve(s,v,120_000);
    if(!found.path||!unique(s)) continue;
    return finish(s,n,found.path);
  }
  throw new Error(`moon ${n}: no candidate`);
}
function makeMosaic(n:number):Stage {
  const rows=n<=10?2:3, target=n<=10?n:7+Math.floor((n-11)*.7);
  for(let attempt=0;attempt<2000;attempt++) {
    const s=base('mosaic',3,rows); s.goal=range(3*rows).map(i=>(i+1)%(3*rows));
    let v=[...s.goal],last=-1;
    for(let k=0;k<target;k++) {
      const blank=v.indexOf(0),options=actions(s,v).filter(i=>i!==last);
      v=act(s,v,pick(options))!;last=blank;
    }
    s.start=v;
    const found=solveMosaic(s,v,150_000);
    if(!found.path||found.path.length<target||found.path.length>target+2||!unique(s)) continue;
    return finish(s,n,found.path);
  }
  throw new Error(`mosaic ${n}: no candidate`);
}
function makeBee(n:number):Stage {
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
function visibleEdges(s:Stage,positions:number[]):[number,number][] {
  const edges:[number,number][]=[];
  positions.forEach((a,i)=>positions.forEach((b,j)=>{
    if(j<=i) return;
    const ax=a%s.cols,ay=Math.floor(a/s.cols),bx=b%s.cols,by=Math.floor(b/s.cols);
    if(ax!==bx&&ay!==by) return;
    const between=positions.some(c=>c!==a&&c!==b&&(ax===bx?c%s.cols===ax&&Math.floor(c/s.cols)>Math.min(ay,by)&&Math.floor(c/s.cols)<Math.max(ay,by):Math.floor(c/s.cols)===ay&&c%s.cols>Math.min(ax,bx)&&c%s.cols<Math.max(ax,bx)));
    if(!between) edges.push([i,j]);
  }));return edges;
}
function makeBridges(n:number):Stage {
  const lattice=n<=10?3:4,size=lattice*2-1, count=n<=10?3+Math.floor((n-1)/3):n<=20?6+Math.floor((n-11)/4):8+Math.floor((n-21)/4);
  for(let attempt=0;attempt<10000;attempt++) {
    const s=base('bridges',size);
    const positions=shuffled(range(lattice*lattice).map(i=>(Math.floor(i/lattice)*2)*size+(i%lattice)*2)).slice(0,count).sort((a,b)=>a-b);
    s.islands=positions.map(at=>({at,need:0}));s.edges=visibleEdges(s,positions);s.start=Array(s.edges.length).fill(0);
    const network=[...s.start],seen=new Set([0]);
    while(seen.size<count) {
      const choices: number[]=shuffled(range(s.edges.length)).filter(e=>{
        const[a,b]=s.edges![e];return seen.has(a)!==seen.has(b)&&!network.some((v,f)=>v>0&&crossing(s,e,f));
      });
      if(!choices.length) break;
      const e=choices[0];network[e]=n<6?1:random()<.4?2:1;
      const[a,b]=s.edges[e];seen.add(a);seen.add(b);
    }
    if(seen.size!==count) continue;
    if(n>12) for(const e of shuffled(range(s.edges.length))) {
      if(network[e]||random()>.18||network.some((v,f)=>v>0&&crossing(s,e,f))) continue;
      network[e]=1;
    }
    const deg=degrees(s,network);
    if(deg.some(x=>x>6)) continue;
    s.islands.forEach((island,i)=>{island.need=deg[i];});s.goal=network;
    if(!connected(s,network)) continue;
    const answers=bridgeSolutions(s,2);
    if(answers.length!==1||!unique(s)) continue;
    return finish(s,n,network.flatMap((v,e)=>v?[e*3+v]:[]));
  }
  throw new Error(`bridges ${n}: no candidate`);
}
const makers:Record<Kind,(n:number)=>Stage>={acorn:makeAcorn,twins:makeTwins,lights:makeLights,coral:makeCoral,cloud:makeCloud,balance:makeBalance,moon:makeMoon,mosaic:makeMosaic,bee:makeBee,bridges:makeBridges};
const stages:Stage[]=[];
const audit:{id:string,kind:Kind,number:number,par:number,visited:number,metric:number}[]=[];
for(const kind of KINDS) {
  console.log(`Generating ${kind}…`);
  for(let n=1;n<=30;n++) {
    const before=Date.now(),s=makers[kind](n);
    const verified=solve(s,s.start,160_000);
    if(!verified.path) throw new Error(`${s.id}: independent solve failed (${verified.exhausted?'budget':'no path'})`);
    finish({...s},n,verified.path);
    if(['acorn','twins','lights','coral','mosaic'].includes(kind)&&verified.path.length!==s.par) throw new Error(`${s.id}: par is not optimal`);
    if(kind==='cloud'&&cloudSolutions(s,2).length!==1) throw new Error(`${s.id}: ambiguous clues`);
    if(kind==='bridges'&&bridgeSolutions(s,2).length!==1) throw new Error(`${s.id}: ambiguous bridges`);
    stages.push(s);
    const metric=kind==='cloud'?cloudLogic(s).rounds:kind==='balance'?s.weights!.length:kind==='bridges'?s.islands!.length:s.par;
    audit.push({id:s.id,kind,number:n,par:s.par,visited:verified.visited,metric});
    console.log(`  ${String(n).padStart(2)} ${s.cols}×${s.rows} par=${s.par} metric=${metric} visited=${verified.visited} ${Date.now()-before}ms`);
    // Keep the previously verified catalog intact until every concept has passed.
  }
}
writeFileSync('src/lab/stages.generated.json',JSON.stringify(stages,null,2)+'\n');
mkdirSync('docs',{recursive:true});
writeFileSync('docs/lab-stage-audit.json',JSON.stringify({seed:'0x51ab2026',count:stages.length,stages:audit},null,2)+'\n');
const lines=['# 실험실 스테이지 검증','', '고정 시드 `0x51ab2026`로 생성하고 선별한 10종 × 30판입니다. 생성은 개발 도구에서만 실행하며, 플레이할 때는 검증된 고정 데이터를 읽습니다.','', '모든 판의 해답을 엔진으로 재생하고 별도 탐색으로 다시 풀었습니다. 도토리·거울 토끼·반딧불·산호·모자이크의 기준 수는 최단 해답입니다. 저울·다리의 기준 수는 논리적 배치 횟수이며, UI의 순환 버튼 클릭 수와는 다를 수 있습니다. 자수와 다리는 단서만으로 해답이 하나인 판만 남겼습니다. 자수는 직접 그린 꽃·동물·탈것 등 30개 도안이며, 줄 겹침 추론만으로 끝까지 풀리는 판만 채택했습니다.','', '| 게임 | 1장 기준 범위 | 2장 기준 범위 | 3장 기준 범위 | 가장 큰 탐색 |','|---|---:|---:|---:|---:|'];
for(const kind of KINDS) {const rows=audit.filter(a=>a.kind===kind);const band=(ch:number)=>{const v=rows.slice(ch*10,(ch+1)*10).map(a=>a.metric);return `${Math.min(...v)}–${Math.max(...v)}`;};lines.push(`| ${kind} | ${band(0)} | ${band(1)} | ${band(2)} | ${Math.max(...rows.map(a=>a.visited)).toLocaleString('en-US')} |`);}
lines.push('', '기준은 자수는 줄 추론 라운드 수, 저울은 카드 수, 다리는 섬 수, 그 외는 해답 행동 수입니다. 행동 수는 게임 사이의 난이도 비교가 아니라 같은 게임 안의 진행을 점검하는 지표입니다.','', '## 검증의 범위','', '- 모든 판은 미완성 상태로 시작하고 유효한 조작만으로 완료됩니다. 동일한 전체 판 데이터는 중복되지 않습니다. 고정 번호 모자이크와 좌우 반전 조작인 거울 토끼를 제외하면 회전·반사한 복제 판도 제외합니다.','- 밀기는 거꾸로 당기는 방식으로, 달돌은 거꾸로 돌을 늘리는 방식으로, 모자이크는 완성 상태에서 합법적으로 섞어 구성합니다.','- 벌길은 마지막 벌집 입장 규칙을 포함해 검증하며, 후반에는 실제 갈림길을 요구합니다.','- 달돌·벌길의 행동 수는 매번 돌이 하나 줄거나 방문 꽃이 하나 늘기 때문에 해답 길이가 고정됩니다. 저울·자수·다리의 기준 수는 배치 수이며 최단 클릭 수라고 주장하지 않습니다.','- 초기 상태 힌트 탐색의 방문 수를 기록하고 예산을 넘은 판은 제외합니다. 이 수치는 초기 상태에 대한 값이며 모든 임의 상태의 실행 시간을 보장하지 않습니다. 자수·다리는 단서 검증, 저울은 부분집합 열거, 반딧불은 선형대수로 풀며 이들의 visited 값은 그래프 탐색량과 직접 비교할 수 없습니다.','- 이 보고서는 풀 수 있음과 수학적 진행에 대한 검증입니다. 초등학생 대상 관찰 플레이를 대신하지 않으며, 재미·체감 난이도·읽기 편의성은 UI 점검과 사용자 피드백으로 더 조정해야 합니다.','', '재생성: `npm run lab:generate` (또는 `npx vite-node scripts/lab-generate.ts`). 전체 수치는 `docs/lab-stage-audit.json`에 있습니다.');
writeFileSync('docs/lab-stage-audit.md',lines.join('\n')+'\n');
console.log(`Wrote ${stages.length} audited laboratory stages.`);
