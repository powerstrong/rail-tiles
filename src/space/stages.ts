import type { Chapter } from '../stages/stages';
import { type SpaceStage, type SpaceStageDef, parseSpaceStage } from './model';

/**
 * Space station world: three chapters of ten. In each chapter stage 5 is a bonus ("산소가
 * 부족해!": a fixed number of presses, no undo) and stage 10 is the boss. Ids start with `sp-`.
 * Searched with scripts/space-search.ts (specs in scripts/space-specs.ts) and picked by hand;
 * every stage's par and answer are checked by tests. Answers are presses: U R D L.
 */

const CH1: SpaceStageDef[] = [
  // par 3, score 5.8 (target 4), bits 1.6, layouts 14, traps 0%, shortest answers 3
  {
    id: 'sp-first-gravity',
    title: '첫 번째 중력',
    tip: '화살표 버튼을 누르거나 화면을 쓱 밀어 보세요. 캡슐이 그쪽으로 한 칸 날아가요!',
    map: [
      '# . . #', //
      '. r . .',
      '. . . .',
      'R . . .',
    ],
    par: 3,
    solution: 'UUR',
  },
  // par 4, score 7.2 (target 7), bits 2.2, layouts 19, traps 0%, shortest answers 4
  {
    id: 'sp-wall-stop',
    title: '소행성 피하기',
    tip: '소행성과 벽은 지나갈 수 없어요. 빙 돌아서 도킹장으로!',
    map: [
      'R . . . o', //
      '. . . r .',
      '. o . . .',
      'o . . . #',
      '. . . # .',
    ],
    par: 4,
    solution: 'RRRD',
  },
  // par 4, score 11.1 (target 11), bits 4.2, layouts 68, traps 0%, shortest answers 4
  {
    id: 'sp-two-capsules',
    title: '캡슐 두 대',
    tip: '두 캡슐이 한꺼번에 움직여요. 가장자리에 막힌 캡슐은 그 자리에 멈춰요.',
    map: [
      '. . . . .', //
      '. . R . .',
      'o . . r .',
      '# . . B .',
      '. # . b .',
    ],
    par: 4,
    solution: 'RRDL',
  },
  // par 5, score 15.0 (target 15), bits 5.6, layouts 290, traps 0%, shortest answers 4
  {
    id: 'sp-lean-on-wall',
    title: '벽에 기대기',
    tip: '한 캡슐이 벽에 막혀 있는 동안 다른 캡슐만 움직일 수 있어요.',
    map: [
      '. r . . o', //
      '. . b o .',
      '. . . . #',
      'R B . . o',
      '# . . . .',
    ],
    par: 5,
    solution: 'DUUUR',
  },
  // par 5, score 13.8 (target 14), bits 5.8, layouts 86, traps 0%, shortest answers 4
  {
    id: 'sp-oxygen-1',
    title: '산소가 부족해! 1',
    tip: '산소가 떨어지기 전에 모두 도킹해요. 되돌리기는 없어요!',
    map: [
      '. b . . .', //
      'r . . . .',
      'B . . . #',
      'R . # o .',
      '. # . # .',
    ],
    par: 5,
    solution: 'RRUUL',
    limit: 8,
  },
  // par 7, score 19.0 (target 19), bits 9.3, layouts 52, traps 0%, shortest answers 3
  {
    id: 'sp-asteroids',
    title: '소행성 지대',
    tip: '소행성 사이로 두 캡슐을 조심조심!',
    map: [
      'o . . . o b', //
      '. . . . o B',
      '. . . . . o',
      '. . R . o r',
      '. . . . o .',
      '. . . . . .',
    ],
    par: 7,
    solution: 'RDDRRUU',
  },
  // par 7, score 23.0 (target 23), bits 9.8, layouts 758, traps 0%, shortest answers 2
  {
    id: 'sp-crossing',
    title: '엇갈리는 길',
    tip: '빨강은 오른쪽, 파랑은 왼쪽? 서로 엇갈리게 보내 봐요.',
    map: [
      '. . . . R .', //
      'o o . b r B',
      '. # . . . #',
      '. . # # . .',
      '. . . . . .',
      '. . o . . .',
    ],
    par: 7,
    solution: 'RLDRLDU',
  },
  // par 6, score 25.0 (target 25), bits 10.2, layouts 5028, traps 0%, shortest answers 2
  {
    id: 'sp-three-capsules',
    title: '캡슐 세 대',
    tip: '노란 캡슐까지 세 대! 누가 먼저 벽에 닿을지 생각해요.',
    map: [
      '. . B . .', //
      '. r o b y',
      '. . o # Y',
      '. . . # .',
      '. R . . #',
    ],
    par: 6,
    solution: 'UUURUD',
  },
  // par 8, score 30.0 (target 30), bits 12.6, layouts 23658, traps 0%, shortest answers 6
  {
    id: 'sp-queue',
    title: '도킹 대기열',
    tip: '세 캡슐이 줄을 서요. 앞 캡슐이 막히면 뒤 캡슐도 멈춰요.',
    map: [
      'B . . . o .', //
      'R . . b . .',
      '. Y . . o o',
      '. r y . . .',
      '. . o . . .',
      '. . . . . .',
    ],
    par: 8,
    solution: 'URRDRRDL',
  },
  // par 10, score 37.0 (target 37), bits 17.2, layouts 22992, traps 0%, shortest answers 4
  {
    id: 'sp-boss-1',
    title: '첫 도킹 임무',
    tip: '챕터 1 보스! 세 캡슐을 한 번에 도킹시켜요.',
    map: [
      '. . . . . .', //
      'B . Y . . R',
      '. # o . . .',
      '. . b . . .',
      'y . o # . r',
      '. . . . o .',
    ],
    par: 10,
    solution: 'DLLDRRDDDU',
  },
];

const CH2: SpaceStageDef[] = [
  // par 4, score 8.0 (target 8), bits 2.6, layouts 20, traps 0%, shortest answers 3
  {
    id: 'sp-booster',
    title: '한 칸 더!',
    tip: '주황 부스터에 날아 들어가면 화살표 쪽으로 한 칸 더 쓩!',
    map: [
      '# R > . .', //
      '. # o . .',
      '. . . . r',
      '. . . . .',
      '. . . # .',
    ],
    par: 4,
    solution: 'RRDD',
  },
  // par 4, score 14.5 (target 12), bits 5.0, layouts 444, traps 0%, shortest answers 3
  {
    id: 'sp-booster-two',
    title: '부스터와 두 캡슐',
    tip: '부스터를 밟은 캡슐만 한 칸 더 가요. 둘 사이가 벌어져요.',
    map: [
      '. . . . .', //
      '. o . . .',
      '. . b r .',
      '. . . R .',
      'o B . < .',
    ],
    par: 4,
    solution: 'DUUR',
  },
  // par 7, score 16.3 (target 16), bits 6.8, layouts 156, traps 0%, shortest answers 8
  {
    id: 'sp-split',
    title: '갈라지는 캡슐',
    tip: '같은 중력인데 다르게 움직이게 만들어 봐요.',
    map: [
      '. . o . v', //
      '# # . . b',
      '. > . R r',
      '. . . . ^',
      '. . B . .',
    ],
    par: 7,
    solution: 'UUURURD',
  },
  // par 6, score 20.0 (target 20), bits 8.2, layouts 860, traps 0%, shortest answers 4
  {
    id: 'sp-backward',
    title: '거꾸로 부스터',
    tip: '부스터가 중력과 다른 쪽을 가리키면 어떻게 될까요?',
    map: [
      '. # . . b r', //
      '. . . . . B',
      '. . . . . .',
      '# . . > . R',
      'v . ^ o . .',
      '. . . . . .',
    ],
    par: 6,
    solution: 'LLUUUR',
  },
  // par 5, score 17.0 (target 17), bits 7.2, layouts 304, traps 0%, shortest answers 4
  {
    id: 'sp-oxygen-2',
    title: '산소가 부족해! 2',
    tip: '부스터를 잘 쓰면 산소를 아낄 수 있어요. 되돌리기는 없어요!',
    map: [
      '. # . . .', //
      '. . o . .',
      'B > R . .',
      '. . . b o',
      '. < . r #',
    ],
    par: 5,
    solution: 'URDRD',
    limit: 8,
  },
  // par 7, score 23.0 (target 23), bits 10.2, layouts 668, traps 0%, shortest answers 3
  {
    id: 'sp-booster-maze',
    title: '부스터 미로',
    tip: '부스터가 여기저기! 어느 부스터를 밟을까요?',
    map: [
      '. . . . < o', //
      '# o . . R B',
      '. . > r . .',
      'o b . . ^ .',
      '. . o . # .',
      '. . . . . .',
    ],
    par: 7,
    solution: 'UDLLDLL',
  },
  // par 8, score 25.9 (target 26), bits 12.2, layouts 618, traps 0%, shortest answers 3
  {
    id: 'sp-relay',
    title: '부스터 릴레이',
    tip: '부스터에서 부스터로, 캡슐을 이어 보내요.',
    map: [
      '. # o b . .', //
      '# . r . . .',
      '. . . > . .',
      '# . < R . .',
      '. . B . . .',
      '. . ^ . . #',
    ],
    par: 8,
    solution: 'LULUURRU',
  },
  // par 7, score 28.0 (target 28), bits 12.6, layouts 4242, traps 0%, shortest answers 3
  {
    id: 'sp-booster-three',
    title: '세 캡슐 부스터',
    tip: '세 캡슐과 부스터. 누가 부스터를 밟을지 골라요.',
    map: [
      '. . . . o', //
      '# R . Y .',
      '# v . y v',
      '. . b r .',
      '. B # . .',
    ],
    par: 7,
    solution: 'DULLRRD',
  },
  // par 8, score 32.0 (target 32), bits 13.8, layouts 17946, traps 0%, shortest answers 2
  {
    id: 'sp-lab',
    title: '연구소 대소동',
    tip: '부스터 연구소가 북적북적! 차근차근 도킹해요.',
    map: [
      '> . y r . b', //
      '. . . . . .',
      '. o . > . #',
      'Y . # . . .',
      '. . . . . .',
      '> . R B . .',
    ],
    par: 8,
    solution: 'URUULUUR',
  },
  // par 10, score 39.0 (target 39), bits 19.0, layouts 15937, traps 0%, shortest answers 3
  {
    id: 'sp-boss-2',
    title: '추진 제어실',
    tip: '챕터 2 보스! 부스터를 모두 내 편으로 만들어요.',
    map: [
      '. . r > . .', //
      '. v . . Y #',
      'b R . . o .',
      '. . . . y .',
      '. ^ . . . .',
      'B . # . . .',
    ],
    par: 10,
    solution: 'RLDDRRLUUU',
  },
];

const CH3: SpaceStageDef[] = [
  // par 3, score 9.5 (target 7), bits 4.0, layouts 21, traps 0%, shortest answers 2
  {
    id: 'sp-wormhole',
    title: '수상한 구멍',
    tip: '웜홀에 날아 들어가면 같은 색 웜홀로 순식간에 나와요!',
    map: [
      '# . . . r', //
      '. . . # 1',
      '. . R . .',
      '. 1 . . .',
      '. # . # .',
    ],
    par: 3,
    solution: 'DLU',
  },
  // par 4, score 14.3 (target 12), bits 4.8, layouts 476, traps 0%, shortest answers 3
  {
    id: 'sp-through',
    title: '웜홀 너머',
    tip: '한 캡슐만 웜홀로 보내면 둘 사이가 확 바뀌어요.',
    map: [
      '. 1 . . .', //
      '. . B r .',
      '. . . b .',
      '. # . . .',
      '# 1 R . .',
    ],
    par: 4,
    solution: 'LRRD',
  },
  // par 5, score 16.7 (target 17), bits 5.8, layouts 842, traps 0%, shortest answers 3
  {
    id: 'sp-shortcut',
    title: '지름길',
    tip: '멀리 돌아가지 말고 웜홀 지름길로!',
    map: [
      '. . . . . .', //
      '. . . . r .',
      'o . . . b .',
      '# . . . . R',
      '. o 1 . . 1',
      'o . B . . o',
    ],
    par: 5,
    solution: 'UDUUL',
  },
  // par 6, score 20.0 (target 20), bits 8.2, layouts 876, traps 0%, shortest answers 4
  {
    id: 'sp-two-wormholes',
    title: '웜홀 두 쌍',
    tip: '보라 웜홀은 보라끼리, 초록 웜홀은 초록끼리 이어져 있어요.',
    map: [
      '1 # 2 . 1 .', //
      '. . . B . .',
      'b . . R . r',
      '# . . . . .',
      '. . # . 2 .',
      '. . . # . o',
    ],
    par: 6,
    solution: 'URURDD',
  },
  // par 5, score 18.0 (target 18), bits 7.6, layouts 475, traps 0%, shortest answers 4
  {
    id: 'sp-oxygen-3',
    title: '산소가 부족해! 3',
    tip: '웜홀로 산소를 아껴요. 되돌리기는 없어요!',
    map: [
      '. 1 . . .', //
      'R . o . o',
      '. . b . .',
      'r . . . B',
      '. 1 . . .',
    ],
    par: 5,
    solution: 'URULL',
    limit: 8,
  },
  // par 7, score 24.1 (target 24), bits 11.0, layouts 922, traps 0%, shortest answers 4
  {
    id: 'sp-warp-boost',
    title: '부스터와 웜홀',
    tip: '부스터가 캡슐을 웜홀로 밀어 넣을 수도 있어요.',
    map: [
      '. B > . . 1', //
      '. . . r . .',
      '. # . . < .',
      '. . # b . R',
      '. . . . . .',
      '. . . 1 o .',
    ],
    par: 7,
    solution: 'RRRUULL',
  },
  // par 8, score 27.0 (target 27), bits 12.5, layouts 855, traps 0%, shortest answers 2
  {
    id: 'sp-warp-maze',
    title: '웜홀 미로',
    tip: '어느 웜홀로 들어가야 할까요? 길이 꼬여 있어요.',
    map: [
      'R . . . . o', //
      '. . . . . .',
      '. . 1 . . .',
      '. o # . . b',
      '. . 2 . o 2',
      '# B o 1 r .',
    ],
    par: 8,
    solution: 'ULDDRRRU',
  },
  // par 8, score 30.0 (target 30), bits 12.9, layouts 7470, traps 0%, shortest answers 2
  {
    id: 'sp-warp-three',
    title: '세 캡슐 순간이동',
    tip: '세 캡슐과 웜홀! 건너편이 막혀 있으면 웜홀도 쉬어요.',
    map: [
      '. . R . .', //
      '. # . . #',
      '1 o b . B',
      '. Y r y .',
      '. # 1 . .',
    ],
    par: 8,
    solution: 'LULDRDLU',
  },
  // par 10, score 35.0 (target 35), bits 15.3, layouts 15774, traps 0%, shortest answers 2
  {
    id: 'sp-galaxy',
    title: '은하 교차로',
    tip: '부스터와 웜홀이 모두 있어요. 세 캡슐을 길 안내해요.',
    map: [
      '. . . . o .', //
      '. . o . r #',
      '. R . # b y',
      '. . 1 . > ^',
      '1 . . # B .',
      'Y . # . . .',
    ],
    par: 10,
    solution: 'URURRLURDR',
  },
  // par 11, score 44.0 (target 44), bits 21.6, layouts 21051, traps 0%, shortest answers 1
  {
    id: 'sp-final-boss',
    title: '은하 정거장 귀환',
    tip: '마지막 보스! 지금까지 배운 모든 것으로 도킹해요.',
    map: [
      '. . . . . r', //
      '. . R . . .',
      '1 y . o . B',
      '. . . 1 . .',
      '. ^ o . . b',
      'o . . < Y .',
    ],
    par: 11,
    solution: 'LRRDDDLURRR',
  },
];

const CHAPTER_DEFS: { title: string; blurb: string; color: string; stages: SpaceStageDef[] }[] = [
  { title: '중력 조종실', blurb: '중력 버튼으로 모든 캡슐을 한꺼번에 움직여요.', color: '#5B4FD1', stages: CH1 },
  { title: '부스터 연구소', blurb: '부스터에 날아 들어간 캡슐은 한 칸 더 쓩!', color: '#FF9F43', stages: CH2 },
  { title: '웜홀 정거장', blurb: '웜홀에 들어가면 같은 색 웜홀로 나와요.', color: '#2FC6B3', stages: CH3 },
];

export const SPACE_STAGE_DEFS: SpaceStageDef[] = CHAPTER_DEFS.flatMap((c) => c.stages);

export const SPACE_CHAPTERS: Chapter[] = CHAPTER_DEFS.reduce<Chapter[]>((acc, c, i) => {
  const start = acc.length ? acc[acc.length - 1].start + acc[acc.length - 1].count : 0;
  return [...acc, { number: i + 1, title: c.title, blurb: c.blurb, color: c.color, start, count: c.stages.length }];
}, []);

export const SPACE_STAGES: SpaceStage[] = SPACE_STAGE_DEFS.map((def, i) => {
  const stage = parseSpaceStage(def, i + 1);
  const ch = SPACE_CHAPTERS.find((c) => i >= c.start && i < c.start + c.count)!;
  return { ...stage, label: `STAGE ${ch.number}-${i - ch.start + 1}` };
});
