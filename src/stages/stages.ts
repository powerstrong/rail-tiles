import { type Stage, type StageDef, parseStage } from '../engine/stage';

/**
 * Hand-made stages. See StageDef in engine/stage.ts for the map glyphs.
 * Every stage is checked by stages.test.ts: it parses, its listed solution wins,
 * and the solver's route count is pinned so difficulty changes are deliberate.
 */
export const STAGE_DEFS: StageDef[] = [
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

export const STAGES: Stage[] = STAGE_DEFS.map((def, i) => parseStage(def, i + 1));
