import { dailyDepotDef } from '../depot/generate';

// Builds today's depot puzzle off the main thread.
self.onmessage = (e: MessageEvent<string>) => {
  try {
    self.postMessage({ ok: true, def: dailyDepotDef(e.data) });
  } catch (err) {
    self.postMessage({ ok: false, error: String(err) });
  }
};
