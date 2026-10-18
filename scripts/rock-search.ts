/**
 * Finds 1–2 extra rocks that sharpen a stage's star spread (idea from a Codex puzzle review):
 *   vite-node scripts/rock-search.ts <stage-id> [maxRocks=2]
 * Enumerates all winning routes once, then for each rock placement keeps only routes that
 * avoid it, and reports placements leaving 1–2 ★★★ routes plus some ★★ and ★ routes.
 */
import { solve } from '../src/engine/solver';
import { TWO_STAR_SLACK } from '../src/engine/stars';
import { STAGES } from '../src/stages/stages';

const [id, maxArg = '2'] = process.argv.slice(2);
const stage = STAGES.find((s) => s.id === id);
if (!stage) throw new Error(`unknown stage ${id}`);
const routes = solve(stage, 100000, true).routes!;
const cells = stage.cells.flatMap((c, i) => (c.type === 'empty' && !c.waypoint ? [i] : []));
const used = routes.map((r) => new Set(r.map((p) => p.y * stage.width + p.x)));
const found: { rocks: number[][]; counts: number[]; min: number; total: number }[] = [];

const tryRocks = (rocks: number[]) => {
  const left = routes.flatMap((r, i) => (rocks.every((c) => !used[i].has(c)) ? [r] : []));
  if (!left.length) return;
  const min = Math.min(...left.map((r) => r.length));
  const counts = [0, 0, 0];
  for (const r of left) counts[r.length === min ? 0 : r.length <= min + TWO_STAR_SLACK ? 1 : 2]++;
  if (counts[0] <= 2 && counts[1] > 0 && counts[2] > 0) {
    found.push({ rocks: rocks.map((i) => [i % stage.width, Math.floor(i / stage.width)]), counts, min, total: left.length });
  }
};
const search = (rocks: number[], from: number) => {
  if (rocks.length) tryRocks(rocks);
  if (rocks.length >= Number(maxArg)) return;
  for (let i = from; i < cells.length; i++) search([...rocks, cells[i]], i + 1);
};
search([], 0);
found.sort((a, b) => a.rocks.length - b.rocks.length || a.counts[0] - b.counts[0] || b.total - a.total);
console.log(`${id}: ${routes.length} routes now; best rock placements:`);
for (const f of found.slice(0, 6)) console.log(`  rocks ${JSON.stringify(f.rocks)} → ★★★${f.counts[0]} ★★${f.counts[1]} ★${f.counts[2]} (min ${f.min}, ${f.total} routes)`);
