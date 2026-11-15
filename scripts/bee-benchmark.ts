/** Shared Node/Chromium benchmark. Times the actual bounded entry query and current-state queries. */
import { BeeSearch } from '../src/lab/beeSearch';
import type { Stage } from '../src/lab/model';
export function benchmark(stages: Stage[], rounds = 20) {
  return stages.map(stage => {
    const entry: number[] = [], move: number[] = [];
    let entryUnknown = 0, moveUnknown = 0, maxMemo = 0, maxVisited = 0;
    const query = (search: BeeSearch, state: number[], times: number[]) => {
      const t = performance.now(), result = search.query(state);
      times.push(performance.now() - t);
      maxMemo = Math.max(maxMemo, search.memo.size); maxVisited = Math.max(maxVisited, search.visited);
      return result.answer;
    };
    // Warm the engine before timing; each sample still gets an empty memo.
    new BeeSearch(stage).query(stage.start);
    for (let i = 0; i < rounds; i++) {
      const t = performance.now(), search = new BeeSearch(stage), result = search.query(stage.start);
      entry.push(performance.now() - t);
      maxMemo = Math.max(maxMemo, search.memo.size); maxVisited = Math.max(maxVisited, search.visited);
      if (result.answer === 'unknown') entryUnknown++;
      let state = stage.start;
      for (const action of stage.solution) {
        for (const n of search.neighbors[state.at(-1)!]) {
          if (state.includes(n) || (n === search.goal && state.length !== stage.par)) continue;
          if (query(search, [...state, n], move) === 'unknown') moveUnknown++;
        }
        state = [...state, action];
      }
    }
    const stats = (values: number[]) => {
      const sorted = values.sort((a, b) => a - b);
      return { p50: sorted[Math.floor(sorted.length * .5)], p95: sorted[Math.floor(sorted.length * .95)], max: sorted.at(-1)! };
    };
    return { id: stage.id, entryMs: stats(entry), moveMs: stats(move), entrySamples: entry.length,
      moveSamples: move.length, entryUnknown, moveUnknown, maxMemo, maxVisited };
  });
}
