import { dailyDepotDef, dailyDepotStage } from '../depot/generate';
import type { DepotStage, DepotStageDef } from '../depot/model';
import { dailyLoader } from './dailyLoader';

/** Today's depot puzzle. */
export const loadDepotDaily = dailyLoader<DepotStageDef, DepotStage>({
  cacheKey: 'rail-tiles:depot-daily:v1',
  worker: () => new Worker(new URL('./depotDaily.worker.ts', import.meta.url), { type: 'module' }),
  build: dailyDepotDef,
  toStage: dailyDepotStage,
});
