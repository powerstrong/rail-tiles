import { dailyDef } from '../engine/generate';

// Builds the daily puzzle off the main thread: the solver search can take a second on a phone.
self.onmessage = (e: MessageEvent<string>) => {
  try {
    self.postMessage({ ok: true, def: dailyDef(e.data) });
  } catch (err) {
    self.postMessage({ ok: false, error: String(err) });
  }
};
