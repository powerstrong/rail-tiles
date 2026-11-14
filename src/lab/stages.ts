import data from './stages.generated.json';
import type { Kind, Stage } from './model';
/** Fixed, audited experiments. No runtime randomness or stage locks. */
export const LAB_STAGES = data as unknown as Stage[];
export const stagesFor = (kind: Kind): Stage[] => LAB_STAGES.filter(stage => stage.kind === kind);
