/** Prints a shortest solution grid for the given stages: `vite-node scripts/shortest.ts <id> ...` */
import { solve } from '../src/engine/solver';
import { STAGES } from '../src/stages/stages';
import { draw, solutionGrid } from './draw';

for (const id of process.argv.slice(2)) {
  const stage = STAGES.find((s) => s.id === id);
  if (!stage) throw new Error(`unknown stage ${id}`);
  const res = solve(stage, 5000, true);
  const best = res.routes!.reduce((a, b) => (b.length < a.length ? b : a));
  console.log(`${id}: ${best.length} rails (listed par ${stage.par})\n${draw(stage, best)}`);
  console.log(JSON.stringify(solutionGrid(stage, best)));
}
