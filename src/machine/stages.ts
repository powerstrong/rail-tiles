import type { Chapter } from '../stages/stages';
import { type MachineStage, type MachineStageDef, parseMachineStage } from './model';

/**
 * Machine world: three chapters of ten. In each chapter stage 5 is a bonus stage (rescue the
 * robot before its battery runs out) and stage 10 is the boss. Ids start with `mc-`.
 */
const CH1: MachineStageDef[] = [
  {
    id: 'mc-first-mirror',
    title: '첫 번째 거울',
    tip: '거울을 톡 누르면 빙글 돌아요. 레이저를 전구로 보내 불을 켜요!',
    lasers: [['W', 'white']],
    map: [
      'o . m . .', //
      '. . n . L',
      '. . . . .',
      '. . . . .',
      '. . . . .',
    ],
    par: 1,
    solution: [0],
  },
  {
    id: 'mc-two-turns',
    title: '두 번 꺾기',
    tip: '빛은 거울에 닿으면 꺾여요. 어느 거울을 돌릴까요?',
    lasers: [['S', 'white']],
    map: [
      '. . . . L', //
      '. . n . n',
      '. . . . .',
      '. # . . .',
      '. . n o .',
    ],
    par: 2,
    solution: [0, 1],
  },
  {
    id: 'mc-bolted',
    title: '나사 박힌 거울',
    tip: '나사로 고정된 거울은 돌릴 수 없어요. 그대로 이용해요.',
    lasers: [['E', 'white']],
    map: [
      '. . . . o', //
      '. . # m n',
      '. . m n .',
      'L o M . .',
      '. . . . .',
    ],
    par: 2,
    solution: [1, 3],
  },
  {
    id: 'mc-two-bulbs',
    title: '전구 두 개',
    tip: '빛은 전구를 지나가요. 한 줄기로 전구 두 개를 켤 수도 있어요.',
    lasers: [['E', 'white']],
    map: [
      '. . . n . .', //
      '. . . . . .',
      '. . . . . .',
      '. o n . . #',
      'L . . o m .',
      '. . m . n .',
    ],
    par: 3,
    solution: [2, 3, 4],
  },
  {
    id: 'mc-bonus-1',
    title: '로봇 구출 작전 1',
    tip: '배터리가 떨어지기 전에 전구를 모두 켜요!',
    lasers: [['E', 'white']],
    battery: 5,
    map: [
      '. . . . . .', //
      '. m . . n .',
      '. . . n m .',
      'L o . o n #',
      '. . . . . .',
      'o . . n . .',
    ],
    par: 4,
    solution: [2, 3, 4, 5],
  },
  {
    id: 'mc-mirror-maze',
    title: '거울 미로',
    tip: '건드리면 안 되는 거울도 있어요.',
    lasers: [['S', 'white']],
    map: [
      '. o . L . .', //
      '. . . . # .',
      '. . . o . N',
      '. n . o m .',
      '. . . m . m',
      '. . . . n n',
    ],
    par: 4,
    solution: [2, 3, 4, 6],
  },
  {
    id: 'mc-bolted-path',
    title: '고정 거울 길',
    tip: '고정 거울 두 개가 길잡이예요.',
    lasers: [['E', 'white']],
    map: [
      '. . n . . m', //
      '. . . . # .',
      'N . . n o .',
      '. . m m . n',
      'L o o M . n',
      '. . . . . .',
    ],
    par: 5,
    solution: [0, 1, 3, 4, 6],
  },
  {
    id: 'mc-big-room',
    title: '넓은 공장',
    tip: '판이 넓어졌어요. 레이저가 어디로 가는지 따라가 봐요.',
    lasers: [['S', 'white']],
    map: [
      '. . n L . n #', //
      '. . . o . . .',
      '. . . o . . .',
      'n . . m . . .',
      '. . . . . # o',
      '. M . n . . n',
      'm . . n . . .',
    ],
    par: 5,
    solution: [2, 5, 6, 7, 8],
  },
  {
    id: 'mc-four-bulbs',
    title: '전구 네 개',
    tip: '전구 네 개를 한꺼번에 켜야 해요.',
    lasers: [['S', 'white']],
    map: [
      '. . L . . . .', //
      'n . o . . . .',
      'n . o m . # .',
      'm m . . . . .',
      'M o . . m . .',
      '. m n o . . .',
      '. . . # m . .',
    ],
    par: 6,
    solution: [1, 2, 3, 4, 7, 8],
  },
  {
    id: 'mc-boss-1',
    title: '거울 공장장',
    tip: '거울 열한 개! 거울 반사의 마지막 시험이에요.',
    lasers: [['W', 'white']],
    boss: true,
    map: [
      'N . . . . m o', //
      '. . M m n n .',
      'm . . m n . .',
      'n o . o o . L',
      'm . n . . . .',
      '. . . . . . .',
      '# . . . n . #',
    ],
    par: 8,
    solution: [3, 4, 5, 7, 8, 9, 10, 11],
  },
];
const CH2: MachineStageDef[] = [
  {
    id: 'mc-half-mirror',
    title: '반투명 거울',
    tip: '반투명 거울은 빛을 반은 꺾고 반은 그대로 보내요.',
    lasers: [['E', 'white']],
    map: [
      '. . . . . .', //
      '. . . # . .',
      '. . n . s .',
      'L . . o n .',
      '. . o . . .',
      '. . . n . .',
    ],
    par: 3,
    solution: [0, 1, 2],
  },
  {
    id: 'mc-split-three',
    title: '세 갈래 빛',
    tip: '나뉜 빛으로 전구 세 개를 켜요.',
    lasers: [['E', 'white']],
    map: [
      '. . . . n .', //
      'L . o s o .',
      '. . . m m .',
      '. . . . m o',
      '. . . . . .',
      '# . . . . .',
    ],
    par: 4,
    solution: [1, 2, 3, 4],
  },
  {
    id: 'mc-sensor-door',
    title: '빛 센서 문',
    tip: '센서 눈에 빛이 닿으면 노란 셔터 문이 열려요.',
    lasers: [['S', 'white']],
    map: [
      '# . . . . L', //
      '. . . . . o',
      '. . . m x n',
      '. . . D o .',
      '. . . m n .',
      '. . . . . .',
    ],
    par: 3,
    solution: [1, 2, 3],
  },
  {
    id: 'mc-split-door',
    title: '나누고 열고',
    tip: '반투명 거울과 센서 문을 함께 써요.',
    lasers: [['W', 'white']],
    map: [
      '. m . . . . .', //
      '. . . n o . .',
      '. # . . . # .',
      '. . n D . x .',
      '. . . n s o L',
      '. . . . o . .',
      '. . . . m n .',
    ],
    par: 3,
    solution: [1, 5, 6],
  },
  {
    id: 'mc-bonus-2',
    title: '로봇 구출 작전 2',
    tip: '배터리가 떨어지기 전에 전구를 모두 켜요!',
    lasers: [['E', 'white']],
    battery: 6,
    map: [
      'L . . o o n', //
      'n . . m . .',
      'm . . . . n',
      '. . . . . .',
      '. m . s o .',
      '. . . . # .',
    ],
    par: 5,
    solution: [1, 2, 3, 4, 6],
  },
  {
    id: 'mc-door-maze',
    title: '셔터 미로',
    tip: '문 너머 전구까지 빛을 보내요.',
    lasers: [['S', 'white']],
    map: [
      'n . . o L . .', //
      '. . . . . . .',
      '. . m m o D m',
      '. . . . o . .',
      '. . . . s x .',
      '. . . # m . n',
      '# . . m . . .',
    ],
    par: 5,
    solution: [2, 3, 4, 5, 6],
  },
  {
    id: 'mc-two-halves',
    title: '반투명 거울 두 개',
    tip: '빛이 여러 갈래로 나뉠 수 있어요.',
    lasers: [['S', 'white']],
    map: [
      'L . . . . . .', //
      'o m # . m . .',
      'o . . . . . .',
      'o . . . . . m',
      '. t m . . n o',
      '. s . . . n .',
      'n . m . # . .',
    ],
    par: 5,
    solution: [3, 4, 5, 6, 7],
  },
  {
    id: 'mc-two-doors',
    title: '문 두 개',
    tip: '센서 하나가 문 두 개를 동시에 열어요.',
    lasers: [['E', 'white']],
    map: [
      '. . . . D . #', //
      'L . o o o s D',
      '. . n o n n .',
      '. . m x n . .',
      '. . # . # . n',
      '. . . # # . .',
      '. m n . . . .',
    ],
    par: 6,
    solution: [0, 1, 2, 3, 4, 5],
  },
  {
    id: 'mc-light-maze',
    title: '빛의 미로',
    tip: '반투명 거울 두 개와 센서 문. 빛이 어디까지 가는지 잘 봐요.',
    lasers: [['N', 'white']],
    map: [
      'm o m s . n .', //
      '. . D . . . .',
      '. n x o o o .',
      '. t . m m . .',
      '. . m n . . #',
      '. . . . . . .',
      'm L . # . . .',
    ],
    par: 6,
    solution: [1, 4, 5, 6, 8, 9],
  },
  {
    id: 'mc-boss-2',
    title: '빛의 공장장',
    tip: '전구 다섯 개, 문 두 개. 빛 나누기 마지막 시험!',
    lasers: [['E', 'white']],
    boss: true,
    map: [
      '. # . # . . .', //
      'm . D # o . n',
      '. . o . . . m',
      '. . t o o o m',
      '# # x n . m D',
      'L . n m n . .',
      's . . . . m n',
    ],
    par: 9,
    solution: [3, 4, 5, 6, 7, 8, 9, 11, 12],
  },
];
const CH3: MachineStageDef[] = [
  {
    id: 'mc-red-blue',
    title: '빨강과 파랑',
    tip: '빨강 전구는 빨강 빛, 파랑 전구는 파랑 빛으로만 켜져요.',
    lasers: [['S', 'red'], ['N', 'blue']],
    map: [
      '. L . . . .', //
      '. . u . . .',
      '. m . n . .',
      '. . . . . .',
      '# . . m r .',
      '. . L . . .',
    ],
    par: 2,
    solution: [0, 2],
  },
  {
    id: 'mc-filters',
    title: '색 필터',
    tip: '색 필터는 같은 색 빛만 지나가게 해요.',
    lasers: [['S', 'red'], ['S', 'blue']],
    map: [
      '. L . L . .', //
      '. . n n . .',
      '. R U . . .',
      '. . n m . .',
      '. . . . . .',
      '. r . u # .',
    ],
    par: 3,
    solution: [0, 1, 3],
  },
  {
    id: 'mc-purple',
    title: '보라 전구',
    tip: '보라 전구는 빨강과 파랑 빛을 둘 다 받아야 켜져요.',
    lasers: [['S', 'blue'], ['S', 'red']],
    map: [
      '. L . L .', //
      '. . n . .',
      '. . . . .',
      'n n . n .',
      'm p . . .',
    ],
    par: 4,
    solution: [1, 2, 3, 4],
  },
  {
    id: 'mc-three-bulbs',
    title: '세 가지 전구',
    tip: '빨강, 파랑, 보라 전구를 모두 켜요.',
    lasers: [['W', 'blue'], ['N', 'red']],
    map: [
      '. . . . . . .', //
      'n m . . n . .',
      'm . . m . . .',
      '. m . . . r .',
      '. . . . . . .',
      '# u . p . . L',
      '. # . L . . .',
    ],
    par: 5,
    solution: [0, 1, 3, 4, 5],
  },
  {
    id: 'mc-bonus-3',
    title: '로봇 구출 작전 3',
    tip: '배터리가 떨어지기 전에 전구를 모두 켜요!',
    lasers: [['E', 'red'], ['N', 'blue']],
    battery: 6,
    map: [
      '. . n . m #', //
      'L . . . r .',
      '. . . . m m',
      '. . . . . .',
      '. . o m . .',
      '. . L u . n',
    ],
    par: 5,
    solution: [0, 1, 2, 3, 5],
  },
  {
    id: 'mc-color-split',
    title: '색깔 나누기',
    tip: '반투명 거울로 색깔 빛을 나눠요.',
    lasers: [['E', 'red'], ['N', 'blue']],
    map: [
      '. . . # . . .', //
      '. . n . m n u',
      'L r . . n t .',
      '. n . . . # .',
      '. . m . p . .',
      '. . . . . . #',
      '. . . . L . .',
    ],
    par: 6,
    solution: [0, 1, 2, 3, 4, 6],
  },
  {
    id: 'mc-filter-maze',
    title: '필터 미로',
    tip: '빨강 필터를 잘 이용해요. 다른 색은 막혀요.',
    lasers: [['S', 'red'], ['E', 'blue']],
    map: [
      'm . . . L . .', //
      'L . . u p # .',
      '. . . . . . .',
      '. # . n r m .',
      '. . n R . n .',
      '. # o m n . .',
      '. . . . . # .',
    ],
    par: 6,
    solution: [1, 2, 3, 4, 5, 6],
  },
  {
    id: 'mc-double-purple',
    title: '보라 두 개',
    tip: '보라 전구 두 개! 빨강과 파랑을 두 곳에서 만나게 해요.',
    lasers: [['S', 'blue'], ['N', 'red']],
    map: [
      'n . p . L . .', //
      '. . m m . . .',
      '. . m . . . .',
      '. . . m p s .',
      '. m # . u . #',
      'm . . . n . .',
      '. . . . . L .',
    ],
    par: 7,
    solution: [0, 1, 2, 4, 5, 7, 8],
  },
  {
    id: 'mc-color-door',
    title: '색깔 문',
    tip: '센서 문 너머에 색깔 전구가 있어요.',
    lasers: [['S', 'red'], ['N', 'blue']],
    map: [
      'm . . L u m .', //
      '# n . r x n #',
      '. s m . . . #',
      '. . m p . m .',
      '. . . D . . .',
      '. # o n . . .',
      '. . . . . L .',
    ],
    par: 8,
    solution: [1, 2, 3, 4, 5, 6, 7, 8],
  },
  {
    id: 'mc-final-boss',
    title: '로봇 공장 정복',
    tip: '빨강, 파랑, 노랑 레이저 세 개! 로봇 공장 마지막 보스예요.',
    lasers: [['W', 'white'], ['N', 'red'], ['N', 'blue']],
    boss: true,
    map: [
      'm r n m n p .', //
      '. . . D . . .',
      'n n . . . t x',
      'm . . t . u L',
      '. m . n . . .',
      '. . . # . o .',
      '# . L . . L n',
    ],
    par: 9,
    solution: [1, 2, 4, 5, 6, 7, 8, 9, 10],
  },
];

const CHAPTER_DEFS: { title: string; blurb: string; color: string; stages: MachineStageDef[] }[] = [
  { title: '거울 반사', blurb: '거울을 톡 눌러 돌려요. 레이저로 전구를 모두 켜요.', color: '#E3AE1F', stages: CH1 },
  { title: '빛 나누기', blurb: '반투명 거울은 빛을 둘로 나누고, 센서에 빛이 닿으면 문이 열려요.', color: '#2FA3B8', stages: CH2 },
  { title: '색깔 레이저', blurb: '빨강 전구는 빨강 빛, 파랑 전구는 파랑 빛, 보라 전구는 둘 다!', color: '#B57CFF', stages: CH3 },
];

export const MACHINE_STAGE_DEFS: MachineStageDef[] = CHAPTER_DEFS.flatMap((c) => c.stages);

export const MACHINE_CHAPTERS: Chapter[] = CHAPTER_DEFS.reduce<Chapter[]>((acc, c, i) => {
  const start = acc.length ? acc[acc.length - 1].start + acc[acc.length - 1].count : 0;
  return [...acc, { number: i + 1, title: c.title, blurb: c.blurb, color: c.color, start, count: c.stages.length }];
}, []).filter((c) => c.count > 0);

export const MACHINE_STAGES: MachineStage[] = MACHINE_STAGE_DEFS.map((def, i) => {
  const stage = parseMachineStage(def, i + 1);
  const ch = MACHINE_CHAPTERS.find((c) => i >= c.start && i < c.start + c.count)!;
  return { ...stage, label: `STAGE ${ch.number}-${i - ch.start + 1}` };
});
