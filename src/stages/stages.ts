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
    inventory: { straight: 4, curve: 1 },
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
    inventory: { straight: 4, curve: 4 },
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
];

export const TOTAL_PLANNED_STAGES = 10;

export const STAGES: Stage[] = STAGE_DEFS.map((def, i) => parseStage(def, i + 1));
