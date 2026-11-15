import { actions, isWon, move, solve, totals, type BalanceStage, type Side, type State } from './model';

export const BALANCE_SEED = 0x5a7ca7;
const titles = [
  '별사탕 하나, 톡!', '작은 별의 힘', '하나와 둘을 모아요', '같은 무게, 다른 모양', '큰 별? 작은 별?',
  '양쪽을 살펴요', '바꾸어 나누기', '셋이 모이면', '가벼운 별의 반전', '별사탕 잔치',
  '움직이지 않는 추', '추도 함께 세어요', '작은 쪽을 도와요', '한쪽에 남겨 두기', '추와 별의 짝',
  '둘을 모아 하나처럼', '무거운 쪽에서 출발', '주고받는 별사탕', '다른 모양 같은 합', '황금 추의 초대',
  '짝꿍 별은 함께!', '두 저울에 인사', '여기를 누르면 저기도', '둘 다 가벼워질까?', '한쪽씩 살펴요',
  '짝꿍을 먼저 볼까?', '남겨 둘 별 찾기', '두 저울의 약속', '작은 별들의 협동', '쌍둥이 별 축제',
];
export const CHAPTER_TITLES = ['톡! 나누는 별사탕', '가만히 있는 황금 추', '함께 움직이는 짝꿍 저울'];
export const DISCOVERIES = [
  '사탕을 톡 누르면 반대 접시로! 두 합을 같게 만들어요.',
  '자물쇠 추는 움직이지 않아요. 추의 무게도 합에 들어가요.',
  '같은 ○·◇ 표식은 짝꿍! 하나를 누르면 다른 저울의 짝도 옮겨져요.',
];
const pars = [1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 1, 2, 2, 2, 3, 3, 3, 3, 4, 4, 1, 2, 2, 3, 3, 3, 4, 4, 4, 5];

/** Offline generator. All random choices use this fixed seed, never Math.random. */
export function generateStages(seed = BALANCE_SEED): BalanceStage[] {
  let value = seed >>> 0;
  const random = (n: number) => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return Math.floor(value / 0x100000000 * n); };
  const make = (number: number): BalanceStage => ({
    // Preserve archived IDs, including stars already carried in a regular progress save.
    id: `lab-v1-balance-${number}`, number, title: titles[number - 1],
    label: `STAGE ${Math.ceil(number / 10)}-${(number - 1) % 10 + 1}`,
    candies: [], fixed: [], start: [], solution: [], par: pars[number - 1], discovery: DISCOVERIES[Math.floor((number - 1) / 10)],
  });
  const result: BalanceStage[] = [];
  for (let number = 1; number <= 30; number++) {
    const chapter = Math.floor((number - 1) / 10), within = (number - 1) % 10;
    for (let trial = 0; trial < 100_000; trial++) {
      const stage = make(number), count = chapter === 0 ? Math.min(7, 3 + Math.floor(within / 2)) : chapter === 1 ? Math.min(8, 4 + Math.floor(within / 2)) : Math.min(5, 3 + Math.floor(within / 4));
      const scales = chapter === 2 ? 2 : 1;
      let group = chapter === 2 ? (within < 2 ? 1 : 2) : 0;
      const goal: State = [];
      for (let scale = 0; scale < scales; scale++) {
        stage.fixed.push([0, 0]);
        for (let i = 0; i < count; i++) {
          const linked = chapter === 2 && i < (within < 2 ? 1 : 2);
          stage.candies.push({ weight: 1 + random(chapter === 0 ? Math.min(5, 2 + Math.floor(within / 2)) : Math.min(6, 3 + Math.floor(within / 3))), scale, group: linked ? i : group++ });
          goal.push(random(2) as Side);
        }
      }
      if (number === 1) {
        stage.candies = [2, 1, 1].map((weight, group) => ({ weight, group, scale: 0 }));
        stage.start = [1, 1, 1];
      } else if (number === 2) {
        stage.candies = [1, 2, 3].map((weight, group) => ({ weight, group, scale: 0 }));
        stage.start = [1, 0, 1];
      } else {
        const sums = totals(stage, goal);
        if (chapter === 0 && sums[0][0] !== sums[0][1]) continue;
        if (chapter > 0) {
          if (sums.some(([a, b]) => Math.abs(a - b) > 5 || a === b)) continue;
          stage.fixed = sums.map(([a, b]) => a > b ? [0, a - b] : [b - a, 0]);
        }
        if (totals(stage, goal).some(([a]) => a > (chapter === 0 ? 12 : 16))) continue;
        stage.start = [...goal];
        const groups = actions(stage), chosen = new Set<number>();
        while (chosen.size < stage.par) chosen.add(groups[random(groups.length)]);
        for (const g of chosen) stage.start = move(stage, stage.start, g);
        if (chapter === 2 && totals(stage, stage.start).some(([a, b]) => a === b)) continue;
      }
      if (number === 3) {
        stage.candies = [1, 1, 2, 2].map((weight, group) => ({ weight, group, scale: 0 }));
        stage.start = [1, 1, 1, 1];
      }
      const solution = solve(stage);
      if (!solution || solution.length !== stage.par || isWon(stage, stage.start)) continue;
      if (chapter === 2) {
        // Every nearest solution must use a linked pair; it cannot be an unrelated two-board exercise.
        // Directly enumerate subsets of loose groups, leaving pairs fixed.
        const loose = actions(stage).filter(g => stage.candies.filter(c => c.group === g).length === 1);
        let canSkipPairs = false;
        for (let mask = 0; mask < 2 ** loose.length; mask++) {
          let state = [...stage.start];
          for (let j = 0; j < loose.length; j++) if (mask & (1 << j)) state = move(stage, state, loose[j]);
          if (isWon(stage, state)) { canSkipPairs = true; break; }
        }
        if (canSkipPairs) continue;
      }
      stage.solution = solution; result.push(stage); break;
    }
    if (result.length !== number) throw new Error(`No candidate for balance ${number}`);
  }
  return result;
}
