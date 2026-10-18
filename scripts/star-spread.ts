/**
 * How winning routes spread over rail counts — i.e. whether the star rating can tell
 * a sloppy clear from an optimal one.
 *
 *   vite-node scripts/star-spread.ts [extraStraight] [extraCurve] [stage-id ...]
 *
 * Adds the extras to each stage's inventory (default 0 0) and prints, per stage, how
 * many routes need par rails (★★★), par+1..+2 (★★) and more (★).
 */
import { solve } from '../src/engine/solver';
import { type StageDef, parseStage } from '../src/engine/stage';
import { TWO_STAR_SLACK } from '../src/engine/stars';
import { STAGE_DEFS } from '../src/stages/stages';

const [es = '0', ec = '0', ...ids] = process.argv.slice(2);
const LIMIT = 4000;

function spread(def: StageDef) {
  const stage = parseStage(def, 0);
  const res = solve(stage, LIMIT, true);
  const counts = { three: 0, two: 0, one: 0 };
  for (const r of res.routes ?? []) {
    if (r.length <= stage.par) counts.three++;
    else if (r.length <= stage.par + TWO_STAR_SLACK) counts.two++;
    else counts.one++;
  }
  return { ...counts, total: res.count, truncated: res.truncated, par: stage.par, min: res.minRails };
}

for (const def of STAGE_DEFS) {
  if (ids.length && !ids.includes(def.id)) continue;
  const inv = { ...def.inventory, straight: def.inventory.straight + Number(es), curve: def.inventory.curve + Number(ec) };
  const s = spread({ ...def, inventory: inv });
  const tag = s.min !== s.par ? `  !! par ${s.par} but min ${s.min}` : '';
  console.log(
    `${def.id.padEnd(18)} s${String(inv.straight).padStart(2)} c${String(inv.curve).padStart(2)}  par ${String(s.par).padStart(2)}  ` +
      `★★★ ${String(s.three).padStart(4)}  ★★ ${String(s.two).padStart(4)}  ★ ${String(s.one).padStart(4)}  (routes ${s.total}${s.truncated ? '+' : ''})${tag}`,
  );
}
