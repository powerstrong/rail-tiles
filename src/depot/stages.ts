import type { Chapter } from '../stages/stages';
import { type DepotStage, type DepotStageDef, parseDepotStage } from './model';

/**
 * Depot world: three chapters of ten. In each chapter stage 5 is a bonus ("출발 시각!": a fixed
 * number of moves, no undo) and stage 10 is the boss. Ids start with `dp-`. Built with
 * scripts/depot-search.ts; every stage's par and answer are checked by tests.
 */
const CH1: DepotStageDef[] = [
  // par 2, score 6.4 (target 6), bits 3.4, layouts 16, shortest answers 2
  {
    id: 'dp-first-push',
    title: '객차 비켜!',
    tip: '초록 객차를 손가락으로 쭉 끌어 길을 비켜 주세요. 길이 열리면 기관차를 깃발 쪽으로 끌어요!',
    map: [
      '. . . . .', //
      '. . A . .',
      'r r A . .',
      '. . . . .',
      '. . . . .',
    ],
    exits: { r: 'E' },
    par: 2,
    solution: ['A-1', 'r!'],
  },
  // par 3, score 9.9 (target 10), bits 5.2, layouts 149, shortest answers 8
  {
    id: 'dp-two-coaches',
    title: '두 대 비키기',
    tip: '객차는 자기 선로를 따라서만 움직여요. 누구부터 비킬까요?',
    map: [
      '. . C A A', //
      'r r C B .',
      '. . . B .',
      '. . . . .',
      '. . . . .',
    ],
    exits: { r: 'E' },
    par: 3,
    solution: ['B+1', 'C+2', 'r!'],
  },
  // par 3, score 14.0 (target 14), bits 8.6, layouts 506, shortest answers 2
  {
    id: 'dp-long-freight',
    title: '긴 화물차',
    tip: '세 칸짜리 화물차는 더 멀리 밀어야 비켜요.',
    map: [
      '. . . . . .', //
      '. . . . . .',
      'r r B . . .',
      'C C B . . A',
      '. . B . . A',
      '. D D . . A',
    ],
    exits: { r: 'E' },
    par: 3,
    solution: ['D-1', 'B+1', 'r!'],
  },
  // par 4, score 16.1 (target 16), bits 11.8, layouts 328, shortest answers 2
  {
    id: 'dp-water-tower',
    title: '급수탑 옆길',
    tip: '급수탑과 상자는 움직이지 않아요. 피해서 길을 만들어요.',
    map: [
      '. . . A A A', //
      '. . . B C .',
      'r r . B C .',
      '. . . . . .',
      '. x . D D .',
      '. . x . . .',
    ],
    exits: { r: 'E' },
    par: 4,
    solution: ['A-3', 'B-1', 'C-1', 'r!'],
  },
  // par 5, score 19.0 (target 19), bits 14.7, layouts 1186, shortest answers 8
  {
    id: 'dp-departure-1',
    title: '출발 시각! 1',
    tip: '출발 시각까지 정해진 횟수 안에 기관차를 내보내요. 되돌리기는 없어요!',
    map: [
      '. . . . . B', //
      '. . . r r B',
      '. . . . . D',
      '. . . . . D',
      'A . C . . .',
      'A . C E E E',
    ],
    exits: { r: 'E' },
    par: 5,
    solution: ['C-4', 'E-2', 'D+2', 'B+2', 'r!'],
    limit: 8,
  },
  // par 5, score 21.0 (target 21), bits 16.9, layouts 1054, shortest answers 2
  {
    id: 'dp-crowded',
    title: '붐비는 차고',
    tip: '차가 많아졌어요. 한 대씩 차근차근!',
    map: [
      'A A . . . D', //
      '. . . r r D',
      'E B B C C C',
      'E . . . . .',
      '. . . . F G',
      '. . . . F G',
    ],
    exits: { r: 'E' },
    par: 5,
    solution: ['E+1', 'B-1', 'C-1', 'D+2', 'r!'],
  },
  // par 6, score 24.9 (target 25), bits 20.2, layouts 3258, shortest answers 2
  {
    id: 'dp-zigzag',
    title: '이리저리',
    tip: '한 번 비킨 차가 다시 길을 막을 수도 있어요.',
    map: [
      '. A A . . .', //
      '. D C . B B',
      '. D C . E .',
      '. r r . E .',
      '. . . . E .',
      '. F F G G .',
    ],
    exits: { r: 'E' },
    par: 6,
    solution: ['r-1', 'F-1', 'C+3', 'B-2', 'E-2', 'r!'],
  },
  // par 9, score 29.0 (target 29), bits 27.3, layouts 1420, shortest answers 16
  {
    id: 'dp-big-yard',
    title: '넓은 차고',
    tip: '멀리 있는 차가 열쇠일 때도 있어요.',
    map: [
      '. . . B . .', //
      'A . . B D D',
      'A . . B . C',
      'E . r r . C',
      'E F F F . C',
      '. G G . t .',
    ],
    exits: { r: 'E' },
    par: 9,
    solution: ['r-1', 'A-1', 'E-1', 'F-1', 'B+2', 'D-3', 'B-2', 'C-2', 'r!'],
  },
  // par 11, score 33.1 (target 33), bits 29.2, layouts 9468, shortest answers 75
  {
    id: 'dp-rush-hour',
    title: '아침 출근길',
    tip: '모두 바쁜 아침! 어느 차부터 움직일까요?',
    map: [
      'A A B B D .', //
      'C C C . D G',
      'r r . . . G',
      'F F H . . G',
      '. E H . . .',
      '. E I I J J',
    ],
    exits: { r: 'E' },
    par: 11,
    solution: ['D+3', 'r+3', 'G+1', 'C+3', 'H-2', 'F+2', 'E-3', 'I-2', 'J-2', 'G+1', 'r!'],
  },
  // par 14, score 39.9 (target 40), bits 40.0, layouts 6655, shortest answers 384
  {
    id: 'dp-boss-1',
    title: '차고지 대장',
    tip: '차고지 첫 번째 보스예요. 침착하게!',
    map: [
      'F A A . . .', //
      'F C C . B .',
      'F r r E B .',
      'G G . E B .',
      '. . D H H x',
      'I I D . . .',
    ],
    exits: { r: 'E' },
    par: 14,
    solution: ['B-1', 'E-2', 'G+3', 'D-1', 'I+1', 'F+3', 'r-1', 'A-1', 'C-1', 'D-3', 'G-2', 'H-2', 'B+3', 'r!'],
  },
];

const CH2: DepotStageDef[] = [
  // par 3, score 15.1 (target 15), bits 10.5, layouts 372, shortest answers 1
  {
    id: 'dp-crossing',
    title: '건널목 버튼',
    tip: '노란 버튼 위에 다른 차를 세워 두면 차단기가 올라가요.',
    map: [
      '. A A . . .', //
      '. + . . . .',
      '. . . C C C',
      'r r . . = .',
      '. B . . . .',
      '. B . . . .',
    ],
    exits: { r: 'E' },
    par: 3,
    solution: ['r+2', 'B-3', 'r!'],
  },
  // par 4, score 19.0 (target 19), bits 13.3, layouts 2060, shortest answers 2
  {
    id: 'dp-hold-button',
    title: '버튼 꾹',
    tip: '버튼에서 차가 떠나면 차단기가 다시 내려가요.',
    map: [
      'A A . B C +', //
      '. r r B C =',
      '. . D . . .',
      '. . D . . .',
      '. . E E E .',
      '. . . . . .',
    ],
    exits: { r: 'E' },
    par: 4,
    solution: ['B+2', 'C+2', 'A+4', 'r!'],
  },
  // par 5, score 22.9 (target 23), bits 16.9, layouts 7224, shortest answers 3
  {
    id: 'dp-crossing-tower',
    title: '급수탑 건널목',
    tip: '급수탑을 피해서 버튼까지 갈 차를 찾아요.',
    map: [
      'x E B B D .', //
      '. E . A D .',
      'r r . A . =',
      '. . . C C x',
      '. . . . . .',
      '. . . F F .',
    ],
    exits: { r: 'E' },
    under: { '3,1': '+' },
    par: 5,
    solution: ['C-3', 'D+3', 'B+2', 'A-1', 'r!'],
  },
  // par 6, score 27.0 (target 27), bits 22.6, layouts 8955, shortest answers 3
  {
    id: 'dp-park-and-go',
    title: '세워 두고 출발',
    tip: '버튼을 누를 차를 먼저 정해요.',
    map: [
      't . . . . .', //
      'E B B . . .',
      'E C C D D D',
      '. . F F . .',
      '. . r r . A',
      'G G . . . A',
    ],
    exits: { r: 'E' },
    under: { '5,4': '=', '5,5': '+' },
    par: 6,
    solution: ['E+2', 'C-1', 'D-1', 'A-4', 'G+4', 'r!'],
  },
  // par 6, score 25.2 (target 25), bits 20.4, layouts 3786, shortest answers 2
  {
    id: 'dp-departure-2',
    title: '출발 시각! 2',
    tip: '출발 시각까지 정해진 횟수 안에 기관차를 내보내요. 되돌리기는 없어요!',
    map: [
      '. . E . . +', //
      'B . E A C C',
      'B r r A = .',
      '. . . . . D',
      '. . . . . D',
      '. . . . . D',
    ],
    exits: { r: 'E' },
    par: 6,
    solution: ['A+2', 'C-1', 'D-3', 'r+2', 'D+3', 'r!'],
    limit: 9,
  },
  // par 10, score 31.1 (target 31), bits 27.1, layouts 2162, shortest answers 6
  {
    id: 'dp-busy-crossing',
    title: '바쁜 건널목',
    tip: '버튼으로 가는 길도 막혀 있어요.',
    map: [
      'A A D B C C', //
      '. . D B . .',
      '+ . D E E t',
      'H H . . . .',
      'F r r G = .',
      'F . . G . .',
    ],
    exits: { r: 'E' },
    par: 10,
    solution: ['H+4', 'D+1', 'A+1', 'F-4', 'r-1', 'D+2', 'E-3', 'D-2', 'G-2', 'r!'],
  },
  // par 10, score 35.0 (target 35), bits 32.2, layouts 14869, shortest answers 20
  {
    id: 'dp-wait-for-it',
    title: '조금만 기다려',
    tip: '서두르면 길이 막혀요. 순서를 생각해요.',
    map: [
      'G . . B . D', //
      'G . . B C D',
      'E E E . C .',
      '. . F F C +',
      'r r A = . .',
      '. . A H H H',
    ],
    exits: { r: 'E' },
    par: 10,
    solution: ['F-2', 'A-1', 'H-3', 'C+2', 'E+3', 'A-3', 'E-3', 'C-3', 'D+2', 'r!'],
  },
  // par 12, score 39.0 (target 39), bits 37.1, layouts 100797, shortest answers 864
  {
    id: 'dp-crossing-maze',
    title: '건널목 미로',
    tip: '버튼, 차단기, 그리고 많은 차들!',
    map: [
      'F . . x . .', //
      'F . . + . .',
      'F . A H D D',
      'G G A H C E',
      '. B r r C E',
      '. B I I . .',
    ],
    exits: { r: 'E' },
    under: { '5,4': '=' },
    par: 12,
    solution: ['A-2', 'H-1', 'G+2', 'B-4', 'r-2', 'G-2', 'H+2', 'D-3', 'C-3', 'E-3', 'H-2', 'r!'],
  },
  // par 14, score 42.6 (target 43), bits 41.9, layouts 7486, shortest answers 36
  {
    id: 'dp-signal-box',
    title: '신호소',
    tip: '어느 차가 버튼을 지킬까요?',
    map: [
      'A B B . C C', //
      'A . . . . .',
      'r r H D . .',
      'F G H D I I',
      'F G J J E .',
      '. K K K E .',
    ],
    exits: { r: 'E' },
    under: { '3,2': '=', '3,3': '+' },
    par: 14,
    solution: ['D-1', 'H-1', 'I-2', 'E-3', 'I+2', 'J+2', 'D+2', 'H+2', 'r+1', 'A+1', 'B-1', 'C-2', 'E-1', 'r!'],
  },
  // par 18, score 50.1 (target 50), bits 49.5, layouts 25486, shortest answers 424
  {
    id: 'dp-boss-2',
    title: '건널목 대장',
    tip: '건널목 챕터의 보스예요!',
    map: [
      'A A B B B C', //
      'D . . E E C',
      'D . G G F .',
      'J J K H F I',
      'r r K H F I',
      '. . . L L .',
    ],
    exits: { r: 'E' },
    under: { '5,0': '+', '2,4': '=' },
    par: 18,
    solution: ['C+1', 'B+1', 'A+1', 'D-1', 'E-2', 'F-1', 'G-2', 'H-2', 'K-1', 'r+3', 'K+1', 'G+1', 'D+1', 'A-1', 'B-1', 'C-1', 'I-1', 'r!'],
  },
];

const CH3: DepotStageDef[] = [
  // par 3, score 17.0 (target 17), bits 10.5, layouts 1988, shortest answers 1
  {
    id: 'dp-two-engines',
    title: '기관차 두 대',
    tip: '기관차가 두 대! 각자 자기 색 깃발이 달린 출구로 나가요.',
    map: [
      '. . . . . .', //
      '. . . . b .',
      'B r r . b .',
      'B . . . . .',
      '. A . C C .',
      '. A . . . .',
    ],
    exits: { r: 'E', b: 'S' },
    par: 3,
    solution: ['C-1', 'b!', 'r!'],
  },
  // par 5, score 21.0 (target 21), bits 15.9, layouts 1054, shortest answers 1
  {
    id: 'dp-blue-first',
    title: '누가 먼저?',
    tip: '먼저 나간 기관차는 길을 비켜 줘요.',
    map: [
      '. . b A A A', //
      '. . b B . .',
      '. . . B . .',
      'C r r B . .',
      'C . . . . .',
      '. . . . . .',
    ],
    exits: { r: 'E', b: 'S' },
    par: 5,
    solution: ['b+1', 'A-3', 'B-1', 'r!', 'b!'],
  },
  // par 6, score 25.0 (target 25), bits 18.6, layouts 13548, shortest answers 6
  {
    id: 'dp-north-gate',
    title: '위쪽 출구',
    tip: '이번에는 위쪽으로 나가는 기관차가 있어요.',
    map: [
      '. . . . C .', //
      'A . . . C .',
      'A B . . . .',
      'A B r r D .',
      '. E E b D .',
      '. . . b F F',
    ],
    exits: { r: 'E', b: 'N' },
    par: 6,
    solution: ['B-2', 'r-1', 'b!', 'F-4', 'D+1', 'r!'],
  },
  // par 7, score 29.0 (target 29), bits 25.1, layouts 8318, shortest answers 4
  {
    id: 'dp-side-by-side',
    title: '나란히 나란히',
    tip: '두 기관차가 서로 반대쪽으로 나가요.',
    map: [
      '. . . A A .', //
      '. . C C C F',
      '. . x . . F',
      'D B b b E F',
      'D B r r E .',
      'D B . . E .',
    ],
    exits: { r: 'E', b: 'W' },
    par: 7,
    solution: ['B-3', 'D-3', 'b!', 'B+2', 'C-1', 'E-2', 'r!'],
  },
  // par 7, score 28.0 (target 28), bits 23.3, layouts 5220, shortest answers 2
  {
    id: 'dp-departure-3',
    title: '출발 시각! 3',
    tip: '출발 시각까지 정해진 횟수 안에 기관차를 내보내요. 되돌리기는 없어요!',
    map: [
      '. . B B B .', //
      '. b A . . .',
      '. b A D D C',
      'r r . . . C',
      'E E E F . C',
      '. . . F . .',
    ],
    exits: { r: 'E', b: 'S' },
    par: 7,
    solution: ['C-2', 'r!', 'C+3', 'D+1', 'F-3', 'E+2', 'b!'],
    limit: 10,
  },
  // par 8, score 33.1 (target 33), bits 29.9, layouts 15271, shortest answers 4
  {
    id: 'dp-two-and-crossing',
    title: '두 대와 건널목',
    tip: '빨간 기관차 앞에 차단기가 있어요.',
    map: [
      '. . A A . B', //
      '. b . r r B',
      '. b C . . D',
      '. . C . . D',
      'E E F F . .',
      '. . G G . .',
    ],
    exits: { r: 'E', b: 'S' },
    under: { '5,1': '=', '3,4': '+' },
    par: 8,
    solution: ['D+2', 'B+2', 'r!', 'B-2', 'D-2', 'F+2', 'E+2', 'b!'],
  },
  // par 12, score 37.0 (target 37), bits 32.8, layouts 48239, shortest answers 200
  {
    id: 'dp-shunting',
    title: '차량 정리',
    tip: '차들을 이리저리 옮겨 두 길을 열어요.',
    map: [
      'F . . A A A', //
      'F B B D D .',
      'F . C . E E',
      '. . C x . G',
      'r r . . b G',
      'H H H . b .',
    ],
    exits: { r: 'E', b: 'N' },
    par: 12,
    solution: ['r+1', 'H+1', 'F+3', 'B-1', 'C-2', 'E-4', 'C+2', 'A-3', 'D-1', 'b!', 'G-3', 'r!'],
  },
  // par 12, score 40.9 (target 41), bits 36.5, layouts 37095, shortest answers 8
  {
    id: 'dp-twin-crossing',
    title: '건널목과 두 기관차',
    tip: '버튼을 누를 차와 비킬 차를 나눠요.',
    map: [
      'A A D B B B', //
      '. . D C C x',
      'r r . b = .',
      'G F F b . .',
      'G E . . . .',
      '. E H H H .',
    ],
    exits: { r: 'E', b: 'S' },
    under: { '2,5': '+' },
    par: 12,
    solution: ['G+1', 'F-1', 'D+2', 'C-3', 'b-1', 'D-2', 'F+4', 'E-1', 'G-1', 'H-2', 'b!', 'r!'],
  },
  // par 14, score 46.0 (target 46), bits 45.2, layouts 25556, shortest answers 24
  {
    id: 'dp-grand-depot',
    title: '큰 차고지',
    tip: '차고지에서 가장 큰 정리 작업!',
    map: [
      'A . . B B .', //
      'A . . b b .',
      'D D D E . .',
      '. G G E F C',
      'r r H I F C',
      't . H I . C',
    ],
    exits: { r: 'E', b: 'W' },
    under: { '2,2': '+', '4,4': '=' },
    par: 14,
    solution: ['b-2', 'B+1', 'E-2', 'D+3', 'A+2', 'b!', 'A-2', 'G-1', 'H-4', 'D-3', 'C-2', 'F-2', 'I-2', 'r!'],
  },
  // par 20, score 54.9 (target 55), bits 56.4, layouts 24476, shortest answers 1024
  {
    id: 'dp-final-boss',
    title: '차고지 정복',
    tip: '기관차 두 대, 건널목, 꽉 찬 차고. 마지막 보스예요!',
    map: [
      'A I . . B B', //
      'A I F C C E',
      'r r F D b E',
      't . F D b .',
      'H . . G J J',
      'H . . G K K',
    ],
    exits: { r: 'E', b: 'S' },
    under: { '0,1': '+', '3,2': '=' },
    par: 20,
    solution: ['E+1', 'C+1', 'D-2', 'G-2', 'J-3', 'K-3', 'b!', 'J+3', 'K+3', 'F+2', 'G+2', 'r+2', 'I+3', 'r-2', 'D+2', 'B-3', 'C-3', 'D-2', 'E-2', 'r!'],
  },
];

const CHAPTER_DEFS: { title: string; blurb: string; color: string; stages: DepotStageDef[] }[] = [
  { title: '차고지 탈출', blurb: '객차를 끌어서 길을 비켜 주면 기관차가 출발해요.', color: '#2E6F8E', stages: CH1 },
  { title: '건널목 버튼', blurb: '노란 버튼 위에 차를 세워 두면 차단기가 올라가요.', color: '#E0A22E', stages: CH2 },
  { title: '기관차 두 대', blurb: '기관차마다 자기 색 깃발이 달린 출구로 나가요.', color: '#8E6BD1', stages: CH3 },
];

export const DEPOT_STAGE_DEFS: DepotStageDef[] = CHAPTER_DEFS.flatMap((c) => c.stages);

export const DEPOT_CHAPTERS: Chapter[] = CHAPTER_DEFS.reduce<Chapter[]>((acc, c, i) => {
  const start = acc.length ? acc[acc.length - 1].start + acc[acc.length - 1].count : 0;
  return [...acc, { number: i + 1, title: c.title, blurb: c.blurb, color: c.color, start, count: c.stages.length }];
}, []);

export const DEPOT_STAGES: DepotStage[] = DEPOT_STAGE_DEFS.map((def, i) => {
  const stage = parseDepotStage(def, i + 1);
  const ch = DEPOT_CHAPTERS.find((c) => i >= c.start && i < c.start + c.count)!;
  return { ...stage, label: `STAGE ${ch.number}-${i - ch.start + 1}` };
});
