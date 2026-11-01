import type { Chapter } from '../stages/stages';
import { type ClockStage, type ClockStageDef, parseClockStage } from './model';

/**
 * Clock tower world: three chapters of ten. In each chapter stage 5 is a bonus ("자정의 종": a
 * fixed number of ticks, no undo) and stage 10 is the boss. Ids start with `ck-`. Searched with
 * scripts/clock-search.ts (specs in scripts/clock-specs.ts) and picked by hand; every stage's par
 * and answer are checked by tests. Answers are U R D L steps and `.` rests.
 */

const CH1: ClockStageDef[] = [
  // par 4, score 9.9 (target 6), bits 4.2, states 18, rests 0, traps 0%, shortest answers 4
  {
    id: 'ck-first-steps',
    title: '시계탑 생쥐',
    tip: '화살표를 누르거나 화면을 쓱 밀어 생쥐를 문까지 데려가요. 한 칸 갈 때마다 시계가 똑딱!',
    map: [
      '. . . . #', //
      '. . # . S',
      '. . . . .',
      '# # . . .',
      '. . # E .',
    ],
    par: 4,
    solution: 'DDDL',
  },
  // par 4, score 11.0 (target 8), bits 3.2, states 39, rests 1, traps 0%, shortest answers 2
  {
    id: 'ck-tick-tock',
    title: '똑딱 블록',
    tip: '빨강 블록과 파랑 블록이 똑딱할 때마다 번갈아 올라와요.',
    map: [
      '# . . . .', //
      '. . . . .',
      'r E . . .',
      'b . r # .',
      'S # . # .',
    ],
    par: 4,
    solution: '.UUR',
  },
  // par 5, score 11.0 (target 11), bits 3.8, states 40, rests 1, traps 0%, shortest answers 12
  {
    id: 'ck-rest',
    title: '잠깐 쉬어요',
    tip: '길이 막혔으면 ⏳ 쉬기! 한 박자 기다리면 블록이 내려가요.',
    map: [
      '# . r E b', //
      '. . r b .',
      '. . . . .',
      '# . . . S',
      '# . . . .',
    ],
    par: 5,
    solution: 'UU.UL',
  },
  // par 6, score 13.6 (target 14), bits 4.8, states 36, rests 1, traps 0%, shortest answers 4
  {
    id: 'ck-red-blue',
    title: '빨강 파랑',
    tip: '지금 올라와 있는 블록은 다음 똑딱에 내려가요.',
    map: [
      '. . . # .', //
      'S # r E .',
      'b # r . .',
      '. b . . .',
      '. # . . #',
    ],
    par: 6,
    solution: 'URR.DR',
  },
  // par 6, score 14.4 (target 14), bits 5.3, states 38, rests 1, traps 0%, shortest answers 4
  {
    id: 'ck-midnight-1',
    title: '자정의 종 1',
    tip: '종이 울리기 전에 문까지! 되돌리기는 없어요.',
    map: [
      '. . . # .', //
      'S # r b .',
      '# # E . b',
      '. . . . b',
      '. . . . .',
    ],
    par: 6,
    solution: 'URR.DD',
    limit: 9,
  },
  // par 7, score 16.8 (target 17), bits 7.2, states 53, rests 1, traps 0%, shortest answers 11
  {
    id: 'ck-block-maze',
    title: '블록 미로',
    tip: '블록이 번갈아 길을 열어 줘요. 박자를 맞춰 가요.',
    map: [
      '. . . . r .', //
      'b # . # r .',
      '# # . . . .',
      'S . . # . .',
      'r . # E . #',
      '. . . b . .',
    ],
    par: 7,
    solution: 'RDDR.RU',
  },
  // par 8, score 19.1 (target 20), bits 7.9, states 52, rests 1, traps 0%, shortest answers 5
  {
    id: 'ck-zigzag',
    title: '지그재그 계단',
    tip: '쉬는 것도 한 박자예요. 언제 쉬어야 할까요?',
    map: [
      'b . . . . #', //
      '. b # . . #',
      '. # b b . .',
      '. S # . . .',
      '. # . . . .',
      '. . b r E r',
    ],
    par: 8,
    solution: 'LDDR.RRR',
  },
  // par 9, score 23.5 (target 23), bits 10.8, states 53, rests 1, traps 0%, shortest answers 4
  {
    id: 'ck-double-rest',
    title: '두 번 쉬기',
    tip: '올라올 블록 위에서는 쉴 수 없어요. 미리 비켜요!',
    map: [
      'S # b . E #', //
      'b # . . . .',
      'r . . . b r',
      'r . . . b #',
      '. . . . . .',
      '. . . b # r',
    ],
    par: 9,
    solution: '.DDRRURUR',
  },
  // par 10, score 27.4 (target 26), bits 12.5, states 54, rests 1, traps 0%, shortest answers 1
  {
    id: 'ck-stairs',
    title: '시계탑 계단',
    tip: '블록 계단을 박자에 맞춰 올라가요.',
    map: [
      '. . . . # S', //
      '. . . . r b',
      '. r . r b #',
      '. . . b r .',
      '. # # b r .',
      '. . . E . b',
    ],
    par: 10,
    solution: '.DLDDRDDLL',
  },
  // par 12, score 35.2 (target 31), bits 17.4, states 69, rests 2, traps 0%, shortest answers 2
  {
    id: 'ck-boss-1',
    title: '첫 번째 종탑',
    tip: '챕터 1 보스! 똑딱 블록 사이로 문까지 가요.',
    map: [
      '# b . # b . r', //
      '# . . . . # .',
      '. # . . # . S',
      '. r . . . # b',
      '. . . . . . b',
      '. . . E r # r',
      'r . . b b . #',
    ],
    par: 12,
    solution: 'U.UL.LDLDDDD',
  },
];

const CH2: ClockStageDef[] = [
  // par 4, score 11.1 (target 8), bits 3.2, states 57, rests 1, traps 0%, shortest answers 3
  {
    id: 'ck-clock-hand',
    title: '시계 바늘',
    tip: '시계 바늘은 똑딱할 때마다 시계 방향으로 한 칸 돌아요. 바늘이 지나갈 자리는 피해요!',
    map: [
      '. . . . #', //
      '. . . . .',
      'S . # . #',
      '. H . # .',
      '. E . . .',
    ],
    hands: ['1,3 W 1'],
    par: 4,
    solution: 'DD.R',
  },
  // par 5, score 11.1 (target 11), bits 3.2, states 37, rests 1, traps 0%, shortest answers 4
  {
    id: 'ck-long-hand',
    title: '긴 바늘',
    tip: '긴 바늘은 두 칸을 쓸고 지나가요. 흐린 그림자가 다음 바늘 자리예요.',
    map: [
      '. . . . .', //
      'E H S # .',
      '. . # . .',
      '. . . # #',
      '. . . . .',
    ],
    hands: ['1,1 W 2'],
    par: 5,
    solution: 'ULL.D',
  },
  // par 6, score 14.1 (target 14), bits 4.8, states 83, rests 1, traps 0%, shortest answers 7
  {
    id: 'ck-wait-hand',
    title: '바늘 기다리기',
    tip: '바늘이 지나갈 때까지 쉬었다 가요.',
    map: [
      '. . . S .', //
      '. . . H .',
      '. . . # .',
      '. . . E .',
      '. . . # .',
    ],
    hands: ['3,1 E 2'],
    par: 6,
    solution: 'RDDD.L',
  },
  // par 6, score 17.1 (target 17), bits 6.6, states 111, rests 1, traps 0%, shortest answers 4
  {
    id: 'ck-two-hands',
    title: '바늘 두 개',
    tip: '두 바늘이 함께 돌아요. 둘 다 피해서!',
    map: [
      '# . . . . #', //
      '# . . . . .',
      '. . . . . .',
      '. . S . . .',
      '. . H H . .',
      '# . . E . .',
    ],
    hands: ['2,4 S 2', '3,4 E 1'],
    par: 6,
    solution: 'LDD.RR',
  },
  // par 6, score 16.0 (target 16), bits 6.3, states 81, rests 1, traps 0%, shortest answers 7
  {
    id: 'ck-midnight-2',
    title: '자정의 종 2',
    tip: '바늘을 피해 종이 울리기 전에 문까지! 되돌리기는 없어요.',
    map: [
      '. . . . #', //
      '. . . . #',
      '. . . . .',
      '. S H . E',
      '. . . . .',
    ],
    hands: ['2,3 N 2'],
    par: 6,
    solution: 'URRR.D',
    limit: 9,
  },
  // par 7, score 18.8 (target 20), bits 7.2, states 108, rests 1, traps 0%, shortest answers 3
  {
    id: 'ck-hand-blocks',
    title: '바늘과 블록',
    tip: '바늘도 돌고 블록도 올라와요. 박자를 잘 세어 봐요.',
    map: [
      'E # S r . .', //
      '. . b H . b',
      'r # # . . .',
      '# . . . . .',
      '. . . . . #',
      '. . . . . .',
    ],
    hands: ['3,1 N 2'],
    par: 7,
    solution: 'RL.DLLU',
  },
  // par 8, score 23.0 (target 23), bits 10.2, states 103, rests 1, traps 0%, shortest answers 3
  {
    id: 'ck-gears',
    title: '톱니바퀴 방',
    tip: '바늘 두 개가 길을 번갈아 막아요.',
    map: [
      '. . # # S .', //
      '. . H . # .',
      '. . . E H .',
      '. # . . . .',
      '. . . . . .',
      '. . # . . .',
    ],
    hands: ['4,2 S 2', '2,1 E 2'],
    par: 8,
    solution: 'RD.DDLLU',
  },
  // par 9, score 25.9 (target 26), bits 11.8, states 99, rests 1, traps 0%, shortest answers 2
  {
    id: 'ck-sweep',
    title: '쓱싹 바늘',
    tip: '바늘이 쓸고 간 바로 뒤를 따라가요.',
    map: [
      '. . . b . #', //
      '. r . . r .',
      '# . . H . .',
      '. S H E . .',
      '. r # . . #',
      '. r . . . .',
    ],
    hands: ['2,3 S 2', '3,2 N 1'],
    par: 9,
    solution: 'DLD.RRRUU',
  },
  // par 10, score 29.1 (target 29), bits 13.8, states 100, rests 1, traps 2%, shortest answers 2
  {
    id: 'ck-clockwork',
    title: '태엽 장치',
    tip: '블록과 바늘이 맞물려 돌아가요.',
    map: [
      '. . # . . b', //
      '# . . . b .',
      '. . S H . .',
      '. . b . H .',
      '. . . r . .',
      '. r . # E .',
    ],
    hands: ['4,3 E 2', '3,2 S 2'],
    par: 10,
    solution: 'U.RRRDDDDL',
  },
  // par 12, score 38.5 (target 34), bits 19.7, states 136, rests 1, traps 0%, shortest answers 1
  {
    id: 'ck-boss-2',
    title: '큰 시계 방',
    tip: '챕터 2 보스! 세 칸짜리 큰 바늘을 조심해요.',
    map: [
      '. . . . . S .', //
      '. . . . # b .',
      '. # . . . b r',
      '. . # . r . .',
      '. b E H . H .',
      '. # . . . . .',
      '. # . # . . #',
    ],
    hands: ['5,4 N 3', '3,4 E 2'],
    par: 12,
    solution: 'RDDD.DDLLLLU',
  },
];

const CH3: ClockStageDef[] = [
  // par 4, score 14.6 (target 14), bits 5.8, states 36, rests 1, traps 0%, shortest answers 1
  {
    id: 'ck-lever',
    title: '거꾸로 레버',
    tip: '레버를 밟으면 시계 바늘이 반대로 돌아요!',
    map: [
      '. # . . .', //
      'S # . . .',
      '. H . . .',
      'L E . . #',
      '# . . . .',
    ],
    hands: ['1,2 S 2'],
    par: 4,
    solution: '.DDR',
  },
  // par 5, score 18.8 (target 17), bits 7.8, states 146, rests 1, traps 0%, shortest answers 2
  {
    id: 'ck-lever-back',
    title: '되돌리는 바늘',
    tip: '바늘을 거꾸로 돌려서 길을 열어요.',
    map: [
      '. . . # .', //
      '. E H . .',
      'L # . . .',
      '. S . . .',
      '# . . . #',
    ],
    hands: ['2,1 W 2'],
    par: 5,
    solution: 'L.UUR',
  },
  // par 7, score 20.4 (target 20), bits 8.2, states 234, rests 1, traps 0%, shortest answers 5
  {
    id: 'ck-two-levers',
    title: '레버 두 개',
    tip: '레버를 다시 밟으면 바늘이 원래대로 돌아요.',
    map: [
      '. . L . . #', //
      '. . E H . .',
      '. L # . . S',
      '# . . . . .',
      '. . . . . .',
      '. . . # . .',
    ],
    hands: ['3,1 N 2'],
    par: 7,
    solution: 'LUU.LLD',
  },
  // par 7, score 22.8 (target 23), bits 10.2, states 200, rests 1, traps 0%, shortest answers 4
  {
    id: 'ck-lever-rest',
    title: '레버와 쉬기',
    tip: '레버를 밟고, 쉬고, 다시 가요.',
    map: [
      '. . # . . .', //
      '. E L # . #',
      '. H . . . .',
      '# . . . . .',
      '. # . . . .',
      '. S . . . .',
    ],
    hands: ['1,2 E 2'],
    par: 7,
    solution: 'RUU.UUL',
  },
  // par 7, score 21.8 (target 21), bits 9.0, states 224, rests 1, traps 0%, shortest answers 3
  {
    id: 'ck-midnight-3',
    title: '자정의 종 3',
    tip: '레버를 잘 쓰면 종이 울리기 전에 닿을 수 있어요. 되돌리기는 없어요!',
    map: [
      '# . . . . .', //
      '. . . . . .',
      'S . H # . .',
      '. # . E . #',
      '. L . # . .',
      '. . . . . .',
    ],
    hands: ['2,2 E 2'],
    par: 7,
    solution: 'DD.RRUR',
    limit: 10,
  },
  // par 8, score 25.4 (target 25), bits 12.1, states 232, rests 0, traps 0%, shortest answers 3
  {
    id: 'ck-lever-blocks',
    title: '레버와 블록',
    tip: '블록은 레버와 상관없이 번갈아 올라와요.',
    map: [
      '. E . r . .', //
      '. . . . . .',
      'r . . r . #',
      '. # H . # .',
      '. . L S . .',
      '. . . . . .',
    ],
    hands: ['2,3 W 2'],
    par: 8,
    solution: 'LLLUUUUR',
  },
  // par 11, score 28.1 (target 28), bits 12.2, states 206, rests 1, traps 0%, shortest answers 4
  {
    id: 'ck-two-hands-lever',
    title: '두 바늘 레버',
    tip: '레버 하나가 바늘 두 개를 모두 거꾸로 돌려요.',
    map: [
      '. . . # S .', //
      '. E . . H .',
      '. . H L # .',
      '# # . . . .',
      '. . . . . .',
      '. . . . . #',
    ],
    hands: ['4,1 S 2', '2,2 W 2'],
    par: 11,
    solution: 'RDDDLL.UULL',
  },
  // par 10, score 31.7 (target 31), bits 16.2, states 148, rests 0, traps 0%, shortest answers 2
  {
    id: 'ck-lever-maze',
    title: '레버 미로',
    tip: '레버 두 개, 바늘 두 개, 블록까지! 순서를 잘 정해요.',
    map: [
      '. r . L # b', //
      '. . . # E .',
      'b H # . b .',
      '# . S . H .',
      '. . . . # L',
      '. . . . . .',
    ],
    hands: ['1,2 S 2', '4,3 S 1'],
    par: 10,
    solution: 'DRDRRUUUUL',
  },
  // par 12, score 36.4 (target 34), bits 17.7, states 296, rests 1, traps 0%, shortest answers 2
  {
    id: 'ck-big-clock',
    title: '시계탑 꼭대기',
    tip: '큰 바늘과 레버 두 개. 거의 다 왔어요!',
    map: [
      '. . . . . . .', //
      '. . r . . . .',
      '# . # E # b .',
      '. . . H . . r',
      '. . L . . . #',
      '. . . S H . .',
      '. . b . L . .',
    ],
    hands: ['4,5 S 3', '3,3 E 2'],
    par: 12,
    solution: 'DRRUUU.UULLD',
  },
  // par 14, score 44.2 (target 40), bits 22.4, states 266, rests 2, traps 1%, shortest answers 2
  {
    id: 'ck-final-boss',
    title: '자정의 시계탑',
    tip: '마지막 보스! 블록, 바늘, 레버를 모두 써서 문까지 가요.',
    map: [
      '. . . . . . .', //
      '. . . b . E #',
      '# . . . H # .',
      '. . L . . . .',
      '. H H b . . .',
      '. # b S # . .',
      '. # . L . b .',
    ],
    hands: ['2,4 W 3', '1,4 E 2', '4,2 N 2'],
    par: 14,
    solution: '.DRRU.UULLUURR',
  },
];

const CHAPTER_DEFS: { title: string; blurb: string; color: string; stages: ClockStageDef[] }[] = [
  { title: '똑딱 블록', blurb: '빨강·파랑 블록이 똑딱할 때마다 번갈아 올라와요.', color: '#C27C2C', stages: CH1 },
  { title: '시계 바늘', blurb: '바늘이 똑딱할 때마다 시계 방향으로 돌아요.', color: '#3F7FBF', stages: CH2 },
  { title: '거꾸로 레버', blurb: '레버를 밟으면 바늘이 반대로 돌아요.', color: '#9B4FB8', stages: CH3 },
];

export const CLOCK_STAGE_DEFS: ClockStageDef[] = CHAPTER_DEFS.flatMap((c) => c.stages);

export const CLOCK_CHAPTERS: Chapter[] = CHAPTER_DEFS.reduce<Chapter[]>((acc, c, i) => {
  const start = acc.length ? acc[acc.length - 1].start + acc[acc.length - 1].count : 0;
  return [...acc, { number: i + 1, title: c.title, blurb: c.blurb, color: c.color, start, count: c.stages.length }];
}, []);

export const CLOCK_STAGES: ClockStage[] = CLOCK_STAGE_DEFS.map((def, i) => {
  const stage = parseClockStage(def, i + 1);
  const ch = CLOCK_CHAPTERS.find((c) => i >= c.start && i < c.start + c.count)!;
  return { ...stage, label: `STAGE ${ch.number}-${i - ch.start + 1}`, boss: i === ch.start + ch.count - 1 };
});
