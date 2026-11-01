import type { SpaceStage } from './model';
import { explore } from './solver';

// Maps every capsule layout of a stage off the main thread: [layout key, presses to dock][].
self.onmessage = (e: MessageEvent<SpaceStage>) => {
  const g = explore(e.data);
  self.postMessage(g.truncated ? null : [...g.toWin]);
};
