import { act, actions, type Stage } from '../model';
import { BeeSearch } from '../beeSearch';
/** Compare the SAME prefixes with/without arrows. Count only choices whose plain
 * continuation really wins: this distinguishes a new planning decision from a decorative arrow. */
export function arrowQuality(stage: Stage) {
  if (!stage.arrows) return { exitChoices: 0, preserveExitDecisions: 0 };
  const plain = { ...stage, arrows: undefined }, restricted = new BeeSearch(stage), unrestricted = new BeeSearch(plain);
  let state = stage.start, exitChoices = 0, preserveExitDecisions = 0;
  for (const action of stage.solution) {
    for (const n of actions(plain, state)) {
      const next = act(plain, state, n);
      if (!next || next.length <= state.length || unrestricted.query(next, 50_000, Infinity).answer !== 'possible') continue;
      if (!act(stage, state, n)) exitChoices++;
      else if (restricted.query(next, 50_000, Infinity).answer === 'impossible') preserveExitDecisions++;
    }
    state = act(stage, state, action)!;
  }
  return { exitChoices, preserveExitDecisions };
}
