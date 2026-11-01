import { dailySpaceDef, dailySpaceStage } from '../space/generate';
import type { SpaceStage, SpaceStageDef } from '../space/model';
import { dailyLoader } from './dailyLoader';

/** Today's space puzzle. */
export const loadSpaceDaily = dailyLoader<SpaceStageDef, SpaceStage>({
  cacheKey: 'rail-tiles:space-daily:v1',
  worker: () => new Worker(new URL('./spaceDaily.worker.ts', import.meta.url), { type: 'module' }),
  build: dailySpaceDef,
  toStage: dailySpaceStage,
});
