import data from './stages.generated.json';
import bee50 from './bee50/stages.generated.json';
import type { Kind, Stage } from './model';
/** Fixed, audited puzzles shared by the two official worlds. No runtime randomness. */
export const LAB_STAGES = [...data, ...bee50] as unknown as Stage[];
export const stagesFor = (kind: Kind): Stage[] => LAB_STAGES.filter(stage => stage.kind === kind);
