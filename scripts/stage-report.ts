/**
 * Stage design helper: `npm run stages` prints, for every stage, how many winning
 * routes exist, the fewest rails needed, and one solution drawn on the map.
 * Aim for few routes (1–3) where the obvious-looking path does not fit the inventory.
 */
import { solve } from '../src/engine/solver';
import { STAGES } from '../src/stages/stages';
import { draw } from './draw';

for (const stage of STAGES) {
  const res = solve(stage, 5000);
  const inv = `straight ${stage.inventory.straight}, curve ${stage.inventory.curve}${stage.inventory.cross ? `, cross ${stage.inventory.cross}` : ''}`;
  console.log(`\n${stage.number}. ${stage.id} (${stage.width}×${stage.height}, ${inv})`);
  console.log(`   routes: ${res.count}${res.truncated ? '+' : ''}   fewest rails: ${res.minRails ?? '—'}`);
  console.log(draw(stage, res.first));
}
