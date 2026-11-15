import { writeFileSync } from 'node:fs';
import { LAB_STAGES } from '../src/lab/stages';
import { explore } from '../src/lab/reachability';
const stages = LAB_STAGES.map(stage => {
  const graph = explore(stage);
  if (graph.truncated || !graph.toWin.has(stage.start.join(','))) throw Error(stage.id);
  return { id: stage.id, kind: stage.kind, number: stage.number, par: stage.par,
    reachable: graph.states.size, finishable: graph.toWin.size,
    deadEnds: graph.states.size - graph.toWin.size, truncated: graph.truncated };
});
writeFileSync('docs/lab-stage-audit.json', JSON.stringify({ count: stages.length, stages }, null, 2) + '\n');
console.log(`${stages.length} complete state graphs verified`);
