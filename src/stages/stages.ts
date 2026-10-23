import { type Stage, type StageDef, parseStage } from '../engine/stage';

/**
 * Hand-made stages. See StageDef in engine/stage.ts for the map glyphs.
 * Every stage is checked by stages.test.ts: it parses, its listed solution wins,
 * and the solver's route count is pinned so difficulty changes are deliberate.
 */
const CH1_BASICS: StageDef[] = [
  {
    id: 'first-line',
    title: '첫 번째 선로',
    tip: '레일을 놓아 출발역과 도착역을 이어 주세요.',
    ghostHint: true,
    start: 'E',
    goal: 'W',
    inventory: { straight: 3, curve: 0 },
    map: [
      'T . . T .', //
      '. . . . .',
      'S . . . G',
      '. . W . T',
      'T . . . .',
    ],
    solution: [
      '. . . . .', //
      '. . . . .',
      '. ─ ─ ─ .',
      '. . . . .',
      '. . . . .',
    ],
  },
  {
    id: 'first-turn',
    title: '모퉁이 돌기',
    tip: '곡선 레일로 방향을 바꿀 수 있어요. 놓인 레일을 누르면 회전해요.',
    start: 'E',
    goal: 'N',
    inventory: { straight: 4, curve: 3 },
    map: [
      'T . . . T', //
      'S . . . .',
      '. . W . .',
      'T . W . R',
      '. T . G .',
    ],
    solution: [
      '. . . . .', //
      '. ─ ─ ┐ .',
      '. . . │ .',
      '. . . │ .',
      '. . . . .',
    ],
  },
  {
    id: 'around-the-hill',
    title: '언덕 너머',
    tip: '산은 지나갈 수 없어요. 레일 개수에 맞는 길을 찾아보세요.',
    start: 'E',
    goal: 'W',
    inventory: { straight: 5, curve: 8 },
    map: [
      'T . . . . .', //
      '. . R R . .',
      'S . M M . G',
      '. . M M . .',
      '. . W W . T',
      'T . . . . .',
    ],
    solution: [
      '. ┌ ─ ─ ┐ .', //
      '. │ . . │ .',
      '. ┘ . . └ .',
      '. . . . . .',
      '. . . . . .',
      '. . . . . .',
    ],
  },
  {
    id: 'river-crossing',
    title: '강 건너기',
    tip: '다리 위 레일은 고정되어 있어 옮길 수 없어요. 다리를 이용해 강을 건너 보세요.',
    start: 'E',
    goal: 'W',
    inventory: { straight: 3, curve: 6 },
    map: [
      'T . . W . .', //
      '. . . W . T',
      'S . . W . .',
      '. . . ═ . .',
      '. R . W . G',
      '. . . W T .',
    ],
    solution: [
      '. . . . . .', //
      '. . . . . .',
      '. ─ ┐ . . .',
      '. . └ . ┐ .',
      '. . . . └ .',
      '. . . . . .',
    ],
  },
  {
    id: 'make-it-last',
    title: '아껴 쓰기',
    tip: '곡선 레일이 넉넉하지 않아요. 가장 짧아 보이는 길이 정답은 아닐 수도 있어요.',
    start: 'E',
    goal: 'W',
    inventory: { straight: 7, curve: 4 },
    map: [
      'S . . . . T', //
      '. . R . . .',
      'T . . . M .',
      '. M . . . .',
      '. . . R . .',
      'T . . . . G',
    ],
    solution: [
      '. ─ ─ ┐ . .', //
      '. . . │ . .',
      '. . . │ . .',
      '. . . └ ┐ .',
      '. . . . │ .',
      '. . . . └ .',
    ],
  },
  {
    id: 'first-passenger',
    title: '첫 손님',
    tip: '손님이 기다리는 칸을 지나가야 손님을 태울 수 있어요.',
    start: 'E',
    goal: 'W',
    inventory: { straight: 5, curve: 10 },
    map: [
      'T . . . . P', //
      '. . R . . .',
      'S . . . . G',
      '. . . M . .',
      'T . . . . .',
      '. . W W . T',
    ],
    solution: [
      '. . . ┌ ─ ┐', //
      '. . . │ ┌ ┘',
      '. ─ ─ ┘ └ .',
      '. . . . . .',
      '. . . . . .',
      '. . . . . .',
    ],
  },
  {
    id: 'forest-stop',
    title: '숲속 정류장',
    tip: '나무와 산 사이로 길을 내서 손님을 태워 가세요.',
    start: 'S',
    goal: 'W',
    inventory: { straight: 8, curve: 5 },
    map: [
      'S . . T . .', //
      '. . . . . .',
      '. R . . . .',
      '. . P M . .',
      'T . . R . .',
      '. W . . . G',
    ],
    solution: [
      '. . . . . .', //
      '│ . . . . .',
      '│ . . . . .',
      '└ ─ ┐ . . .',
      '. . │ . . .',
      '. . └ ─ ─ .',
    ],
  },
  {
    id: 'two-passengers',
    title: '두 손님',
    tip: '손님 두 명을 모두 태워야 해요. 누구를 먼저 태울지는 자유예요.',
    start: 'E',
    goal: 'W',
    inventory: { straight: 7, curve: 10 },
    map: [
      'T . . . . . T', //
      '. P . . R . .',
      '. . . M . . .',
      'S . . . . . G',
      '. . . M . . .',
      '. . R . . P .',
      'T . . . . . T',
    ],
    solution: [
      '. . . . . . .', //
      '. ┌ ┐ . . . .',
      '. │ │ . . . .',
      '. ┘ └ ─ ┐ ┌ .',
      '. . . . │ │ .',
      '. . . . └ ┘ .',
      '. . . . . . .',
    ],
  },
  {
    id: 'the-way-back',
    title: '되돌아오기',
    tip: '고정 곡선은 들어갈 수 있는 방향이 정해져 있어요. 어느 쪽에서 들어가야 할까요?',
    start: 'E',
    goal: 'E',
    inventory: { straight: 11, curve: 11 },
    map: [
      'T . . . . . P', //
      '. . R . . . .',
      'S . . . ┐ . .',
      'W W W W ║ W W',
      '. . T . . . .',
      '. M . R . . .',
      'T G . . . . T',
    ],
    solution: [
      '. ┌ ─ ─ ─ ─ ┐', //
      '. │ . ┌ ─ ─ ┘',
      '. ┘ . └ . . .',
      '. . . . . . .',
      '. . . . │ . .',
      '. . . . │ . .',
      '. . ─ ─ ┘ . .',
    ],
  },
  {
    id: 'last-run',
    title: '마지막 운행',
    tip: '다리, 고정 레일, 손님 두 명. 지금까지 배운 것을 모두 써 보세요.',
    start: 'S',
    goal: 'N',
    inventory: { straight: 11, curve: 13 },
    map: [
      'T S . . W . T', //
      '. . . R W P .',
      '. M . . ═ . .',
      '. . R . W . .',
      'P . T . W T .',
      '. . . ┘ . . .',
      'T . . . . G T',
    ],
    solution: [
      '. . . . . . .', //
      '┌ ┘ . . . ┌ ┐',
      '│ . . ┌ . ┘ │',
      '│ . . │ . . │',
      '│ . . │ . . │',
      '└ ─ ─ . . ┌ ┘',
      '. . . . . . .',
    ],
  },
];

const CH2_TUNNELS: StageDef[] = [
  {
    id: 'tunnel-intro',
    title: '터널 통과',
    tip: '터널은 같은 글자의 다른 입구로 이어져요. 입구가 열린 쪽으로 들어가야 해요.',
    start: 'E',
    goal: 'N',
    inventory: { straight: 3, curve: 4 },
    tunnels: { a: ['E', 'W'] },
    map: [
      'T . . M . T', //
      '. . . M a .',
      'S . . M . .',
      '. . a M . G',
      '. R . M . .',
      'T . . M . .',
    ],
    solution: [
      '. . . . . .', //
      '. . . . . ┐',
      '. ┐ . . . │',
      '. └ . . . .',
      '. . . . . .',
      '. . . . . .',
    ],
  },
  {
    id: 'around-the-back',
    title: '돌아서 들어가기',
    tip: '터널 입구가 출발역 반대쪽을 보고 있어요. 빙 돌아서 들어가 보세요.',
    start: 'E',
    goal: 'W',
    inventory: { straight: 3, curve: 8 },
    tunnels: { a: ['N', 'N'] },
    map: [
      '. . . M . . .', //
      '. . . M . . T',
      'S . a M . . .',
      '. . . M . . .',
      'T . . M . P .',
      '. . . M a . .',
      'T . . M . . G',
    ],
    solution: [
      '. . . . . . .', //
      '. ┌ ┐ . . . .',
      '. ┘ . . . . .',
      '. . . . . . .',
      '. . . . ┌ ┐ .',
      '. . . . . │ .',
      '. . . . . └ .',
    ],
  },
  {
    id: 'tunnel-passenger',
    title: '터널 너머 손님',
    tip: '산 너머에서 손님이 기다려요. 터널로 산을 지나 손님을 태워 주세요.',
    start: 'E',
    goal: 'W',
    inventory: { straight: 5, curve: 8 },
    tunnels: { a: ['E', 'W'] },
    map: [
      'T . . M . .', //
      'S . . M a .',
      '. . . M T .',
      '. . a M . .',
      '. . T M P T',
      '. . . M . G',
    ],
    solution: [
      '. . . . . .', //
      '. ┐ . . . ┐',
      '. │ . . . │',
      '. └ . . ┌ ┘',
      '. . . . │ .',
      '. . . . └ .',
    ],
  },
  {
    id: 'under-the-water',
    title: '강 밑 터널',
    tip: '다리가 없는 강이에요. 터널 입구가 어느 쪽으로 열려 있는지 잘 보세요.',
    start: 'E',
    goal: 'W',
    inventory: { straight: 7, curve: 6 },
    tunnels: { a: ['N', 'S'] },
    map: [
      'R . . . . .', //
      'S . M . a .',
      '. . . . . .',
      'W W W W W W',
      '. a . . . .',
      '. . . P . G',
    ],
    solution: [
      '. ┌ ─ ─ ┐ .', //
      '. ┘ . . . .',
      '. . . . . .',
      '. . . . . .',
      '. . . . . .',
      '. └ ─ ─ ─ .',
    ],
  },
  {
    id: 'two-tunnels',
    title: '두 갈래 터널',
    tip: '터널이 두 개예요. 가까운 터널이 정답이라는 보장은 없어요.',
    start: 'E',
    goal: 'W',
    inventory: { straight: 10, curve: 8 },
    tunnels: { a: ['S', 'N'], b: ['E', 'W'] },
    map: [
      '. . a . . . T', //
      '. . . . b . .',
      'S . . . . . .',
      'M M M M M M M',
      '. P . . . . .',
      '. b . . a . G',
      'T . . . . . .',
    ],
    solution: [
      '. . . . . . .', //
      '. . . . . ┐ .',
      '. ─ ─ ─ ─ ┘ .',
      '. . . . . . .',
      '┌ ─ ─ ─ ─ ┐ .',
      '└ . . . . └ .',
      '. . . . . . .',
    ],
  },
  {
    id: 'two-ridges',
    title: '두 줄 산맥',
    tip: '산이 두 줄로 막고 있어요. 터널 두 개를 차례로 지나야 해요.',
    start: 'E',
    goal: 'N',
    inventory: { straight: 7, curve: 9 },
    tunnels: { a: ['S', 'W'], b: ['E', 'N'] },
    map: [
      '. . M . M . T', //
      'S . M a M . .',
      '. . M . M b .',
      '. . M . M . .',
      '. a M . M . .',
      '. . M b M . .',
      'T . M . M . G',
    ],
    solution: [
      '. . . . . . .', //
      '. ┐ . . . . .',
      '. │ . │ . . ┐',
      '┌ ┘ . │ . . │',
      '└ . . │ . . │',
      '. . . . . . │',
      '. . . . . . .',
    ],
  },
  {
    id: 'four-rooms',
    title: '네 개의 방',
    tip: '산으로 나뉜 네 구역을 터널 세 개로 차례차례 지나가요.',
    start: 'E',
    goal: 'E',
    inventory: { straight: 3, curve: 11 },
    tunnels: { a: ['S', 'W'], b: ['N', 'S'], c: ['E', 'E'] },
    map: [
      'S . T M a . .', //
      '. . a M . P .',
      '. . . M H b .',
      'M M M M M M M',
      '. c . M . b .',
      '. . . M . . .',
      'G . . M c . .',
    ],
    solution: [
      '. ┐ . . . . .', //
      '. └ . . └ ┐ .',
      '. . . . . . .',
      '. . . . . . .',
      '. . ┐ . . . .',
      '. . │ . . │ .',
      '. ─ ┘ . . ┘ .',
    ],
  },
  {
    id: 'there-and-back',
    title: '건너갔다 돌아오기',
    tip: '다리로 강을 건너 손님을 태우고, 터널로 다시 돌아와야 도착역이에요.',
    start: 'E',
    goal: 'E',
    inventory: { straight: 5, curve: 9 },
    tunnels: { a: ['S', 'E'] },
    map: [
      '. . . W . . R', //
      'S . T W . P .',
      '. . . ═ . R .',
      'T . . W . . .',
      '. a . W R a .',
      '. . . W . R R',
      'G . . W . T .',
    ],
    solution: [
      '. . . . . . .', //
      '. ┐ . . ┌ ─ ┐',
      '. └ ─ . ┘ . │',
      '. . . . . . │',
      '. . . . . . ┘',
      '. │ . . . . .',
      '. ┘ . . . . .',
    ],
  },
  {
    id: 'river-and-ridge',
    title: '강 건너 산 넘어',
    tip: '강은 a 터널로, 산은 b 터널로 건너요. 가는 길에 손님도 태워요.',
    start: 'E',
    goal: 'W',
    inventory: { straight: 10, curve: 8 },
    tunnels: { a: ['W', 'E'], b: ['W', 'E'] },
    map: [
      '. . . . . a T', //
      'S . . . . . .',
      '. . R . P . .',
      'W W W W W W W',
      '. a . . . b .',
      'M M M M M M M',
      '. b . . . . G',
    ],
    solution: [
      '. . . . ┌ . .', //
      '. ─ ─ ┐ │ . .',
      '. . . └ ┘ . .',
      '. . . . . . .',
      '. . ─ ─ ─ . .',
      '. . . . . . .',
      '. . ─ ─ ─ ─ .',
    ],
  },
  {
    id: 'under-the-river',
    title: '강 밑 지름길',
    tip: '다리와 터널, 손님 두 명. 강을 한 번은 다리로, 한 번은 터널로 건너야 해요.',
    start: 'S',
    goal: 'E',
    inventory: { straight: 8, curve: 10 },
    tunnels: { a: ['W', 'E'] },
    map: [
      'S . . W . . T', //
      '. . . W . P .',
      '. . . ═ . . .',
      'M M . W M M .',
      '. a . W . a .',
      '. P . W . . .',
      'G . . W . . T',
    ],
    solution: [
      '. . . . . . .', //
      '│ . . . . ┌ ┐',
      '└ ─ ─ . ─ ┘ │',
      '. . . . . . │',
      '┌ . . . . . ┘',
      '└ ┐ . . . . .',
      '. ┘ . . . . .',
    ],
  },
];

const CH3_JUNCTIONS: StageDef[] = [
  {
    id: 'first-crossing',
    title: '교차로',
    tip: '교차 레일에서는 두 길이 엇갈려 지나가요. 기차는 교차로에서 언제나 곧게 달려요.',
    start: 'E',
    goal: 'N',
    inventory: { straight: 7, curve: 5, cross: 1 },
    map: [
      'T . . . . T', //
      '. . . . . .',
      'S . . . P .',
      'R . R R . .',
      'T G . . . T',
      '. . . W W .',
    ],
    solution: [
      '. . . . . .', //
      '. ┌ ─ ─ ┐ .',
      '. ┼ ─ ─ ┘ .',
      '. │ . . . .',
      '. . . . . .',
      '. . . . . .',
    ],
  },
  {
    id: 'loop-back',
    title: '한 바퀴 돌아 교차',
    tip: '손님을 태우고 돌아오는 길이 처음 지난 길과 엇갈려요. 교차 레일을 써 보세요.',
    start: 'E',
    goal: 'N',
    inventory: { straight: 5, curve: 5, cross: 1 },
    map: [
      'H . . . . .', //
      'R . . . P .',
      'S . . . . M',
      'R . R . . H',
      'H G . . . .',
      'H . . H R .',
    ],
    solution: [
      '. . . . . .', //
      '. ┌ ─ ─ ┐ .',
      '. ┼ ─ ─ ┘ .',
      '. │ . . . .',
      '. . . . . .',
      '. . . . . .',
    ],
  },
  {
    id: 'loop-and-cross',
    title: '고리 모양 길',
    tip: '위쪽 손님을 태우고 아래쪽 손님에게 가려면 길이 한 번 엇갈려야 해요.',
    start: 'E',
    goal: 'E',
    inventory: { straight: 10, curve: 8, cross: 1 },
    map: [
      '. . . . P .', //
      'T . . H T .',
      'S . . . . .',
      'G . . R . .',
      '. . . . . .',
      '. P . T . .',
    ],
    solution: [
      '. . ┌ ─ ─ ┐', //
      '. . │ . . │',
      '. ─ ┼ ─ ─ ┘',
      '. ┐ │ . . .',
      '. │ │ . . .',
      '. └ ┘ . . .',
    ],
  },
  {
    id: 'first-switch',
    title: '선로 전환기',
    tip: '분기기는 기차가 앞에서 지나갈 때마다 방향이 바뀌어요. 한 바퀴 돌아오면 다른 길로 갈 수 있어요.',
    start: 'E',
    goal: 'S',
    inventory: { straight: 8, curve: 7 },
    switches: { '1': { trunk: 'W', turn: 'N' }, '2': { trunk: 'E', turn: 'S' } },
    map: [
      'T . . . G . T', //
      'T . . R . R T',
      '. M . R . R .',
      'S . 2 . 1 . T',
      '. M . . . . T',
      'T . . P R . T',
      'T . . . . . T',
    ],
    solution: [
      '. . . . . . .', //
      '. . . . │ . .',
      '. . . . │ . .',
      '. ─ . ─ . ┐ .',
      '. . │ ┌ ─ ┘ .',
      '. . └ ┘ . . .',
      '. . . . . . .',
    ],
  },
  {
    id: 'wrong-way-switch',
    title: '반대로 놓인 분기기',
    tip: '도착역이 바로 앞인데 분기기가 위를 가리키고 있어요. 먼저 손님을 태우고 돌아와 보세요.',
    start: 'E',
    goal: 'W',
    inventory: { straight: 7, curve: 6 },
    switches: { '1': { trunk: 'W', turn: 'N', initial: 'turn' }, '2': { trunk: 'E', turn: 'N' } },
    map: [
      'T . . . . . T', //
      '. . . P . . .',
      '. M . R . R .',
      'S . 2 . 1 . G',
      '. M . R . R .',
      'T . . . . . T',
      'T T W W W T T',
    ],
    solution: [
      '. . . . . . .', //
      '. . ┌ ─ ┐ . .',
      '. . │ . │ . .',
      '. ─ . ─ . ─ .',
      '. . . . . . .',
      '. . . . . . .',
      '. . . . . . .',
    ],
  },
  {
    id: 'switch-down',
    title: '아래로 가는 분기기',
    tip: '이번엔 분기기가 아래로 갈라져요. 한 바퀴 돌고 오면 도착역 길이 열려요.',
    start: 'E',
    goal: 'N',
    inventory: { straight: 8, curve: 5 },
    switches: { '1': { trunk: 'W', turn: 'S' }, '2': { trunk: 'E', turn: 'N' } },
    map: [
      '. . . . . . .', //
      '. . . P . . .',
      'R . . M T . .',
      'S . 2 . 1 . .',
      '. R . R . R .',
      'R . T R . R .',
      '. . R . G . T',
    ],
    solution: [
      '. . . . . . .', //
      '. . ┌ ─ ─ ┐ .',
      '. . │ . . │ .',
      '. ─ . ─ . ┘ .',
      '. . . . │ . .',
      '. . . . │ . .',
      '. . . . . . .',
    ],
  },
  {
    id: 'figure-eight',
    title: '8자 노선',
    tip: '양쪽 끝의 손님을 모두 태우려면 선로가 한 번 엇갈려야 해요.',
    start: 'E',
    goal: 'N',
    inventory: { straight: 14, curve: 9, cross: 1 },
    map: [
      'T . . . . P T', //
      '. . . . . . .',
      '. R R . R . .',
      'S . . . . . .',
      '. . R . R . .',
      'P . . . . . T',
      'T . . G . . T',
    ],
    solution: [
      '. . . ┌ ─ ┐ .', //
      '. . . │ . │ .',
      '. . . │ . │ .',
      '. ┐ . │ . │ .',
      '┌ ┘ . │ . │ .',
      '└ ─ ─ ┼ ─ ┘ .',
      '. . . . . . .',
    ],
  },
  {
    id: 'crossing-return',
    title: '엇갈린 귀환',
    tip: '분기기로 돌아오는 길이 출발 선로를 가로질러야 해요.',
    start: 'E',
    goal: 'S',
    inventory: { straight: 8, curve: 7, cross: 1 },
    switches: { '1': { trunk: 'W', turn: 'N' }, '2': { trunk: 'E', turn: 'N' } },
    map: [
      'T . . . G . T', //
      '. . . R . R .',
      '. . . R . R .',
      'S . 2 . 1 . .',
      '. . . . . . .',
      '. . . . . . .',
      'T . . . . . T',
    ],
    solution: [
      '. . . . . . .', //
      '. . . . │ . .',
      '. ┌ ┐ . │ . .',
      '. ┼ . ─ . ┐ .',
      '. └ ─ ─ ─ ┘ .',
      '. . . . . . .',
      '. . . . . . .',
    ],
  },
  {
    id: 'both-sides',
    title: '양쪽 손님',
    tip: '분기기로 돌아오기 전에 양쪽 손님을 모두 태워야 해요. 교차 레일이 하나 있어요.',
    start: 'E',
    goal: 'S',
    inventory: { straight: 8, curve: 7, cross: 1 },
    switches: { '1': { trunk: 'W', turn: 'N' }, '2': { trunk: 'E', turn: 'N' } },
    map: [
      'T T . . G R T', //
      '. . . R . R T',
      '. P . R . R T',
      'S . 2 . 1 . W',
      'R . T . . . .',
      '. . . . . P .',
      'T . . . . . T',
    ],
    solution: [
      '. . . . . . .', //
      '. . . . │ . .',
      '. ┌ ┐ . │ . .',
      '. ┼ . ─ . ┐ .',
      '. │ . . . │ .',
      '. └ ─ ─ ─ ┘ .',
      '. . . . . . .',
    ],
  },
  {
    id: 'grand-tour',
    title: '대륙 횡단',
    tip: '분기기, 터널, 손님. 터널로 한 바퀴 돌아 손님을 태운 뒤 다시 분기기로 돌아오세요.',
    start: 'E',
    goal: 'S',
    inventory: { straight: 11, curve: 5 },
    switches: { '1': { trunk: 'W', turn: 'N' }, '2': { trunk: 'E', turn: 'S' } },
    tunnels: { a: ['W', 'E'] },
    map: [
      'T . . . G . T', //
      '. . . R . R .',
      '. . . R . R .',
      'S . 2 . 1 . a',
      'M M . . . M M',
      'a . . . P . .',
      'T . . . . . T',
    ],
    solution: [
      '. . . . . . .', //
      '. . . . │ . .',
      '. . . . │ . .',
      '. ─ . ─ . ─ .',
      '. . └ ─ ┐ . .',
      '. ─ ─ ─ ┘ . .',
      '. . . . . . .',
    ],
  },
];

const CH4_DELIVERY: StageDef[] = [
  {
    id: 'first-delivery',
    title: '첫 배달',
    tip: '손님을 태운 다음, 손님 옷과 같은 색 지붕 집 칸을 지나면 손님이 내려요.',
    start: 'E',
    goal: 'W',
    inventory: { straight: 4, curve: 4 },
    map: [
      'T . . . . T', //
      '. . A . . .',
      'S . R . . .',
      '. . . . X .',
      '. M . . . G',
      'T . . . . T',
    ],
    solution: [
      '. . . . . .', //
      '. ┌ ─ ─ ┐ .',
      '. ┘ . . │ .',
      '. . . . │ .',
      '. . . . └ .',
      '. . . . . .',
    ],
  },
  {
    id: 'pickup-first',
    title: '먼저 태우고 내려요',
    tip: '집 칸을 먼저 지나면 아무도 내리지 않아요. 손님을 먼저 태우고 집으로 돌아와야 해요.',
    start: 'E',
    goal: 'W',
    inventory: { straight: 6, curve: 10 },
    map: [
      '. T . . . T', //
      '. . . . A T',
      'S . X . . .',
      '. . . . . .',
      'T . . W . G',
      'T . . . . .',
    ],
    solution: [
      '. . . . . .', //
      '. ┌ ─ ─ ┐ .',
      '. ┘ ┌ ─ ┘ .',
      '. . └ ─ ┐ .',
      '. . . . └ .',
      '. . . . . .',
    ],
  },
  {
    id: 'tunnel-delivery',
    title: '터널 택배',
    tip: '손님을 태우고 터널을 지나 산 너머 집까지 가요.',
    start: 'E',
    goal: 'W',
    inventory: { straight: 4, curve: 6 },
    tunnels: { a: ['E', 'W'] },
    map: [
      'T . . M . . .', //
      'R R T M . T .',
      'S . . M . . T',
      '. A . M a . .',
      '. . a M . X .',
      'T . . M . . G',
      '. . . M . . .',
    ],
    solution: [
      '. . . . . . .', //
      '. . . . . . .',
      '. ┐ . . . . .',
      '. │ . . . ┐ .',
      '. └ . . . │ .',
      '. . . . . └ .',
      '. . . . . . .',
    ],
  },
  {
    id: 'switch-delivery',
    title: '분기기 배달',
    tip: '한 바퀴 돌며 손님을 태우면, 분기기가 집으로 가는 길을 열어 줘요.',
    start: 'E',
    goal: 'S',
    inventory: { straight: 10, curve: 5 },
    switches: { '1': { trunk: 'W', turn: 'N' }, '2': { trunk: 'E', turn: 'S' } },
    map: [
      'T . . . G . T', //
      'T . . R X R T',
      '. M . R . R .',
      'S . 2 . 1 . .',
      'T M . T W . .',
      'T . . A . . .',
      'T . . . . . .',
    ],
    solution: [
      '. . . . . . .', //
      '. . . . │ . .',
      '. . . . │ . .',
      '. ─ . ─ . ┐ .',
      '. . │ . . │ .',
      '. . └ ─ ─ ┘ .',
      '. . . . . . .',
    ],
  },
  {
    id: 'crossing-delivery',
    title: '교차로 배달',
    tip: '손님 집이 출발역 가까이에 있어요. 교차 레일로 되돌아와 보세요.',
    start: 'E',
    goal: 'N',
    inventory: { straight: 8, curve: 7, cross: 1 },
    map: [
      'T . . . . . T', //
      '. . . . . . .',
      'S . . . . A .',
      '. . R . R . .',
      '. X . . . . .',
      'T . . G . . T',
    ],
    solution: [
      '. . . . . . .', //
      '. ┌ ─ ─ ─ ┐ .',
      '. ┼ ─ ─ ─ ┘ .',
      '. │ . . . . .',
      '. └ ─ ┐ . . .',
      '. . . . . . .',
    ],
  },
  {
    id: 'two-bridges',
    title: '다리 두 번',
    tip: '손님이 두 명! 분홍 손님은 분홍 집, 파랑 손님은 파랑 집으로. 다리 두 개를 모두 건너야 해요.',
    start: 'E',
    goal: 'E',
    inventory: { straight: 8, curve: 8 },
    map: [
      'T T . W . . .', //
      'T A . ═ . X .',
      'T . T W T . .',
      'S . . W T B .',
      '. . . W R . .',
      '. Y . ═ . . .',
      'G . T W R R .',
    ],
    solution: [
      '. . . . . . .', //
      '. ┌ ─ . ─ ┐ .',
      '. │ . . . │ .',
      '. ┘ . . . │ .',
      '. . . . . │ .',
      '. ┌ ─ . ─ ┘ .',
      '. ┘ . . . . .',
    ],
  },
  {
    id: 'two-homes',
    title: '두 집 배달',
    tip: '두 손님의 집이 서로 대각선 반대편에 있어요. 어느 쪽부터 돌지 잘 생각해 보세요.',
    start: 'E',
    goal: 'W',
    inventory: { straight: 9, curve: 14 },
    map: [
      'T . . . . . T', //
      '. A . . . Y .',
      '. . . M . . .',
      'S . . . . . G',
      '. . . M . . .',
      '. X . . . B .',
      'T . . . . . T',
    ],
    solution: [
      '. . . . . . .', //
      '. ┌ ┐ . ┌ ┐ .',
      '. │ │ . │ │ .',
      '. ┘ │ . │ └ .',
      '. ┌ ┘ . └ ┐ .',
      '. └ ─ ─ ─ ┘ .',
      '. . . . . . .',
    ],
  },
  {
    id: 'zigzag-homes',
    title: '엇갈린 집',
    tip: '두 손님의 집이 서로 반대편에 있어요. 누구를 먼저 태울까요?',
    start: 'S',
    goal: 'N',
    inventory: { straight: 12, curve: 10 },
    map: [
      'S . . T . . .', //
      '. . A . . B .',
      '. R . . R . .',
      '. . . M . . .',
      '. Y . . . X .',
      '. . R . . . .',
      'T . . . . G T',
    ],
    solution: [
      '. . . . . . .', //
      '└ ─ ─ ─ ─ ┐ .',
      '. . . . . │ .',
      '. . . . . │ .',
      '. ┌ ─ ─ ─ ┘ .',
      '. │ . . ┌ ┐ .',
      '. └ ─ ─ ┘ . .',
    ],
  },
  {
    id: 'deliver-and-ride',
    title: '배달하고 태우고',
    tip: '집에 갈 손님과 함께 타고 갈 손님이 모두 기다려요.',
    start: 'E',
    goal: 'W',
    inventory: { straight: 11, curve: 14 },
    map: [
      '. . T . . . .', //
      'T A . . . P .',
      '. . . . . . .',
      'S . . . M . G',
      'R W T . . . .',
      '. P . . . X .',
      '. . . . . . T',
    ],
    solution: [
      '. . . . . . .', //
      '. ┌ ─ ─ ─ ┐ .',
      '. │ . ┌ ─ ┘ .',
      '. ┘ . │ . ┌ .',
      '. . . │ . │ .',
      '. ┌ ─ ┘ ┌ ┘ .',
      '. └ ─ ─ ┘ . .',
    ],
  },
  {
    id: 'last-delivery',
    title: '마지막 배달',
    tip: '세 손님, 터널, 교차 레일. 직선은 조금, 곡선은 많이. 지금까지 중 가장 어려운 노선이에요!',
    start: 'N',
    goal: 'W',
    inventory: { straight: 6, curve: 16, cross: 1 },
    tunnels: { a: ['N', 'E'] },
    map: [
      '. . . T . . .', //
      'A . Z R X . G',
      '. . . . . M .',
      'T a Y . . . .',
      '. . a . . . T',
      'R . T . . . C',
      '. T T S B . .',
    ],
    solution: [
      '. . . . . . .', //
      '┌ ─ ┐ . ┌ ─ .',
      '└ ┐ │ ┌ ┘ . .',
      '. . └ ┘ . . .',
      '. . . ─ ┐ . .',
      '. . . ┌ ┼ ─ ┐',
      '. . . . └ ─ ┘',
    ],
  },
];

export interface Chapter {
  number: number;
  title: string;
  blurb: string;
  /** Accent colour for the chapter header. */
  color: string;
  /** Index range [start, start + count) into STAGES. */
  start: number;
  count: number;
}

const CHAPTER_DEFS: { title: string; blurb: string; color: string; stages: StageDef[] }[] = [
  { title: '기본 선로', blurb: '직선과 곡선으로 길을 잇고 손님을 태워요.', color: '#58A773', stages: CH1_BASICS },
  { title: '산과 터널', blurb: '같은 글자의 터널 입구끼리 이어져요.', color: '#8E6BD1', stages: CH2_TUNNELS },
  { title: '교차로와 분기기', blurb: '길이 엇갈리고, 분기기가 방향을 바꿔요.', color: '#3A9AD9', stages: CH3_JUNCTIONS },
  { title: '손님 배달', blurb: '손님을 태워 같은 색 집까지 데려다줘요.', color: '#EC6A8E', stages: CH4_DELIVERY },
];

export const STAGE_DEFS: StageDef[] = CHAPTER_DEFS.flatMap((c) => c.stages);

export const CHAPTERS: Chapter[] = CHAPTER_DEFS.reduce<Chapter[]>((acc, c, i) => {
  const start = acc.length ? acc[acc.length - 1].start + acc[acc.length - 1].count : 0;
  return [...acc, { number: i + 1, title: c.title, blurb: c.blurb, color: c.color, start, count: c.stages.length }];
}, []).filter((c) => c.count > 0);

export const STAGES: Stage[] = STAGE_DEFS.map((def, i) => {
  const stage = parseStage(def, i + 1);
  const ch = CHAPTERS.find((c) => i >= c.start && i < c.start + c.count)!;
  return { ...stage, label: `STAGE ${ch.number}-${i - ch.start + 1}` };
});
