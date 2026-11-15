/** Offline curation metrics. No solver assistance, retracing, or recovery in random trials. */
import { BeeSearch } from '../src/lab/beeSearch';
import { forward } from '../src/lab/reachability';
import { actions, isWon, type Stage } from '../src/lab/model';
export function beeQuality(stage: Stage, trials = 20_000) {
  const search = new BeeSearch(stage);
  let state = stage.start, choices = 0, decisions = 0, unknown = 0;
  for (const action of stage.solution) {
    const options = actions(stage, state).map(a => forward(stage, state, a)).filter(v => v !== null);
    if (options.length > 1) {
      choices++;
      const results = options.map(v => search.query(v, 40_000, Infinity).answer);
      if (results.includes('possible') && results.includes('impossible')) decisions++;
      if (results.includes('unknown')) unknown++;
    }
    state = forward(stage, state, action)!;
  }
  let seed = 0xbeef0000 + stage.number, wins = 0;
  const random = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; };
  for (let trial = 0; trial < trials; trial++) {
    let at = stage.start[0], mask = 2 ** at, count = 1;
    const total = stage.par + 1;
    while (count < total) {
      const options = search.exits[at].filter(n => Math.floor(mask / search.bits[n]) % 2 === 0 && (n !== search.goal || count + 1 === total));
      if (!options.length) break;
      at = options[Math.floor(random() * options.length)]; mask += 2 ** at; count++;
    }
    if (count === total && at === search.goal) wins++;
  }
  if (!isWon(stage, state)) throw Error(stage.id);
  return { choices, decisions, unknown, trials, wins, randomRate: trials ? wins / trials : 0 };
}
