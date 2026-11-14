import type { Stage, State } from './model';
import { solve } from './solver';
self.onmessage = (event: MessageEvent<{ stage: Stage; state: State }>) => {
  try { self.postMessage({ ok: true, result: solve(event.data.stage, event.data.state) }); }
  catch { self.postMessage({ ok: false }); }
};
