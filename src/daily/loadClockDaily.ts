import { dailyClockDef, dailyClockStage } from '../clock/generate';
import type { ClockStage, ClockStageDef } from '../clock/model';
import { dailyLoader } from './dailyLoader';

/** Today's clock puzzle. */
export const loadClockDaily = dailyLoader<ClockStageDef, ClockStage>({
  cacheKey: 'rail-tiles:clock-daily:v1',
  worker: () => new Worker(new URL('./clockDaily.worker.ts', import.meta.url), { type: 'module' }),
  build: dailyClockDef,
  toStage: dailyClockStage,
});
