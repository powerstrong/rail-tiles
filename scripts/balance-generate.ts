import { writeFileSync } from 'node:fs';
import { BALANCE_SEED, generateStages } from '../src/balance/generate';
const stages = generateStages();
writeFileSync(new URL('../src/balance/stages.generated.json', import.meta.url), JSON.stringify(stages, null, 2) + '\n');
console.log(`balance: ${stages.length} stages, seed ${BALANCE_SEED}`);
console.table(stages.map(s => ({ stage: s.number, candies: s.candies.length, scales: s.fixed.length, par: s.par, solution: s.solution.join(',') })));
