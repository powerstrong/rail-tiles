import type { Chapter } from '../stages/stages';
import { type PenguinStage, type PenguinStageDef, parsePenguinStage } from './model';

/**
 * Penguin world: three chapters of ten. Stage ids start with `ice-` so they never clash with
 * train stages in saved progress. Every stage's par and solution are checked by tests.
 */
const CH1: PenguinStageDef[] = [
  {
    id: 'ice-first-slide',
    title: '첫 미끄럼',
    tip: '펭귄을 쓱 밀면 무언가에 부딪힐 때까지 미끄러져요. 구멍 위에 딱 멈추면 성공!',
    map: [
      '. . . . .', //
      'R . . . .',
      '. . . . a',
      '. . . . .',
      'A . . R .',
    ],
    par: 2,
    solution: ['a<', 'av'],
  },
  {
    id: 'ice-between-rocks',
    title: '바위 사이로',
    tip: '바위에 부딪히면 멈춰요. 어느 바위를 멈춤판으로 쓸까요?',
    map: [
      'R . . M . .', //
      '. . . . . .',
      '. . . . . .',
      '. a . . . .',
      'R . . . . .',
      '. . A . . .',
    ],
    par: 3,
    solution: ['a^', 'a>', 'av'],
  },
  {
    id: 'ice-snow-pile',
    title: '푹신한 눈더미',
    tip: '눈더미에 올라서면 푹 빠져서 그 자리에 멈춰요.',
    map: [
      '. . . . a .', //
      'A . * . . .',
      '. . . . . .',
      '. . . . . .',
      'M . . . . M',
      '. R . . . .',
    ],
    par: 4,
    solution: ['av', 'a<', 'a^', 'a<'],
  },
  {
    id: 'ice-fish-snack',
    title: '물고기 간식',
    tip: '미끄러지는 길에 있는 물고기를 먹어야 집에 갈 수 있어요.',
    map: [
      '. . . . . .', //
      '. M . . M .',
      'F . . . . A',
      '. . . . . .',
      'a . R . . .',
      '. . . . . .',
    ],
    par: 4,
    solution: ['a>', 'a^', 'a<', 'a>'],
  },
  {
    id: 'ice-mind-the-sea',
    title: '바다 조심',
    tip: '파란 바다로 미끄러지면 풍덩! 빠지지 않는 길을 찾아요.',
    map: [
      '. . . . W .', //
      '. . a . M .',
      '. . . . . .',
      '. W . . . A',
      '. . . . . R',
      '. . M . . W',
    ],
    par: 5,
    solution: ['av', 'a>', 'a^', 'a>', 'av'],
  },
  {
    id: 'ice-snow-and-fish',
    title: '눈더미와 물고기',
    tip: '눈더미에서 멈추면 새로운 길이 보여요.',
    map: [
      'M . . . . .', //
      'F . . . F .',
      '. . R . . .',
      '. . . . a .',
      'A . * . . .',
      'R . . . . .',
    ],
    par: 5,
    solution: ['a<', 'a^', 'a>', 'a<', 'av'],
  },
  {
    id: 'ice-fish-by-sea',
    title: '바닷가 물고기',
    tip: '물고기가 바다 가까이에 있어요. 조심조심!',
    map: [
      '. . . . W . .', //
      '. . . . . F .',
      '. . . . . . .',
      '. . F . . . .',
      'R . . . . . .',
      'W . a . . . R',
      'R . R M A . .',
    ],
    par: 6,
    solution: ['a^', 'av', 'a>', 'a^', 'av', 'a<'],
  },
  {
    id: 'ice-stepping-snow',
    title: '눈더미 징검다리',
    tip: '눈더미 두 개를 징검다리처럼 써 보세요.',
    map: [
      '. . . . . . R', //
      '* . R . . . A',
      '. . . . . . .',
      '. . . . . . .',
      '. . . . * . .',
      '. . . . F . R',
      'M . a . . . .',
    ],
    par: 8,
    solution: ['a^', 'a>', 'av', 'a<', 'av', 'a^', 'a>', 'a^'],
  },
  {
    id: 'ice-three-fish',
    title: '물고기 세 마리',
    tip: '물고기 세 마리를 모두 먹고 집으로 가요.',
    map: [
      '. . . . R . .', //
      'F . a . . . F',
      '. . F . . . .',
      '. . R A . . R',
      '. . . . . R .',
      '. W . . . . .',
      '. . . W . . .',
    ],
    par: 9,
    solution: ['a<', 'a>', 'av', 'a<', 'a>', 'a^', 'a<', 'av', 'a<'],
  },
  {
    id: 'ice-big-adventure',
    title: '빙판 대모험',
    tip: '눈더미, 바다, 물고기 세 마리. 얼음 미끄럼 마지막 시험이에요!',
    map: [
      'R . . a . . A', //
      '. . . . * . R',
      '. . W . W . .',
      'R R . . . F .',
      '. . . F . . .',
      '. . . F . . .',
      '. . . . . . .',
    ],
    par: 11,
    solution: ['av', 'a^', 'a<', 'av', 'a<', 'a^', 'a>', 'a>', 'av', 'a^', 'a>'],
  },
];
const CH2: PenguinStageDef[] = [
  {
    id: 'ice-igloo-door',
    title: '이글루 통로',
    tip: '이글루 문으로 쏙 들어가면 같은 번호 이글루 문으로 쑥 나와요.',
    igloos: { '1': ['S', 'W'] },
    map: [
      '. . . R . .', //
      '. . . . . .',
      '. 1 . . . A',
      '. . . R . 1',
      '. . . . . .',
      '. a . . . .',
    ],
    par: 4,
    solution: ['a^', 'a^', 'a>', 'av'],
  },
  {
    id: 'ice-igloo-fish',
    title: '이글루 너머 물고기',
    tip: '이글루를 지나야 물고기에게 갈 수 있어요.',
    igloos: { '1': ['W', 'E'] },
    map: [
      '. . a . . . .', //
      '. . . . . . .',
      '. M . . . . R',
      '. . . . . . 1',
      '. 1 . . . F .',
      '. . . . . . .',
      '. R . . . . A',
    ],
    par: 6,
    solution: ['av', 'a>', 'a^', 'a<', 'a>', 'av'],
  },
  {
    id: 'ice-friend',
    title: '친구 펭귄',
    tip: '펭귄이 두 마리! 친구 펭귄에 부딪혀도 멈춰요. 펭귄을 눌러서 골라요.',
    map: [
      '. . . . . .', //
      'R . . . . .',
      'R R . . . b',
      '. . . . . .',
      'B . . . . .',
      'a . . . . A',
    ],
    par: 3,
    solution: ['a>', 'bv', 'b<'],
  },
  {
    id: 'ice-who-first',
    title: '누가 먼저?',
    tip: '누가 먼저 움직일까요? 순서가 중요해요.',
    map: [
      '. B . . . .', //
      '. * . . . .',
      '. . . . . .',
      'A . . a . b',
      'R . . R . .',
      '. . . . . .',
    ],
    par: 4,
    solution: ['a<', 'b<', 'b^', 'b^'],
  },
  {
    id: 'ice-friend-igloo',
    title: '친구와 이글루',
    tip: '이글루와 친구 펭귄을 함께 써요.',
    igloos: { '1': ['S', 'N'] },
    map: [
      '1 A M . . . .', //
      '. . a . . . .',
      'b . . . . . .',
      '. . . R . . R',
      'B . . . . . .',
      '. 1 . . . . .',
      '. . . . . . .',
    ],
    par: 5,
    solution: ['b^', 'a<', 'bv', 'b<', 'a^'],
  },
  {
    id: 'ice-two-igloos',
    title: '이글루 두 채',
    tip: '번호가 다른 이글루 두 쌍. 어느 문으로 들어갈까요?',
    igloos: { '1': ['S', 'S'], '2': ['N', 'N'] },
    map: [
      '. . a . F . .', //
      'F . . . . 1 R',
      '. . M A . . .',
      '. . . . 2 R .',
      'R . . . . . .',
      '. . 1 . . 2 M',
      '. . . . . . .',
    ],
    par: 8,
    solution: ['av', 'a<', 'a>', 'a^', 'av', 'a>', 'a^', 'a<'],
  },
  {
    id: 'ice-share-fish',
    title: '물고기 나눠 먹기',
    tip: '두 펭귄이 함께 물고기를 모두 먹어요. 어느 펭귄이 먹어도 괜찮아요.',
    map: [
      '. B . . . . .', //
      'A . . . . . .',
      'R . . . . . .',
      '. . . F . . F',
      'a R b . . . .',
      'R M . . . . .',
      '. R . . . . .',
    ],
    par: 7,
    solution: ['a^', 'a>', 'a^', 'a<', 'b^', 'b<', 'av'],
  },
  {
    id: 'ice-igloo-snow',
    title: '이글루와 눈더미',
    tip: '이글루에서 나와 눈더미에 멈춰 보세요.',
    map: [
      '. . . . . . R', //
      '. . R A . . .',
      '1 . . . . B .',
      '. . 1 . b . .',
      '. . . R . . .',
      '. . . . . . .',
      '* . . . . R a',
    ],
    igloos: { '1': ['E', 'E'] },
    par: 6,
    solution: ['a^', 'b>', 'av', 'b<', 'a^', 'a<'],
  },
  {
    id: 'ice-igloo-maze',
    title: '이글루 미로',
    tip: '이글루 두 쌍과 친구 펭귄. 멈춤판이 되어 줄 친구를 잘 세워요.',
    map: [
      '1 . . . . . R', //
      '. 2 . . . . a',
      '. . . 1 . . 2',
      '. . . b A . .',
      '. . . . . . B',
      '. . . R R . R',
      '. . M . R R .',
    ],
    igloos: { '1': ['S', 'W'], '2': ['E', 'W'] },
    par: 7,
    solution: ['a<', 'av', 'a>', 'a^', 'a<', 'bv', 'b>'],
  },
  {
    id: 'ice-three-friends',
    title: '이글루 대탈출',
    tip: '이글루 두 쌍과 눈더미. 두 펭귄을 모두 집으로! 이글루와 친구들 마지막 보스예요.',
    map: [
      '. . . . . . .', //
      'A . . . . . .',
      '1 . . b . a .',
      '. R . 2 . . .',
      '. . 1 . R . 2',
      '. . B . . * R',
      '. . . . . . R',
    ],
    igloos: { '1': ['E', 'S'], '2': ['W', 'N'] },
    par: 9,
    solution: ['b^', 'a<', 'bv', 'b<', 'a>', 'a^', 'a^', 'a<', 'av'],
  },
];
const CH3: PenguinStageDef[] = [
  {
    id: 'ice-ride-current',
    title: '해류 타기',
    tip: '해류 위를 지나면 화살표 쪽으로 방향이 바뀌어요.',
    map: [
      '. A . a . .', //
      '. . . . . .',
      '. . . . . .',
      '. . . . R M',
      '. ^ . . . .',
      '. < . . . .',
    ],
    par: 4,
    solution: ['av', 'a>', 'a^', 'a<'],
  },
  {
    id: 'ice-cracked',
    title: '금 간 얼음',
    tip: '금 간 얼음은 한 번 지나가면 깨져서 바다가 돼요.',
    map: [
      '. M . . A .', //
      '. . . . . .',
      '. . W . . x',
      '. . . . . .',
      'a . . . . .',
      'x R . R x .',
    ],
    par: 4,
    solution: ['a>', 'av', 'a<', 'a^'],
  },
  {
    id: 'ice-current-snow',
    title: '해류와 눈더미',
    tip: '해류를 타고 가다 눈더미에서 멈춰요.',
    map: [
      '. . . . M < .', //
      'R . . . . . .',
      '. . . . < . .',
      'a . . . . R M',
      '. . . . . M .',
      'A . . * . . >',
      '. R . . . . .',
    ],
    par: 6,
    solution: ['a>', 'av', 'a>', 'a^', 'a<', 'a<'],
  },
  {
    id: 'ice-breaking-path',
    title: '깨지는 길',
    tip: '금 간 얼음을 지나는 순서를 잘 생각해요. 한 번뿐이에요!',
    map: [
      'x R . . . . .', //
      'R . . . . . x',
      '. . F . . F .',
      '. . . M . . .',
      'A . x . . . .',
      '. . . M . . R',
      '. a . x . . .',
    ],
    par: 5,
    solution: ['a<', 'a^', 'a>', 'av', 'a<'],
  },
  {
    id: 'ice-current-igloo',
    title: '해류 이글루',
    tip: '해류를 타고 이글루로 쏙!',
    igloos: { '1': ['N', 'W'] },
    map: [
      '. . . . . . .', //
      '. . . . . . <',
      '. . . . F . .',
      '. M . . . a .',
      '. > . . . . .',
      'A . . . . . .',
      '. 1 . R . . 1',
    ],
    par: 7,
    solution: ['av', 'a<', 'a^', 'av', 'a>', 'av', 'a<'],
  },
  {
    id: 'ice-current-pair',
    title: '둘이서 해류',
    tip: '두 펭귄이 해류를 함께 타요.',
    map: [
      '. . . A b < .', //
      '. . R . . . R',
      'B a . . . . <',
      '. . . . . . .',
      '. < . . . . .',
      '. . . . . . .',
      '. R . . . . .',
    ],
    par: 5,
    solution: ['a^', 'a>', 'bv', 'b>', 'b^'],
  },
  {
    id: 'ice-tightrope',
    title: '바다 위 줄타기',
    tip: '해류, 금 간 얼음, 물고기. 한 번 깨진 얼음은 돌아오지 않아요.',
    map: [
      '. M . . . . .', //
      'x . . . . ^ .',
      'R . . a . . .',
      '. F . . R . .',
      'A . x . . . .',
      '. x . . F . .',
      '. . ^ . v . .',
    ],
    par: 9,
    solution: ['a<', 'av', 'a<', 'a^', 'a>', 'av', 'a>', 'a^', 'a<'],
  },
  {
    id: 'ice-breaking-bridge',
    title: '깨지는 다리',
    tip: '두 펭귄이 금 간 얼음을 나눠 써야 해요.',
    map: [
      '. . . B . . .', //
      '. . . . . R R',
      '. . . x . . a',
      '. . . . . . .',
      'A . . . . x x',
      'b . . x M . .',
      '. . . . . R .',
    ],
    par: 8,
    solution: ['b^', 'a<', 'a^', 'a>', 'a^', 'b>', 'av', 'a<'],
  },
  {
    id: 'ice-current-maze',
    title: '해류 미로',
    tip: '해류와 이글루, 친구 펭귄까지. 길이 빙글빙글 돌아요.',
    igloos: { '1': ['E', 'N'] },
    map: [
      '. . 1 . . . . A', //
      '. . . . . . . .',
      'a . . R . R . .',
      '. . . . . . . v',
      '. . . . B . . .',
      '> . . . . M . 1',
      '. . . . . . . .',
      '. b . ^ M . . .',
    ],
    par: 10,
    solution: ['b<', 'b^', 'b^', 'av', 'bv', 'av', 'a<', 'av', 'a>', 'a>'],
  },
  {
    id: 'ice-conquer',
    title: '얼음 나라 정복',
    tip: '해류, 금 간 얼음, 이글루, 펭귄 두 마리. 얼음 나라 마지막 보스예요!',
    map: [
      'R . . . . 1 .', //
      '. . . . . . .',
      'M . . a . . M',
      '. > . R x . .',
      '. 1 v . . . .',
      'B . x . . . A',
      '. ^ x . b . .',
    ],
    igloos: { '1': ['W', 'E'] },
    par: 8,
    solution: ['a>', 'av', 'a>', 'a^', 'b>', 'av', 'b<', 'b<'],
  },
];

const CHAPTER_DEFS: { title: string; blurb: string; color: string; stages: PenguinStageDef[] }[] = [
  { title: '얼음 미끄럼', blurb: '쓱 밀면 부딪힐 때까지 미끄러져요. 구멍 위에 딱 멈춰요.', color: '#3F8BD9', stages: CH1 },
  { title: '이글루와 친구들', blurb: '이글루로 쏙 들어가 다른 이글루로 쑥! 친구 펭귄을 멈춤판으로 써요.', color: '#8E6BD1', stages: CH2 },
  { title: '바다와 해류', blurb: '해류는 방향을 바꾸고, 금 간 얼음은 한 번 지나면 깨져요.', color: '#2FA3B8', stages: CH3 },
];

export const ICE_STAGE_DEFS: PenguinStageDef[] = CHAPTER_DEFS.flatMap((c) => c.stages);

export const ICE_CHAPTERS: Chapter[] = CHAPTER_DEFS.reduce<Chapter[]>((acc, c, i) => {
  const start = acc.length ? acc[acc.length - 1].start + acc[acc.length - 1].count : 0;
  return [...acc, { number: i + 1, title: c.title, blurb: c.blurb, color: c.color, start, count: c.stages.length }];
}, []).filter((c) => c.count > 0);

export const ICE_STAGES: PenguinStage[] = ICE_STAGE_DEFS.map((def, i) => {
  const stage = parsePenguinStage(def, i + 1);
  const ch = ICE_CHAPTERS.find((c) => i >= c.start && i < c.start + c.count)!;
  return { ...stage, label: `STAGE ${ch.number}-${i - ch.start + 1}` };
});
