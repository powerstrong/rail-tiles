/**
 * Searches extra rails per stage so the star rating has spread:
 *   vite-node scripts/tune-stars.ts [maxExtra] [stage-id ...]
 * For each stage, tries adding 0..maxExtra straights and curves and lists the best
 * options: few ★★★ routes (the puzzle stays a puzzle), but some ★★ and ★ routes
 * (a sloppy clear is possible and is rated lower).
 */
import { solve } from '../src/engine/solver';
import { parseStage } from '../src/engine/stage';
import { TWO_STAR_SLACK } from '../src/engine/stars';
import { STAGE_DEFS } from '../src/stages/stages';

const [maxArg = '4', ...ids] = process.argv.slice(2);
const MAX = Number(maxArg);

for (const def of STAGE_DEFS) {
  if (ids.length && !ids.includes(def.id)) continue;
  const options = [];
  for (let es = 0; es <= MAX; es++) {
    for (let ec = 0; ec <= MAX; ec++) {
      if (def.inventory.curve === 0 && ec > 0) continue; // keep straight-only tutorials straight-only
      const inventory = { ...def.inventory, straight: def.inventory.straight + es, curve: def.inventory.curve + ec };
      const stage = parseStage({ ...def, inventory }, 0);
      const res = solve(stage, 1500, true);
      let three = 0;
      let two = 0;
      let one = 0;
      for (const r of res.routes ?? []) {
        if (r.length <= stage.par) three++;
        else if (r.length <= stage.par + TWO_STAR_SLACK) two++;
        else one++;
      }
      const score = (three > 2 ? 100 * three : 0) + (two > 0 ? 0 : 50) + (one > 0 ? 0 : 30) + (es + ec) * 2 + (res.count > 80 ? 15 : 0);
      options.push({ es, ec, three, two, one, total: res.count, score });
    }
  }
  options.sort((a, b) => a.score - b.score);
  // With --spread, list only options that actually produce ★★ and ★ clears, fewest ★★★ first.
  const pool = process.env.SPREAD
    ? options.filter((o) => o.two > 0 && o.one > 0).sort((a, b) => a.three - b.three || a.es + a.ec - (b.es + b.ec))
    : options;
  const best = pool
    .slice(0, process.env.SPREAD ? 5 : 3)
    .map((o) => `+s${o.es} +c${o.ec} → ★★★${o.three} ★★${o.two} ★${o.one} (${o.total})`)
    .join('  |  ');
  console.log(`${def.id.padEnd(18)} ${best}`);
}
