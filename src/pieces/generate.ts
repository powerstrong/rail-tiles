import { candidates, normalize, occupied, orientations, shape, shapeKey, solve, type Cell, type PiecesStage, type Pose } from './model';
export const PIECES_SEED = 0x51ece530;
export function random(seed: number) {
  let state = seed >>> 0;
  return () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 4294967296; };
}
type Spec = [string, PiecesStage['picture'], string[], number];
/** Hand-drawn silhouettes; only their connected 2–5-cell dissection is generated. */
export const SPECS: Spec[] = [
  ['작은 물고기', 'fish', ['..#.','.###','##..'], 2],
  ['종이배', 'boat', ['..#..','..##.','#####','.###.'], 3],
  ['고개 든 새', 'bird', ['.##..','.###.','####.','.##..'], 3],
  ['꼬마 자동차', 'car', ['.###.','#####','.#.#.'], 3],
  ['꼬리를 찾아요', 'cat', ['.#.#.','.###.','####.','###..'], 4],
  ['통통 물고기', 'fish', ['..##..','.#####','#####.','..##..'], 4],
  ['돛을 돌려요', 'boat', ['..#...','..##..','..###.','######','.####.'], 5],
  ['날개를 펴요', 'bird', ['...#..','..###.','#####.','.####.','..#.#.'], 4],
  ['숲속 거북이', 'turtle', ['.####.','######','#####.','.#..#.'], 5],
  ['출발! 작은 로켓', 'rocket', ['..#..','.###.','.###.','#####','##.##','.###.'], 5],
  ['창문 있는 버스', 'car', ['######','##..##','######','.#..#.'], 4],
  ['구멍 난 돛', 'boat', ['..##..','..#.#.','..###.','######','.####.'], 5],
  ['동그란 등껍질', 'turtle', ['.####.','##..##','######','.####.','.#..#.'], 5],
  ['고양이의 두 팔', 'cat', ['.#..#.','.####.','##..##','######','.####.'], 5],
  ['우주 창문', 'rocket', ['..##..','.####.','.#..#.','.####.','######','.#..#.'], 5],
  ['바람 부는 항구', 'boat', ['..#...','..##..','..#.#.','..###.','######','.####.'], 5],
  ['날개 사이', 'bird', ['...#..','..###.','###.##','######','..##..','..#...'], 5],
  ['물결 물고기', 'fish', ['..###.','.##.##','######','#####.','..##..'], 5],
  ['달리는 창문', 'car', ['.####.','##..##','######','######','.#..#.'], 5],
  ['별빛 우주선', 'rocket', ['..##..','.####.','.####.','##..##','######','.#..#.'], 6],
  ['뒤집어 보는 새', 'bird', ['..#..','.###.','#####','###..','.#...'], 4],
  ['거울 속 고양이', 'cat', ['.#..#.','.####.','######','#####.','#####.','.#..#.'], 6],
  ['반대쪽 돛', 'boat', ['...#...','...##..','...###.','...#.#.','#######','.#####.'], 5],
  ['바다 거북의 여행', 'turtle', ['..###..','.#####.','#######','.#####.','.#...#.'], 5],
  ['생각을 돌려요', 'fish', ['..####.','.######','#######','.#####.','...##..'], 6],
  ['우주를 향해', 'rocket', ['...#...','..###..','.#####.','.##.##.','#######','##...##'], 6],
  ['큰 날갯짓', 'bird', ['...##..','..####.','#######','.#####.','..###..','..#.#..'], 6],
  ['긴 버스의 여행', 'car', ['.#####.','#######','##.#.##','#######','.#...#.'], 6],
  ['달빛 고양이', 'cat', ['.#...#.','.#####.','#######','.######','######.','.#...#.'], 7],
  ['그림 조각 축제', 'turtle', ['..###..','.#####.','#######','#######','.#####.','.#...#.'], 7],
];
const cellKey = ([x, y]: Cell) => `${x},${y}`;
function partition(cells: Cell[], count: number, max: number, rng: () => number, budget = { left: 1500 }): Cell[][] | null {
  if (--budget.left < 0) return null;
  if (!count) return cells.length ? null : [];
  if (cells.length < count * 2 || cells.length > count * max) return null;
  const sizes = Array.from({ length: max - 1 }, (_, i) => i + 2).sort(() => rng() - .5);
  const available = new Set(cells.map(cellKey));
  for (const size of sizes) {
    if (cells.length - size < (count - 1) * 2 || cells.length - size > (count - 1) * max) continue;
    // Grow connected candidates from the first remaining cell, keeping the whole partition connected per piece.
    for (let attempt = 0; attempt < 30; attempt++) {
      const picked: Cell[] = [cells[0]], seen = new Set([cellKey(cells[0])]);
      while (picked.length < size) {
        const frontier = picked.flatMap(([x, y]) => [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]] as Cell[]).filter(c => available.has(cellKey(c)) && !seen.has(cellKey(c)));
        if (!frontier.length) break;
        const c = frontier[Math.floor(rng() * frontier.length)]; picked.push(c); seen.add(cellKey(c));
      }
      if (picked.length !== size) continue;
      const rest = partition(cells.filter(c => !seen.has(cellKey(c))), count - 1, max, rng, budget);
      if (rest) return [picked, ...rest];
    }
  }
  return null;
}
/** No undo, hints or correction: uniformly choose among all legal remaining piece placements. */
export function greedyAudit(s: PiecesStage, samples = 600) {
  const rng = random(0xa0d17000 + s.number), all = candidates(s);
  let wins = 0;
  for (let sample = 0; sample < samples; sample++) {
    let used = 0n, taken = 0;
    for (let step = 0; step < s.pieces.length; step++) {
      const options = all.flatMap((list, i) => taken & (1 << i) ? [] : list.filter(c => !(c.mask & used)).map(c => ({ ...c, i })));
      if (!options.length) break;
      const c = options[Math.floor(rng() * options.length)]; used |= c.mask; taken |= 1 << c.i;
    }
    if (taken === (1 << s.pieces.length) - 1) wins++;
  }
  return wins;
}
export function generatePieces(): PiecesStage[] {
  const rng = random(PIECES_SEED), stages: PiecesStage[] = [];
  for (const [at, [title, picture, rows, count]] of SPECS.entries()) {
    const target = rows.flatMap((row, y) => [...row].flatMap((c, x): Cell[] => c === '#' ? [[x, y]] : []));
    const number = at + 1, allowFlip = number > 20;
    let accepted = false;
    for (let attempt = 0; attempt < 1500; attempt++) {
      const parts = partition(target, count, number <= 10 ? 4 : 5, rng);
      if (!parts) continue;
      const pieces = parts.map(cells => ({ cells: shape({ cells: normalize(cells) }, number === 1 ? 0 : Math.floor(rng() * 4), allowFlip && rng() < .5) }));
      const solution: Pose[] = parts.map((cells, i) => {
        const o = orientations(pieces[i], allowFlip).find(o => shapeKey(o.cells) === shapeKey(cells))!;
        return { x: Math.min(...cells.map(c => c[0])), y: Math.min(...cells.map(c => c[1])), turn: o.turn, flip: o.flip };
      });
      const s: PiecesStage = { id: `pieces-${number}`, title, label: `STAGE ${Math.floor(at / 10) + 1}-${at % 10 + 1}`, number, cols: rows[0].length, rows: rows.length, target, pieces, solution, allowFlip, par: count, picture, audit: { greedyWins: 0, samples: 600, legalStarts: 0, deadStarts: 0 } };
      if (number > 1 && pieces.every(p => orientations(p, false).length === 1)) continue;
      // The reflection lesson and final board must actually require a reflected piece.
      if ([21, 30].includes(number)) {
        const without = solve({ ...s, allowFlip: false });
        if (without.solution || without.exhausted) continue;
      }
      const wins = greedyAudit(s);
      if (number > 1 && wins > (number <= 10 ? 210 : 90)) continue;
      s.audit.greedyWins = wins;
      const all = candidates(s);
      s.audit.legalStarts = all.reduce((n, list) => n + list.length, 0);
      for (let i = 0; i < all.length; i++) for (const c of all[i]) {
        const fixed = pieces.map((): Pose | null => null); fixed[i] = c.pose;
        const result = solve(s, fixed);
        if (result.exhausted) throw new Error(`Audit budget: ${number}`);
        if (!result.solution) s.audit.deadStarts++;
      }
      if (number > 1 && !s.audit.deadStarts) continue;
      // Replaying generated poses uses the same absolute-cell model as input.
      if (new Set(solution.flatMap((p, i) => occupied(pieces[i], p).map(cellKey))).size !== target.length) throw new Error('Bad partition');
      stages.push(s); accepted = true; console.log(`accepted ${number}`); break;
    }
    if (!accepted) throw new Error(`Could not generate stage ${number}, area ${target.length}, pieces ${count}`);
  }
  return stages;
}
