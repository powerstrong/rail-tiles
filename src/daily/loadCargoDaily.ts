import { dailyCargoDef, dailyCargoStage } from '../cargo/generate';
import type { CargoStage, CargoStageDef } from '../cargo/model';
import { dailyLoader } from './dailyLoader';

/** Today's freight yard. */
export const loadCargoDaily = dailyLoader<CargoStageDef, CargoStage>({
  cacheKey: 'rail-tiles:cargo-daily:v1',
  worker: () => new Worker(new URL('./cargoDaily.worker.ts', import.meta.url), { type: 'module' }),
  build: dailyCargoDef,
  toStage: dailyCargoStage,
});
