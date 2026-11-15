import { Reef, solve, type CoralStage, type CoralState } from './model';
self.onmessage = (event: MessageEvent<{ stage: CoralStage; state: CoralState }>) => {
  try {
    const { stage, state } = event.data;
    const path = solve(new Reef(stage), state);
    self.postMessage({ color: path?.[0] ?? null });
  } catch { self.postMessage({ color: null }); }
};
