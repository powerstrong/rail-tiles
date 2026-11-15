import { writeFileSync } from 'node:fs';
import { generatePieces, PIECES_SEED } from '../src/pieces/generate';
const stages = generatePieces();
writeFileSync(new URL('../src/pieces/stages.generated.json', import.meta.url), JSON.stringify(stages, null, 2) + '\n');
console.log(`seed ${PIECES_SEED}: ${stages.length} stages`);
for (const s of stages) console.log(`${s.number}\t${s.title}\t${s.target.length} cells\t${s.pieces.length} pieces\tgreedy ${s.audit.greedyWins}/${s.audit.samples}\tdead starts ${s.audit.deadStarts}/${s.audit.legalStarts}`);
