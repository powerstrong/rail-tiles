import type { Chapter } from '../stages/stages';
import { type VolcanoStage, type VolcanoStageDef, parseVolcanoStage } from './model';

/**
 * Volcano world: three chapters of ten. In each chapter stage 5 is a bonus race (the lava is
 * already flowing) and stage 10 is the boss. Ids start with `v-`. Solutions are "x,y" cells.
 */
const CH1: VolcanoStageDef[] = [
  {
    id: 'v-first-stone',
    title: '첫 번째 돌',
    tip: '풀밭을 톡 누르면 돌이 놓여요. 돌을 놓고 분출! 버튼을 눌러요. 용암이 집에 닿으면 안 돼요!',
    map: [
      '. R . . .', //
      '. . . . .',
      '. H . R .',
      '. . . R .',
      'R R . V R',
    ],
    par: 1,
    solution: ['2,3'],
  },
  {
    id: 'v-two-stones',
    title: '돌 두 개',
    tip: '용암은 위, 아래, 왼쪽, 오른쪽으로 흘러요. 바위도 용암을 막아 줘요.',
    map: [
      '. . . R .', //
      '. . . . .',
      '. R . . .',
      '. . H . .',
      '. . R R V',
    ],
    par: 2,
    solution: ['4,2', '3,3'],
  },
  {
    id: 'v-seaside',
    title: '바닷가 마을',
    tip: '파란 바다도 용암을 막아 줘요. 좁은 길목을 찾아요!',
    map: [
      '. . H . . .', //
      '. H . . V .',
      'R . . . . .',
      'R . . . . .',
      '~ ~ ~ ~ ~ .',
    ],
    par: 3,
    solution: ['3,0', '2,1', '1,2'],
  },
  {
    id: 'v-two-houses',
    title: '두 집 지키기',
    tip: '집이 두 채! 돌을 아껴서 둘 다 지켜요.',
    map: [
      '. ~ ~ ~ ~ H', //
      '. . . . . .',
      '. . . . . R',
      '. . . R . .',
      '. . . . . R',
      'V . . H . .',
    ],
    par: 3,
    solution: ['0,3', '1,4', '2,5'],
  },
  {
    id: 'v-escape-1',
    title: '마을 대피 작전 1',
    tip: '용암이 벌써 흐르고 있어요! 돌을 놓을 때마다 용암이 한 칸씩 번져요.',
    race: true,
    map: [
      'V . . . . R', //
      '. . . . . H',
      '. . . . . .',
      '. . . R . .',
      '. . H R R .',
    ],
    par: 4,
    solution: ['4,1', '3,2', '2,3', '1,4'],
  },
  {
    id: 'v-narrow-pass',
    title: '좁은 길목',
    tip: '바위 사이 좁은 곳을 막으면 돌을 아낄 수 있어요.',
    map: [
      '. . . R . .', //
      '. . . . R .',
      '. . V . . H',
      'H . . . . .',
      '. R . . . .',
      'R . . R R .',
    ],
    par: 4,
    solution: ['0,2', '4,2', '1,3', '5,3'],
  },
  {
    id: 'v-hidden-pass',
    title: '숨은 길목',
    tip: '용암이 어디로 흐를지 끝까지 따라가 봐요.',
    map: [
      '. . . . . R', //
      '. . . . . R',
      '. . . . V .',
      '. . H . . .',
      'R . . . . H',
      'R ~ ~ ~ ~ .',
    ],
    par: 5,
    solution: ['2,2', '1,3', '3,3', '5,3', '4,4'],
  },
  {
    id: 'v-twin-craters',
    title: '쌍둥이 화산',
    tip: '화산이 두 개! 양쪽에서 용암이 흘러나와요.',
    map: [
      '. R V . . . .', //
      '. . R . . . .',
      '. R . . . H R',
      'R . . V . . H',
      '. . . . . . R',
      '. . . . H . R',
    ],
    par: 5,
    solution: ['5,1', '4,2', '5,3', '4,4', '3,5'],
  },
  {
    id: 'v-big-village',
    title: '큰 마을',
    tip: '화산 두 개, 집 세 채. 바다와 바위를 잘 이용해서 돌을 아껴요.',
    map: [
      'V R R . R . .', //
      '. . . . R H .',
      '. . . . . . ~',
      '. H . . . . ~',
      '. . . V . . ~',
      '. . . . R H R',
    ],
    par: 6,
    solution: ['1,2', '5,2', '0,3', '2,3', '1,4', '5,4'],
  },
  {
    id: 'v-boss-1',
    title: '불의 산',
    tip: '화산 두 개, 집 네 채! 마을 지키기 마지막 시험이에요.',
    boss: true,
    map: [
      '. H . . . R .', //
      'H . . . . . R',
      '. . . . . . .',
      '. . V . V R .',
      '. . . . . . .',
      'H . . R . . H',
      '~ ~ ~ ~ . . R',
    ],
    par: 7,
    solution: ['2,0', '1,1', '0,2', '0,4', '6,4', '1,5', '5,5'],
  },
];
const CH2: VolcanoStageDef[] = [
  {
    id: 'v-dragon-egg',
    title: '용의 알',
    tip: '용의 알은 따뜻해야 깨어나요. 용암이 알까지 가게 하고, 집은 지켜요!',
    map: [
      '. . . . .', //
      '. R . V .',
      '. . . . .',
      'R . E R .',
      '. H . . R',
    ],
    par: 2,
    solution: ['1,3', '2,4'],
  },
  {
    id: 'v-warm-egg',
    title: '따뜻한 알',
    tip: '알로 가는 길은 열어 두고, 집으로 가는 길만 막아요.',
    map: [
      '. . E . . .', //
      '. . . . R .',
      'H . . R . .',
      '. . . R . .',
      '. H R . V .',
    ],
    par: 2,
    solution: ['1,0', '2,1'],
  },
  {
    id: 'v-two-eggs',
    title: '알 두 개',
    tip: '알 두 개를 모두 깨워요.',
    map: [
      '. . . . . .', //
      '. . . . . V',
      '. E E R . .',
      '. . . R R .',
      '. . . R . H',
      '. . H R . .',
    ],
    par: 3,
    solution: ['5,3', '2,4', '1,5'],
  },
  {
    id: 'v-egg-seaside',
    title: '바닷가 알',
    tip: '바다 옆 알도 잊지 마세요.',
    map: [
      '. . H . . .', //
      '. E . R . H',
      '. E . . . .',
      '~ . . . . R',
      '~ . R . R .',
      '~ . . . V R',
    ],
    par: 3,
    solution: ['1,0', '2,1', '4,2'],
  },
  {
    id: 'v-escape-2',
    title: '마을 대피 작전 2',
    tip: '용암이 벌써 흐르고 있어요! 돌을 놓을 때마다 용암이 한 칸씩 번져요.',
    race: true,
    map: [
      '. H . R R .', //
      '. . . . . .',
      '. R H . . .',
      '. R . . . .',
      '. . . . . V',
    ],
    par: 4,
    solution: ['4,3', '3,4', '4,2', '4,1'],
  },
  {
    id: 'v-dragon-nest',
    title: '용의 둥지',
    tip: '집 세 채, 알 두 개. 집은 지키고 알은 따뜻하게!',
    map: [
      'H . . . . . .', //
      '. E . . H . .',
      '. . R R . . .',
      'R . . E . . .',
      '. V . R R . H',
      '. . . . R R .',
    ],
    par: 4,
    solution: ['1,0', '0,1', '2,1', '4,3'],
  },
  {
    id: 'v-egg-path',
    title: '알로 가는 길',
    tip: '돌을 잘못 놓으면 알이 차가워져요.',
    map: [
      '. R R E . . H', //
      '. . R . . . R',
      'H . . . E . .',
      'R . . . . . .',
      '. . H . . R .',
      '. . . . . . V',
      'R R . . . R .',
    ],
    par: 4,
    solution: ['5,0', '3,2', '4,3', '4,5'],
  },
  {
    id: 'v-twin-nest',
    title: '쌍둥이 화산 둥지',
    tip: '화산 두 개로 알을 데워요.',
    map: [
      '. . . R V . .', //
      '. H H . . . .',
      '. . . . R . .',
      'R R E . R . .',
      '. . . . . . H',
      '. V . . . . .',
      'R . R E . . .',
    ],
    par: 5,
    solution: ['3,1', '2,2', '6,3', '5,4', '6,5'],
  },
  {
    id: 'v-three-eggs',
    title: '알 세 개',
    tip: '알 세 개, 집 세 채!',
    map: [
      'E . H . R . R', //
      '. . . H . . .',
      '. . . . . E .',
      '. . . . . . .',
      '. E R . V . .',
      '. R . . . . H',
      '~ ~ ~ . R R R',
    ],
    par: 6,
    solution: ['1,0', '2,1', '4,1', '3,2', '6,4', '5,5'],
  },
  {
    id: 'v-boss-2',
    title: '용의 계곡',
    tip: '화산 두 개, 알 세 개, 집 네 채! 용의 알 마지막 시험이에요.',
    boss: true,
    map: [
      'R . . H . . V', //
      '. . . . . . .',
      '. . E . . . .',
      '. H . R . . .',
      '. . R R R . E',
      '. R H . . E R',
      '. . . . H R V',
    ],
    par: 6,
    solution: ['4,0', '2,1', '3,1', '1,2', '2,3', '4,5'],
  },
];
const CH3: VolcanoStageDef[] = [
  {
    id: 'v-small-crater',
    title: '작은 화산',
    tip: '숫자는 용암이 흐를 수 있는 칸 수예요. 길을 빙 돌게 만들면 집까지 못 와요!',
    map: [
      '. . . . R', //
      '. R . . .',
      '. 4 . . .',
      '. R . H .',
      '. . . . H',
    ],
    par: 2,
    solution: ['3,2', '2,3'],
  },
  {
    id: 'v-long-way',
    title: '빙 돌아가는 길',
    tip: '돌로 길을 막아 용암이 멀리 돌아가게 해요.',
    map: [
      '. H . . . .', //
      '. . . R . R',
      '. . . 5 . .',
      '. . . . . .',
      'H . . R . .',
    ],
    par: 3,
    solution: ['2,1', '1,2', '2,3'],
  },
  {
    id: 'v-two-small',
    title: '작은 화산 둘',
    tip: '숫자가 다른 작은 화산 두 개!',
    map: [
      '. . . . . H', //
      '. R 5 . . .',
      '. . . 4 . .',
      '. . . . R .',
      '. . R . H .',
      '. . . . H R',
    ],
    par: 3,
    solution: ['4,0', '5,1', '3,4'],
  },
  {
    id: 'v-small-egg',
    title: '작은 화산과 알',
    tip: '알까지는 닿고, 집까지는 못 가게!',
    map: [
      '. . R R R R', //
      '. . H . . .',
      'R . . . E .',
      '. H . . R R',
      '. . . . . .',
      '. . . 5 . .',
    ],
    par: 4,
    solution: ['3,1', '2,2', '2,3', '1,4'],
  },
  {
    id: 'v-escape-3',
    title: '마을 대피 작전 3',
    tip: '용암이 벌써 흐르고 있어요! 돌을 놓을 때마다 용암이 한 칸씩 번져요.',
    race: true,
    map: [
      '. H . . . R', //
      '. . . R R H',
      '. . . . H .',
      '. . . . R .',
      '. V . . . .',
      '. R R . . .',
    ],
    par: 5,
    solution: ['1,2', '2,3', '0,2', '3,2', '5,3'],
  },
  {
    id: 'v-count-cells',
    title: '칸 세기',
    tip: '용암이 몇 칸 갈지 세어 봐요.',
    map: [
      '. . . . 5 . .', //
      'H . H . . . .',
      '. . . R . . H',
      '. . . . . . .',
      '. . R . . . .',
      '. R . . . 6 R',
    ],
    par: 5,
    solution: ['2,0', '3,1', '6,1', '5,2', '6,3'],
  },
  {
    id: 'v-big-and-small',
    title: '큰 화산 작은 화산',
    tip: '큰 화산은 끝없이, 작은 화산은 숫자만큼 흘러요.',
    map: [
      '. . . . R . .', //
      '. . . . R . H',
      '. . . . R R .',
      'R . . . . R .',
      'R . . H . . V',
      'R . . . H . .',
      '. 5 . . . . .',
    ],
    par: 6,
    solution: ['6,2', '2,4', '4,4', '3,5', '5,5', '4,6'],
  },
  {
    id: 'v-small-nest',
    title: '작은 화산 둥지',
    tip: '작은 화산 두 개로 알 두 개를 데워요.',
    map: [
      '. . . . . . .', //
      '6 . . . R . .',
      '. . . H . . 5',
      '. . . R . . .',
      'E . . . . . .',
      'E . H . R R R',
      'R . . H . . R',
    ],
    par: 5,
    solution: ['3,1', '2,2', '4,2', '2,4', '1,5'],
  },
  {
    id: 'v-lava-maze',
    title: '용암 미로',
    tip: '큰 화산, 작은 화산, 알, 집. 모두 생각해요!',
    map: [
      '. . R R V R R', //
      '. . . . . . H',
      '. . . . . E .',
      'R R . H . E .',
      '. . . . . . .',
      '. . R . . R H',
      '. . . . . 6 R',
    ],
    par: 6,
    solution: ['3,1', '5,1', '4,2', '4,3', '3,4', '6,4'],
  },
  {
    id: 'v-final-boss',
    title: '화산 섬 정복',
    tip: '작은 화산 세 개, 알 두 개, 집 네 채! 화산 섬 마지막 보스예요.',
    boss: true,
    map: [
      'E . R R R . H', //
      '. . . . . R R',
      '. . . 6 . 5 R',
      'H . R . . . R',
      '. E . . . . R',
      'H . . R H . R',
      '. . . R . . 7',
    ],
    par: 7,
    solution: ['0,2', '1,3', '0,4', '4,4', '1,5', '5,5', '4,6'],
  },
];

const CHAPTER_DEFS: { title: string; blurb: string; color: string; stages: VolcanoStageDef[] }[] = [
  { title: '마을 지키기', blurb: '돌을 놓고 분출! 용암이 집에 닿지 않게 막아요.', color: '#F0692E', stages: CH1 },
  { title: '용의 알', blurb: '용암이 용의 알에 닿아야 아기 용이 깨어나요. 집은 지키고 알은 따뜻하게!', color: '#4FA85A', stages: CH2 },
  { title: '작은 화산', blurb: '숫자가 적힌 작은 화산은 그 칸 수만큼만 흘러요. 길을 길게 만들어 막아요.', color: '#C2413B', stages: CH3 },
];

export const VOLCANO_STAGE_DEFS: VolcanoStageDef[] = CHAPTER_DEFS.flatMap((c) => c.stages);

export const VOLCANO_CHAPTERS: Chapter[] = CHAPTER_DEFS.reduce<Chapter[]>((acc, c, i) => {
  const start = acc.length ? acc[acc.length - 1].start + acc[acc.length - 1].count : 0;
  return [...acc, { number: i + 1, title: c.title, blurb: c.blurb, color: c.color, start, count: c.stages.length }];
}, []).filter((c) => c.count > 0);

export const VOLCANO_STAGES: VolcanoStage[] = VOLCANO_STAGE_DEFS.map((def, i) => {
  const stage = parseVolcanoStage(def, i + 1);
  const ch = VOLCANO_CHAPTERS.find((c) => i >= c.start && i < c.start + c.count)!;
  return { ...stage, label: `STAGE ${ch.number}-${i - ch.start + 1}` };
});
