import type { Progress } from './storage';
import { isUnlocked } from './ui/StageSelect';
import { WORLDS, type World, stageCards } from './worlds';

export interface ContinueTarget {
  world: World;
  index: number;
  /** The last stage itself (not cleared yet), or the next one after it was cleared. */
  resume: boolean;
  /** "강바람 철도 2-4" */
  text: string;
}

/** A stage label "STAGE 2-4" as "2-4". */
const shortLabel = (label: string | undefined, number: number) => label?.replace(/^STAGE\s*/, '') ?? String(number);

/**
 * Where "continue" takes the player: back into the stage they last opened if it is not cleared,
 * else the next open stage of that world not cleared yet (after it first, then from the start).
 * Null when nothing was played yet or that world is all cleared.
 */
export function continueTarget(progress: Pick<Progress, 'stars' | 'last'>, worlds: World[] = WORLDS): ContinueTarget | null {
  const last = progress.last;
  const world = last && worlds.find((w) => w.id === last.world);
  if (!world) return null;
  const at = world.stages.findIndex((s) => s.id === last!.stage);
  if (at < 0) return null;
  const cleared = new Set(Object.keys(progress.stars));
  const cards = stageCards(world);
  const make = (index: number, resume: boolean): ContinueTarget => ({
    world,
    index,
    resume,
    text: `${world.title} ${shortLabel(world.stages[index].label, index + 1)}`,
  });
  if (!cleared.has(world.stages[at].id)) return make(at, true);
  const order = [...world.stages.keys()].filter((i) => i > at).concat([...world.stages.keys()].filter((i) => i < at));
  const next = order.find((i) => !cleared.has(world.stages[i].id) && isUnlocked(cards, cleared, i));
  return next === undefined ? null : make(next, false);
}
