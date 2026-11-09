import type { CargoStage } from './model';
import { winEntries } from './useWinMap';

// Maps every yard a stage can reach off the main thread: [yard key, moves to clear][].
self.onmessage = (e: MessageEvent<CargoStage>) => {
  self.postMessage(winEntries(e.data));
};
