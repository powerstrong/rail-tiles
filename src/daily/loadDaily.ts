import { dailyDef, dailyStageFromDef } from '../engine/generate';
import type { Stage, StageDef } from '../engine/stage';
import { dailyLoader } from './dailyLoader';

/** Today's train puzzle. */
export const loadDaily = dailyLoader<StageDef, Stage>({
  cacheKey: 'rail-tiles:daily:v1',
  worker: () => new Worker(new URL('./daily.worker.ts', import.meta.url), { type: 'module' }),
  build: dailyDef,
  toStage: dailyStageFromDef,
});
