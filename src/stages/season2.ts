import { type Stage, type StageDef, parseStage } from '../engine/stage';
import type { Chapter } from './stages';

/**
 * Train world season 2 ("기차 월드 2"): five chapters of ten, each bringing in a gimmick on
 * top of the rail puzzle. Stage 5 of every chapter is a one-departure bonus; stage 10 is the
 * boss. Ids start with `t2-`. Boards come from scripts/rail2-search.ts.
 */
const CH1: StageDef[] = [
  {
    id: 't2-first-gate',
    title: '첫 번째 차단기',
    tip: '빨간 버튼을 먼저 지나가면 빨간 차단기가 올라가요!',
    start: 'E',
    goal: 'S',
    inventory: { straight: 4, curve: 5 },
    map: [
      '. . G . .', //
      'H R . . R',
      'S . D1 . M',
      '. K1 . . T',
      '. . . . T',
    ],
    solution: [
      '. . . . .', //
      '. . │ . .',
      '. ┐ │ . .',
      '. └ ┘ . .',
      '. . . . .',
    ],
  },
  {
    id: 't2-button-first',
    title: '버튼 먼저',
    tip: '차단기 앞에서 멈추지 않게, 버튼부터 들러요.',
    start: 'E',
    goal: 'N',
    inventory: { straight: 5, curve: 5 },
    map: [
      '. . . . .', //
      'S . . K1 .',
      '. T T D1 .',
      'R . . . .',
      'M R G . .',
    ],
    solution: [
      '. . . . .', //
      '. ─ ─ ┐ .',
      '. . . │ .',
      '. . ┌ ┘ .',
      '. . . . .',
    ],
  },
  {
    id: 't2-crossing-detour',
    title: '돌아가는 건널목',
    tip: '버튼이 멀리 있어요. 어떻게 돌아갈까요?',
    start: 'S',
    goal: 'W',
    inventory: { straight: 3, curve: 8 },
    map: [
      '. S T . . R', //
      '. . . R . G',
      '. H K1 D1 . .',
      'H . . . . .',
      '. . . . . .',
    ],
    solution: [
      '. . . . . .', //
      '. └ ┐ . ┌ .',
      '. . └ ─ ┘ .',
      '. . . . . .',
      '. . . . . .',
    ],
  },
  {
    id: 't2-gate-passenger',
    title: '건널목 손님',
    tip: '손님도 태우고 차단기도 열어요.',
    start: 'E',
    goal: 'N',
    inventory: { straight: 5, curve: 7 },
    map: [
      '. . . M T .', //
      '. . . R M R',
      'S . . . . .',
      '. . . . . .',
      '. P R D1 . H',
      '. K1 . . G .',
    ],
    solution: [
      '. . . . . .', //
      '. . . . . .',
      '. ┐ . . . .',
      '. │ . . . .',
      '. │ . ┌ ┐ .',
      '. └ ─ ┘ . .',
    ],
  },
  {
    id: 't2-bonus-1',
    title: '한 번에 출발 1',
    tip: '버튼을 지나 차단기를 열고 도착역까지!',
    oneShot: true,
    start: 'W',
    goal: 'S',
    inventory: { straight: 6, curve: 9 },
    map: [
      '. . T . G .', //
      'R R . M . .',
      '. . . . R D1',
      'T . . . . .',
      '. . . . . S',
      '. H . . K1 .',
    ],
    solution: [
      '. . . . . .', //
      '. . . . └ ┐',
      '. . . . . │',
      '. . . ┌ ─ ┘',
      '. . . │ ┌ .',
      '. . . └ ┘ .',
    ],
  },
  {
    id: 't2-two-colors',
    title: '두 가지 색',
    tip: '버튼과 같은 색 차단기만 열려요.',
    start: 'W',
    goal: 'N',
    inventory: { straight: 5, curve: 10 },
    map: [
      'K2 . . T M .', //
      '. . D2 T . .',
      'R . . . . S',
      '. D1 . . . .',
      '. . H . . K1',
      'R G . . . .',
    ],
    solution: [
      '. . . . . .', //
      '. . . . . .',
      '. . . . ┌ .',
      '. ┌ ─ ┐ └ ┐',
      '. │ . └ ─ ┘',
      '. . . . . .',
    ],
  },
  {
    id: 't2-gate-order',
    title: '순서대로',
    tip: '어느 버튼부터 지나갈까요?',
    start: 'W',
    goal: 'S',
    inventory: { straight: 6, curve: 8 },
    map: [
      'T G T . . R', //
      '. . D2 . R .',
      '. D1 . . . .',
      'R . . . . S',
      '. . R . . T',
      '. K1 K2 . . .',
    ],
    solution: [
      '. . . . . .', //
      '. │ . . . .',
      '. │ . . . .',
      '. │ . . ┌ .',
      '. │ . ┌ ┘ .',
      '. └ ─ ┘ . .',
    ],
  },
  {
    id: 't2-busy-crossing',
    title: '바쁜 건널목',
    tip: '차단기 두 개를 모두 열어야 해요.',
    start: 'S',
    goal: 'E',
    inventory: { straight: 9, curve: 8 },
    map: [
      '. H . S R . .', //
      'T T T . . . K2',
      'G . D1 . . . .',
      'T T D2 . . . .',
      '. . R . . . .',
      'M R T . K1 T .',
    ],
    solution: [
      '. . . . . . .', //
      '. . . └ ┐ . .',
      '. ─ ─ ┐ │ . .',
      '. . . │ │ . .',
      '. . . │ │ . .',
      '. . . └ ┘ . .',
    ],
  },
  {
    id: 't2-crossing-town',
    title: '건널목 마을',
    tip: '손님과 차단기 두 개.',
    start: 'S',
    goal: 'N',
    inventory: { straight: 9, curve: 6 },
    map: [
      'T S . . D2 . H', //
      '. . K2 . . K1 .',
      'T . . . . . R',
      'M R H . . P R',
      '. T . . D1 T .',
      '. . . . . . .',
      '. . . T G R M',
    ],
    solution: [
      '. . . . . . .', //
      '. └ ─ ─ ─ ┐ .',
      '. . . . . │ .',
      '. . . . ┌ ┘ .',
      '. . . . │ . .',
      '. . . . │ . .',
      '. . . . . . .',
    ],
  },
  {
    id: 't2-boss-1',
    title: '건널목 대장',
    tip: '두 가지 색 차단기와 손님. 건널목 마지막 시험이에요!',
    boss: true,
    start: 'S',
    goal: 'N',
    inventory: { straight: 13, curve: 9 },
    map: [
      'R . . S . . T', //
      '. K2 . . . R .',
      '. . . . . . P',
      '. T . . . K1 D2',
      'T . D1 R . . .',
      'R . . . R H R',
      'R . G . T R .',
    ],
    solution: [
      '. . . . . . .', //
      '. ┌ ─ ┘ . . .',
      '. └ ─ ─ ─ ─ ┐',
      '. . ┌ ─ ─ ─ ┘',
      '. . │ . . . .',
      '. . │ . . . .',
      '. . . . . . .',
    ],
  },
];
const CH2: StageDef[] = [
  {
    id: 't2-drawbridge',
    title: '도개교',
    tip: '빨간 레버를 지나가면 다리가 내려와요. 그다음에 강을 건너요!',
    start: 'W',
    goal: 'S',
    inventory: { straight: 5, curve: 8 },
    map: [
      '. R G . T', //
      '. . . M M',
      '. W ║1 W .',
      '. L1 . . S',
      '. . . . .',
    ],
    solution: [
      '. . . . .', //
      '. . │ . .',
      '. . . . .',
      '. ┌ ┘ ┌ .',
      '. └ ─ ┘ .',
    ],
  },
  {
    id: 't2-lever-trip',
    title: '레버 들르기',
    tip: '레버로 다리를 내리고 강을 건너요.',
    start: 'W',
    goal: 'N',
    inventory: { straight: 4, curve: 8 },
    map: [
      'T . . . . T', //
      '. . . . L1 .',
      '. W ║1 W . S',
      '. . . . R .',
      'T G . . T .',
    ],
    solution: [
      '. . . . . .', //
      '. . ┌ ─ ┐ .',
      '. . . . └ .',
      '. ┌ ┘ . . .',
      '. . . . . .',
    ],
  },
  {
    id: 't2-bridge-down',
    title: '내려간 다리',
    tip: '다리가 내려와 있어요. 레버를 지나가면 다리가 올라가니 조심!',
    open: [1],
    start: 'S',
    goal: 'W',
    inventory: { straight: 6, curve: 7 },
    map: [
      '. . . S L1 T', //
      '. . . . T R',
      '. . . H . T',
      '. . . . M .',
      '. W ║1 W . G',
      '. . . . . .',
    ],
    solution: [
      '. . . . . .', //
      '. . ┌ ┘ . .',
      '. . │ . . .',
      '. . │ . . .',
      '. . . . ┌ .',
      '. . └ ─ ┘ .',
    ],
  },
  {
    id: 't2-bridge-gate',
    title: '다리와 차단기',
    tip: '레버는 다리, 버튼은 차단기!',
    start: 'E',
    goal: 'W',
    inventory: { straight: 4, curve: 8 },
    map: [
      'K2 . D2 . . T', //
      '. L1 . W . T',
      '. . . ═1 . T',
      '. . . W . G',
      'S . . W . .',
      'T R . T . T',
    ],
    solution: [
      '. . . . . .', //
      '. ┌ ┐ . . .',
      '. │ └ . ┐ .',
      '. │ . . └ .',
      '. ┘ . . . .',
      '. . . . . .',
    ],
  },
  {
    id: 't2-bonus-2',
    title: '한 번에 출발 2',
    tip: '레버로 다리를 내리고 강을 건너요!',
    oneShot: true,
    start: 'S',
    goal: 'N',
    inventory: { straight: 6, curve: 8 },
    map: [
      'T . . S . H', //
      'R . . . L1 .',
      '. . . . . .',
      'W ║1 W W W T',
      '. . . . . M',
      '. . . . G R',
    ],
    solution: [
      '. . . . . .', //
      '. . . └ ┐ .',
      '. ┌ ─ ─ ┘ .',
      '. . . . . .',
      '. └ ─ ─ ┐ .',
      '. . . . . .',
    ],
  },
  {
    id: 't2-lever-twice',
    title: '레버를 지날까 말까',
    tip: '내려가 있는 다리. 레버를 지나갈지 말지 잘 생각해요.',
    open: [1],
    start: 'N',
    goal: 'W',
    inventory: { straight: 4, curve: 9 },
    map: [
      '. M W R T . .', //
      'T . ═1 . . T .',
      '. . W . . . H',
      '. . W . . L1 .',
      '. . W . . . G',
      '. S M . . H .',
    ],
    solution: [
      '. . . . . . .', //
      '. ┌ . ┐ . . .',
      '. │ . └ ┐ . .',
      '. │ . . └ ┐ .',
      '. │ . . . └ .',
      '. . . . . . .',
    ],
  },
  {
    id: 't2-two-rivers',
    title: '강 두 개',
    tip: '다리 두 개, 레버 두 개.',
    start: 'N',
    goal: 'W',
    inventory: { straight: 8, curve: 8 },
    map: [
      'L1 . L2 . W . .', //
      '. . . . W . T',
      '. . . . ═2 . .',
      '. . . . W . T',
      'W W . W ║1 . G',
      '. T S R W . .',
    ],
    solution: [
      '. . ┌ ┐ . . .', //
      '. . │ │ . . .',
      '. . │ └ . ┐ .',
      '. . │ . . │ .',
      '. . │ . . └ .',
      '. . . . . . .',
    ],
  },
  {
    id: 't2-river-gate',
    title: '강과 건널목',
    tip: '다리도 내리고 차단기도 열어요.',
    start: 'W',
    goal: 'N',
    inventory: { straight: 8, curve: 8 },
    map: [
      '. . M . . . T', //
      'D2 . . W . . S',
      '. R . W . . .',
      '. . . ═1 K2 . .',
      '. . R W . . .',
      '. . . W . L1 T',
      'H G . . M H T',
    ],
    solution: [
      '. . . . . . .', //
      '. . . . . ┌ .',
      '. . . . . │ .',
      '. ┌ ─ . ┐ │ .',
      '. │ . . │ │ .',
      '. │ . . └ ┘ .',
      '. . . . . . .',
    ],
  },
  {
    id: 't2-river-town',
    title: '강가 마을',
    tip: '강 두 개와 손님.',
    start: 'S',
    goal: 'W',
    inventory: { straight: 8, curve: 10 },
    map: [
      '. . S . T T .', //
      '. W . . . L1 .',
      'H W . . . . L2',
      'W W W ║1 W . G',
      '. ═2 . . . . T',
      'M W . . . P .',
      '. . H . T . R',
    ],
    solution: [
      '. . . . . . .', //
      '. . └ ─ ─ ┐ .',
      '. . . ┌ ─ ┘ .',
      '. . . . . ┌ .',
      '. . . │ . │ .',
      '. . . └ ─ ┘ .',
      '. . . . . . .',
    ],
  },
  {
    id: 't2-boss-2',
    title: '큰 강 건너기',
    tip: '다리, 차단기, 손님. 도개교 마지막 시험이에요!',
    boss: true,
    start: 'N',
    goal: 'E',
    inventory: { straight: 2, curve: 16 },
    map: [
      'T . W . . . .', //
      'T D2 W . L1 . .',
      'G . W . . . .',
      '. . ═1 . . P .',
      'T . W . . . T',
      'M . . . . . .',
      'K2 T S . . M T',
    ],
    solution: [
      '. . . . . . .', //
      '. . . . ┌ ┐ .',
      '. ┐ . ┌ ┘ │ .',
      '. └ . ┘ ┌ ┘ .',
      '. . . ┌ ┘ . .',
      '. . ┌ ┘ . . .',
      '. . . . . . .',
    ],
  },
];
const CH3: StageDef[] = [
  {
    id: 't2-water-tower',
    title: '급수탑',
    tip: '💧 숫자만큼 달리면 물이 떨어져요. 급수탑을 지나면 가득 채워져요!',
    water: 6,
    start: 'N',
    goal: 'W',
    inventory: { straight: 3, curve: 7 },
    map: [
      '. . . . .', //
      'F . . . G',
      '. . H T H',
      '. . . R .',
      '. . S . T',
    ],
    solution: [
      '. . . . .', //
      '┌ ─ ─ ─ .',
      '└ ┐ . . .',
      '. └ ┐ . .',
      '. . . . .',
    ],
  },
  {
    id: 't2-thirsty',
    title: '목마른 기차',
    tip: '급수탑을 거쳐 가는 길을 찾아요.',
    water: 7,
    start: 'S',
    goal: 'W',
    inventory: { straight: 4, curve: 8 },
    map: [
      '. S . R . .', //
      '. . . R . T',
      '. . T . . G',
      '. . . . R .',
      '. F . . R R',
    ],
    solution: [
      '. . . . . .', //
      '. │ . . . .',
      '. │ . ┌ ─ .',
      '. │ ┌ ┘ . .',
      '. └ ┘ . . .',
    ],
  },
  {
    id: 't2-two-towers',
    title: '급수탑 두 개',
    tip: '어느 급수탑에 들를까요?',
    water: 8,
    start: 'E',
    goal: 'W',
    inventory: { straight: 4, curve: 9 },
    map: [
      '. . . T . .', //
      'T . . T . G',
      '. M . . . .',
      '. H F . . .',
      'S . T . F .',
      '. . . . . .',
    ],
    solution: [
      '. . . . . .', //
      '. . . . ┌ .',
      '. . . . │ .',
      '. . . . │ .',
      '. ┐ . ┌ ┘ .',
      '. └ ─ ┘ . .',
    ],
  },
  {
    id: 't2-water-passenger',
    title: '물과 손님',
    tip: '손님도 태우고 물도 채워요.',
    water: 12,
    start: 'S',
    goal: 'W',
    inventory: { straight: 9, curve: 7 },
    map: [
      '. S M . . T', //
      '. . T . P .',
      '. . T . . G',
      '. . R . . .',
      '. . . F . .',
      '. . . T . .',
    ],
    solution: [
      '. . . . . .', //
      '. │ . ┌ ┐ .',
      '. │ . │ └ .',
      '. │ . │ . .',
      '. └ ─ ┘ . .',
      '. . . . . .',
    ],
  },
  {
    id: 't2-bonus-3',
    title: '한 번에 출발 3',
    tip: '물이 떨어지기 전에 급수탑에 들러요!',
    oneShot: true,
    water: 7,
    start: 'S',
    goal: 'E',
    inventory: { straight: 4, curve: 9 },
    map: [
      'R . S . . T', //
      '. . . . H M',
      'T M R . . .',
      '. . . . . .',
      'G . . . . F',
      '. . . . . .',
    ],
    solution: [
      '. . . . . .', //
      '. . └ ┐ . .',
      '. . . └ ┐ .',
      '. . . . └ ┐',
      '. ─ ─ ─ ─ ┘',
      '. . . . . .',
    ],
  },
  {
    id: 't2-long-trip',
    title: '먼 길',
    tip: '급수탑 두 개를 잘 이용해요.',
    water: 8,
    start: 'W',
    goal: 'E',
    inventory: { straight: 3, curve: 9 },
    map: [
      '. . . . . . F', //
      'G . . F . . .',
      'T . . . . R R',
      '. R . . . . T',
      'R . M . . . S',
      '. . . . . . .',
    ],
    solution: [
      '. . . . . . .', //
      '. ─ ─ ┐ . . .',
      '. . . └ ┐ . .',
      '. . . . └ ┐ .',
      '. . . . . └ .',
      '. . . . . . .',
    ],
  },
  {
    id: 't2-tower-gate',
    title: '급수탑과 차단기',
    tip: '버튼, 차단기, 급수탑!',
    water: 13,
    start: 'S',
    goal: 'E',
    inventory: { straight: 2, curve: 9 },
    map: [
      '. T T . . S H', //
      '. . . F . . .',
      '. . . . M . R',
      '. . . . . T .',
      'G . . . M T .',
      '. . K1 . D1 R .',
      '. . . . T . .',
    ],
    solution: [
      '. . . . . . .', //
      '. . . ┌ ─ ┘ .',
      '. . ┌ ┘ . . .',
      '. ┌ ┘ . . . .',
      '. ┘ . . . . .',
      '. . . . . . .',
      '. . . . . . .',
    ],
  },
  {
    id: 't2-tower-bridge',
    title: '급수탑과 도개교',
    tip: '다리를 내리고 물도 채워요.',
    water: 8,
    start: 'W',
    goal: 'E',
    inventory: { straight: 5, curve: 9 },
    map: [
      '. . T F . . .', //
      'R . M W . . S',
      '. . . ═1 . . .',
      'G . . W . L1 .',
      '. . T W . F .',
      '. R . W . . .',
      '. R R W . T .',
    ],
    solution: [
      '. . . . . . .', //
      '. . . . . ┌ .',
      '. ┌ ─ . ┐ │ .',
      '. ┘ . . │ │ .',
      '. . . . └ ┘ .',
      '. . . . . . .',
      '. . . . . . .',
    ],
  },
  {
    id: 't2-desert-line',
    title: '사막 노선',
    tip: '물을 아껴서 손님까지!',
    water: 13,
    start: 'W',
    goal: 'E',
    inventory: { straight: 6, curve: 11 },
    map: [
      '. . . R . . .', //
      'T . . . . . S',
      'M . . H . . F',
      'G . . . T R T',
      '. . . F M R T',
      '. . . P . . .',
      'T . . . H . .',
    ],
    solution: [
      '. . . . . . .', //
      '. . ┌ ─ ─ ─ .',
      '. . │ . . . .',
      '. ┐ └ ┐ . . .',
      '. └ ┐ │ . . .',
      '. . └ ┘ . . .',
      '. . . . . . .',
    ],
  },
  {
    id: 't2-boss-3',
    title: '증기기관차 대장',
    tip: '급수탑, 차단기, 손님. 급수탑 마지막 시험이에요!',
    boss: true,
    water: 11,
    start: 'E',
    goal: 'S',
    inventory: { straight: 7, curve: 10 },
    map: [
      'H G K1 . . . .', //
      '. . . . . . .',
      'F . H . . P .',
      'D1 . . . . H .',
      'T T . . T R R',
      'S . . F . . .',
      '. . . . . . .',
    ],
    solution: [
      '. . . . . . .', //
      '. └ ─ ─ ─ ┐ .',
      '. . . . ┌ ┘ .',
      '. . . ┌ ┘ . .',
      '. . . │ . . .',
      '. ─ ─ ┘ . . .',
      '. . . . . . .',
    ],
  },
];
const CH4: StageDef[] = [
  {
    id: 't2-turntable',
    title: '회전판',
    tip: '회전판에 들어가면 화살표 쪽으로 빙글! 레일 없이도 방향이 바뀌어요.',
    start: 'E',
    goal: 'S',
    inventory: { straight: 3, curve: 6 },
    map: [
      '. . . G .', //
      'M . . . .',
      'R . ↺ . .',
      'S . . . .',
      '. . . R R',
    ],
    solution: [
      '. . . . .', //
      '. . ┌ ┘ .',
      '. ┌ . . .',
      '. ┘ . . .',
      '. . . . .',
    ],
  },
  {
    id: 't2-spin-around',
    title: '빙글빙글',
    tip: '회전판에 어느 쪽으로 들어갈까요?',
    start: 'S',
    goal: 'W',
    inventory: { straight: 4, curve: 6 },
    map: [
      'M . S . . T', //
      'T R . . T M',
      '. . . R . M',
      '. . ↻ . . G',
      '. . . . . .',
    ],
    solution: [
      '. . . . . .', //
      '. . │ . . .',
      '. . │ . . .',
      '. ┌ . ─ ─ .',
      '. └ ┘ . . .',
    ],
  },
  {
    id: 't2-two-tables',
    title: '회전판 두 개',
    tip: '화살표를 잘 보고 들어가요.',
    start: 'S',
    goal: 'E',
    inventory: { straight: 6, curve: 8 },
    map: [
      'H . . S . H', //
      'T T . . . ↺',
      'G . T . . .',
      '. . T . . T',
      '. . . ↺ . .',
      '. . . . . .',
    ],
    solution: [
      '. . . . . .', //
      '. . . │ . .',
      '. ┐ . │ . .',
      '. │ . │ . .',
      '. └ ─ . ┐ .',
      '. . . └ ┘ .',
    ],
  },
  {
    id: 't2-spin-passenger',
    title: '회전판 손님',
    tip: '손님을 태우고 회전판으로 빙글!',
    start: 'E',
    goal: 'N',
    inventory: { straight: 6, curve: 8 },
    map: [
      '. H . T . .', //
      '. . T T . .',
      'R . . . . .',
      'S . ↻ . . .',
      '. . . . . P',
      '. . . G T .',
    ],
    solution: [
      '. . . . . .', //
      '. . . . . .',
      '. . . . . .',
      '. ┐ . ─ ─ ┐',
      '. └ ┘ ┌ ─ ┘',
      '. . . . . .',
    ],
  },
  {
    id: 't2-bonus-4',
    title: '한 번에 출발 4',
    tip: '회전판 화살표를 잘 보고 출발해요!',
    oneShot: true,
    start: 'S',
    goal: 'N',
    inventory: { straight: 2, curve: 10 },
    map: [
      '. S . . T R', //
      '. . . . . H',
      '. . . ↺ . .',
      '. T H . . .',
      'T . . . . T',
      '. G H . . .',
    ],
    solution: [
      '. . . . . .', //
      '. └ ─ ┐ . .',
      '. . . . ┐ .',
      '. . . ┌ ┘ .',
      '. ┌ ─ ┘ . .',
      '. . . . . .',
    ],
  },
  {
    id: 't2-spin-maze',
    title: '회전판 미로',
    tip: '회전판 두 개로 길을 만들어요.',
    start: 'W',
    goal: 'E',
    inventory: { straight: 8, curve: 6 },
    map: [
      '. H . . . . .', //
      '. . T . ↻ . S',
      'G . T . ↺ . R',
      '. . M . . . .',
      '. . T . . . H',
      '. . . . . . R',
    ],
    solution: [
      '. . . . . . .', //
      '. . . . . ┌ .',
      '. ┐ . . . ┘ .',
      '. │ . . │ . .',
      '. │ . . │ . .',
      '. └ ─ ─ ┘ . .',
    ],
  },
  {
    id: 't2-spin-gate',
    title: '회전판과 차단기',
    tip: '버튼, 차단기, 회전판!',
    start: 'W',
    goal: 'N',
    inventory: { straight: 4, curve: 9 },
    map: [
      '. . . H . . .', //
      'T . . . H . .',
      'H . . . . . T',
      '. K1 ↻ . M . .',
      '. . . D1 M . S',
      '. . G . ↺ . .',
    ],
    solution: [
      '. . . . . . .', //
      '. . . . . . .',
      '. . ┌ ─ ─ ┐ .',
      '. ┌ . . . │ .',
      '. └ ┐ . . └ .',
      '. . . . . . .',
    ],
  },
  {
    id: 't2-spin-water',
    title: '회전판과 급수탑',
    tip: '물도 채우고 빙글 돌아요.',
    water: 9,
    start: 'E',
    goal: 'W',
    inventory: { straight: 6, curve: 7 },
    map: [
      'R M R T . . R', //
      'H . . M . T .',
      'S . . . F . .',
      '↻ . . . . R .',
      '. . . . ↻ . G',
      'H R . . . . T',
      'H . T . . . R',
    ],
    solution: [
      '. . . . . . .', //
      '. . . . . . .',
      '. ─ ─ ─ ┐ . .',
      '. . . . │ . .',
      '. . . ┌ . ─ .',
      '. . . └ ┘ . .',
      '. . . . . . .',
    ],
  },
  {
    id: 't2-spin-town',
    title: '빙글 마을',
    tip: '회전판 두 개와 손님.',
    start: 'W',
    goal: 'N',
    inventory: { straight: 6, curve: 7 },
    map: [
      'M T ↺ P . . .', //
      '. R . . . . R',
      'T H . . . . T',
      'R . . . . . S',
      '. . . . T ↺ .',
      'R M . M H H R',
      '. . G . . T .',
    ],
    solution: [
      '. . . ┐ . . .', //
      '. . │ └ ┐ . .',
      '. . │ . └ ┐ .',
      '. . │ . . └ .',
      '. . │ . . . .',
      '. . │ . . . .',
      '. . . . . . .',
    ],
  },
  {
    id: 't2-boss-4',
    title: '회전판 대장',
    tip: '회전판, 차단기, 손님. 회전판 마지막 시험이에요!',
    boss: true,
    start: 'S',
    goal: 'N',
    inventory: { straight: 11, curve: 8 },
    map: [
      'H D1 S . . T .', //
      '. . . ↻ T . .',
      '. . . . . . .',
      'M . K1 . . . H',
      '. . . ↺ . . .',
      'T . . R P . .',
      '. G R . . . .',
    ],
    solution: [
      '. . . . . . .', //
      '. . └ . . . .',
      '. . . └ ─ ┐ .',
      '. ┌ ─ ─ ┐ │ .',
      '. │ . . │ │ .',
      '. │ . . └ ┘ .',
      '. . . . . . .',
    ],
  },
];
const CH5: StageDef[] = [
  {
    id: 't2-first-wagon',
    title: '첫 화물칸',
    tip: '화물칸을 지나가면 기차 뒤에 철컥 연결돼요!',
    start: 'S',
    goal: 'E',
    inventory: { straight: 2, curve: 8 },
    map: [
      '. . . S .', //
      'T T . . .',
      '. . R . O',
      'G . . . .',
      'M . . . .',
    ],
    solution: [
      '. . . . .', //
      '. . . └ ┐',
      '. . . ┌ ┘',
      '. ─ ─ ┘ .',
      '. . . . .',
    ],
  },
  {
    id: 't2-two-wagons',
    title: '화물칸 두 개',
    tip: '화물칸을 모두 연결해요.',
    start: 'W',
    goal: 'E',
    inventory: { straight: 7, curve: 7 },
    map: [
      'T . T . . .', //
      'G . O . . .',
      '. . . . T .',
      'T O . . . S',
      '. . . . T .',
    ],
    solution: [
      '. . . . . .', //
      '. ─ ┐ . . .',
      '. ┌ ┘ . . .',
      '. └ ─ ─ ─ .',
      '. . . . . .',
    ],
  },
  {
    id: 't2-wagon-gate',
    title: '화물과 차단기',
    tip: '화물칸도 연결하고 차단기도 열어요.',
    start: 'S',
    goal: 'W',
    inventory: { straight: 6, curve: 10 },
    map: [
      'R S . H . .', //
      'R . . . . T',
      '. H . . . G',
      '. . . . . .',
      '. . . D1 O H',
      '. . K1 O M T',
    ],
    solution: [
      '. . . . . .', //
      '. └ ┐ . . .',
      '. . │ . ┌ .',
      '. . │ . │ .',
      '. . │ ┌ ┘ .',
      '. . └ ┘ . .',
    ],
  },
  {
    id: 't2-wagon-water',
    title: '화물과 급수탑',
    tip: '무거운 화물 열차도 물이 필요해요.',
    water: 12,
    start: 'E',
    goal: 'S',
    inventory: { straight: 4, curve: 10 },
    map: [
      'T . . G . .', //
      'M . . . . .',
      'T . . . . O',
      'T . . F . O',
      'S . T . . .',
      '. T T . . .',
    ],
    solution: [
      '. . . . . .', //
      '. . . └ ┐ .',
      '. . . . └ ┐',
      '. ┌ ─ ─ ─ ┘',
      '. ┘ . . . .',
      '. . . . . .',
    ],
  },
  {
    id: 't2-bonus-5',
    title: '한 번에 출발 5',
    tip: '화물칸 두 개를 모두 연결해요!',
    oneShot: true,
    start: 'N',
    goal: 'E',
    inventory: { straight: 4, curve: 7 },
    map: [
      '. R T . T T', //
      '. . T . . .',
      'G . . . O .',
      '. . . . . O',
      '. . . . . .',
      '. . . T S .',
    ],
    solution: [
      '. . . . . .', //
      '. . . . . .',
      '. ─ ─ ─ ┐ .',
      '. . . . └ ┐',
      '. . . . ┌ ┘',
      '. . . . . .',
    ],
  },
  {
    id: 't2-wagon-spin',
    title: '화물과 회전판',
    tip: '회전판으로 빙글 돌아 화물칸으로!',
    start: 'N',
    goal: 'W',
    inventory: { straight: 8, curve: 9 },
    map: [
      '. H . R . . .', //
      '. T . . . O T',
      '. T . . . ↻ .',
      '. T . . . . G',
      '. . . . . O T',
      '. H . S . H M',
    ],
    solution: [
      '. . . . . . .', //
      '. . . ┌ ─ ┐ .',
      '. . . │ ┌ . .',
      '. . . │ │ ┌ .',
      '. . . │ └ ┘ .',
      '. . . . . . .',
    ],
  },
  {
    id: 't2-wagon-bridge',
    title: '화물과 도개교',
    tip: '다리를 내리고 화물칸을 데려와요.',
    start: 'E',
    goal: 'N',
    inventory: { straight: 6, curve: 12 },
    map: [
      '. . . . R R .', //
      'S . . . O . H',
      '. L1 . . . . H',
      'T . . . O . T',
      'W W ║1 W W W .',
      'T R . . . M .',
      '. M . G R . .',
    ],
    solution: [
      '. . . . . . .', //
      '. ┐ . ┌ ┐ . .',
      '. └ ─ ┘ │ . .',
      '. . ┌ ─ ┘ . .',
      '. . . . . . .',
      '. . └ ┐ . . .',
      '. . . . . . .',
    ],
  },
  {
    id: 't2-three-wagons',
    title: '화물칸 세 개',
    tip: '화물칸 세 개와 차단기.',
    start: 'N',
    goal: 'S',
    inventory: { straight: 6, curve: 12 },
    map: [
      'H R . G T H T', //
      '. O D1 . . T T',
      '. . . . O T .',
      '. . . T M H .',
      '. O . M . . .',
      '. . . K1 . . .',
      'R . . . . S H',
    ],
    solution: [
      '. . . . . . .', //
      '. ┌ ┐ └ ┐ . .',
      '. │ └ ─ ┘ . .',
      '. │ . . . . .',
      '. └ ┐ . . . .',
      '. . └ ─ ─ ┐ .',
      '. . . . . . .',
    ],
  },
  {
    id: 't2-freight-line',
    title: '화물 노선',
    tip: '급수탑, 회전판, 화물칸 두 개.',
    water: 14,
    start: 'W',
    goal: 'S',
    inventory: { straight: 6, curve: 12 },
    map: [
      'R T . . G M R', //
      'H F . . . T R',
      '. . . H . . .',
      'O ↺ . . . . T',
      '. . . M . . S',
      '. T . T . O .',
      '. . . T . . .',
    ],
    solution: [
      '. . . . . . .', //
      '. ┌ ─ ─ ┘ . .',
      '. │ . . . . .',
      '┌ . ─ ─ ┐ . .',
      '└ ┘ . . │ ┌ .',
      '. . . . └ ┘ .',
      '. . . . . . .',
    ],
  },
  {
    id: 't2-final-boss',
    title: '기차 대장 정복',
    tip: '화물칸, 차단기, 급수탑! 기차 월드 2 마지막 보스예요.',
    boss: true,
    water: 14,
    start: 'E',
    goal: 'S',
    inventory: { straight: 8, curve: 11 },
    map: [
      '. . . H . G R', //
      '. K1 D1 R . . T',
      'O . . . . . .',
      'S . . . . . H',
      '. . . R . F .',
      '. . . O . . H',
    ],
    solution: [
      '. . . . . . .', //
      '┌ ─ ┐ . . │ .',
      '└ ┐ │ . . │ .',
      '. ┘ │ . . │ .',
      '. . │ . ┌ ┘ .',
      '. . └ ─ ┘ . .',
    ],
  },
];

const CHAPTER_DEFS: { title: string; blurb: string; color: string; stages: StageDef[] }[] = [
  { title: '건널목', blurb: '버튼을 지나가면 같은 색 차단기가 올라가요.', color: '#E5584F', stages: CH1 },
  { title: '도개교', blurb: '레버를 지나갈 때마다 같은 색 다리가 내려가거나 올라가요.', color: '#3A9AD9', stages: CH2 },
  { title: '급수탑', blurb: '증기기관차는 물이 있어야 달려요. 물이 떨어지기 전에 급수탑에 들러요.', color: '#2FA3B8', stages: CH3 },
  { title: '회전판', blurb: '회전판에 들어가면 기차가 화살표 쪽으로 빙글 돌아 나가요.', color: '#8E6BD1', stages: CH4 },
  { title: '화물 열차', blurb: '화물칸을 모두 연결하고 도착역까지! 지금까지 배운 기믹이 모두 나와요.', color: '#E3AE1F', stages: CH5 },
];

export const S2_STAGE_DEFS: StageDef[] = CHAPTER_DEFS.flatMap((c) => c.stages);

export const S2_CHAPTERS: Chapter[] = CHAPTER_DEFS.reduce<Chapter[]>((acc, c, i) => {
  const start = acc.length ? acc[acc.length - 1].start + acc[acc.length - 1].count : 0;
  return [...acc, { number: i + 1, title: c.title, blurb: c.blurb, color: c.color, start, count: c.stages.length }];
}, []).filter((c) => c.count > 0);

export const S2_STAGES: Stage[] = S2_STAGE_DEFS.map((def, i) => {
  const stage = parseStage(def, i + 1);
  const ch = S2_CHAPTERS.find((c) => i >= c.start && i < c.start + c.count)!;
  return { ...stage, label: `STAGE ${ch.number}-${i - ch.start + 1}` };
});
