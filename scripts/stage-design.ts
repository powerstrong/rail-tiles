/**
 * Stage design sweep: `npm run stage-design -- <file.ts>` where the file default-exports
 * StageDef drafts. For each draft, prints the number of winning routes for every
 * inventory (straight × curve) near the minimum, so a tight inventory with few
 * routes can be chosen.
 */
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { solve } from '../src/engine/solver';
import { type StageDef, parseStage } from '../src/engine/stage';
import { draw, solutionGrid } from './draw';

const file = process.argv[2];
if (!file) throw new Error('usage: stage-design <drafts.ts>');
const drafts: StageDef[] = (await import(pathToFileURL(resolve(file)).href)).default;

for (const def of drafts) {
  const open = parseStage({ ...def, inventory: { straight: 30, curve: 30 } }, 0);
  const free = solve(open, 20000);
  console.log(`\n== ${def.id}: unlimited routes ${free.count}${free.truncated ? '+' : ''}, fewest rails ${free.minRails}`);
  const header = '  s\c ' + Array.from({ length: 13 }, (_, c) => String(c).padStart(5)).join('');
  console.log(header);
  for (let s = 0; s <= 12; s++) {
    const cells: string[] = [];
    let any = false;
    for (let c = 0; c <= 12; c++) {
      const n = solve(parseStage({ ...def, inventory: { straight: s, curve: c } }, 0), 999).count;
      if (n > 0) any = true;
      cells.push((n === 0 ? '.' : n >= 999 ? '999+' : String(n)).padStart(5));
    }
    if (any) console.log(String(s).padStart(5) + ' ' + cells.join(''));
  }
  const chosen = solve(parseStage(def, 0), 999, true);
  console.log(`  chosen inventory s${def.inventory.straight} c${def.inventory.curve}: ${chosen.count} route(s), min ${chosen.minRails}`);
  const shown = chosen.count > 0 && chosen.count <= 4 ? chosen.routes! : [chosen.first ?? free.first];
  shown.forEach((route, i) => console.log(`  route ${i + 1}:
${draw(parseStage(def, 0), route)}`));
  if (chosen.first) console.log('  solution: ' + JSON.stringify(solutionGrid(parseStage(def, 0), chosen.first), null, 0));
}
