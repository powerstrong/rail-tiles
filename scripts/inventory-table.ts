/**
 * Route counts around a stage's current inventory: `vite-node scripts/inventory-table.ts <stage-id> [radius]`.
 * Rows are straight rails, columns curve rails; `*` marks the current inventory.
 */
import { solve } from '../src/engine/solver';
import { parseStage } from '../src/engine/stage';
import { STAGE_DEFS } from '../src/stages/stages';

const [id, r = '2'] = process.argv.slice(2);
const def = STAGE_DEFS.find((d) => d.id === id);
if (!def) throw new Error(`unknown stage ${id}`);
const radius = Number(r);
const { straight: s0, curve: c0 } = def.inventory;
console.log(`${id}: inventory s${s0} c${c0}`);
console.log('  s\c ' + Array.from({ length: radius * 2 + 1 }, (_, i) => String(c0 - radius + i).padStart(6)).join(''));
for (let s = s0 - radius; s <= s0 + radius; s++) {
  const row: string[] = [];
  for (let c = c0 - radius; c <= c0 + radius; c++) {
    if (s < 0 || c < 0) {
      row.push(''.padStart(6));
      continue;
    }
    const res = solve(parseStage({ ...def, inventory: { ...def.inventory, straight: s, curve: c } }, 0), 999);
    const cell = res.count === 0 ? '.' : `${res.count >= 999 ? '999+' : res.count}`;
    row.push(((s === s0 && c === c0 ? '*' : '') + cell).padStart(6));
  }
  console.log(String(s).padStart(5) + ' ' + row.join(''));
}
