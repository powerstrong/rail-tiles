/** Rebuild checked proof traces: npx vite-node scripts/cloud-generate.ts */
import { writeFileSync } from 'node:fs';
import { CLOUD_STAGES } from '../src/cloud/stages';
import { countSolutions, isComplete, lines, solveByLines } from '../src/cloud/model';
const SEED = 0xc10d2026;
let seed = SEED;
const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
const stages = CLOUD_STAGES.map(stage => {
  if (countSolutions(stage.clues) !== 1 || !solveByLines(stage.clues)) throw Error(`Unproved: ${stage.id}`);
  const state = Array(stage.rows * stage.cols).fill(0);
  const solution: { cell: number; value: number; axis: string; line: number; candidates: number }[] = [];
  while (!isComplete(stage.clues, state)) {
    const choices = lines(stage.clues, state).flatMap(line => line.cells.flatMap((cell, k) => {
      if (state[cell] || !line.candidates.length || !line.candidates.every(p => p[k] === line.candidates[0][k])) return [];
      return [{ cell, value: line.candidates[0][k] ? 1 : 2, axis: line.axis, line: line.index, candidates: line.candidates.length }];
    }));
    if (!choices.length) throw Error(`Stalled: ${stage.id}`);
    const next = choices[Math.floor(random() * choices.length)];
    state[next.cell] = next.value; solution.push(next);
  }
  if (!state.every((v, i) => (v === 1 ? 1 : 0) === stage.goal[i])) throw Error(`Wrong replay: ${stage.id}`);
  return { id: stage.id, solution };
});
writeFileSync(new URL('../src/cloud/proofs.generated.json', import.meta.url), `${JSON.stringify({ seed: SEED, stages }, null, 2)}\n`);
console.log(`cloud: ${stages.length} unique puzzles, line-only proof and replay verified; seed=${SEED}`);
