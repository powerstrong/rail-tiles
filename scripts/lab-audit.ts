import { writeFileSync } from 'node:fs';
import { LAB_STAGES } from '../src/lab/stages';
import { explore, reachability } from '../src/lab/reachability';
import { beeQuality } from './bee-quality';
const stages = LAB_STAGES.map(stage => {
  const graph = explore(stage);
  const common = { id: stage.id, kind: stage.kind, number: stage.number, par: stage.par };
  if (graph.bee) {
    if (reachability(graph, stage.start) !== 'possible') throw Error(stage.id);
    return { ...common, method: 'memoized current-cell + visited-mask proofs; not full enumeration',
      cols: stage.cols, rows: stage.rows, ...beeQuality(stage) };
  }
  if (graph.truncated || !graph.toWin.has(stage.start.join(','))) throw Error(stage.id);
  return { ...common, method: 'complete reachable graph', reachable: graph.states.size,
    finishable: graph.toWin.size, deadEnds: graph.states.size - graph.toWin.size, truncated: graph.truncated };
});
writeFileSync('docs/lab-stage-audit.json', JSON.stringify({ count: stages.length, stages }, null, 2) + '\n');
console.log(`${stages.length} stages verified (rabbit graphs, bee path proofs and quality samples)`);
