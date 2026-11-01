import { dailySpaceDef } from '../space/generate';

// Builds today's space puzzle off the main thread.
self.onmessage = (e: MessageEvent<string>) => {
  try {
    self.postMessage({ ok: true, def: dailySpaceDef(e.data) });
  } catch (err) {
    self.postMessage({ ok: false, error: String(err) });
  }
};
