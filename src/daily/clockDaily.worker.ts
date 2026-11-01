import { dailyClockDef } from '../clock/generate';

// Builds today's clock puzzle off the main thread.
self.onmessage = (e: MessageEvent<string>) => {
  try {
    self.postMessage({ ok: true, def: dailyClockDef(e.data) });
  } catch (err) {
    self.postMessage({ ok: false, error: String(err) });
  }
};
