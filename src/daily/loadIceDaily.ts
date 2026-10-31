import { dailyIceDef, dailyIceStage } from '../penguin/generate';
import type { PenguinStage, PenguinStageDef } from '../penguin/model';
import { dailyLoader } from './dailyLoader';

/** Today's penguin puzzle. */
export const loadIceDaily = dailyLoader<PenguinStageDef, PenguinStage>({
  cacheKey: 'rail-tiles:ice-daily:v1',
  worker: () => new Worker(new URL('./iceDaily.worker.ts', import.meta.url), { type: 'module' }),
  build: dailyIceDef,
  toStage: dailyIceStage,
});
