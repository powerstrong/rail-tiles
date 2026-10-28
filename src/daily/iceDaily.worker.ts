import { dailyIceDef } from '../penguin/generate';

// Builds today's penguin puzzle off the main thread.
self.onmessage = (e: MessageEvent<string>) => {
  try {
    self.postMessage({ ok: true, def: dailyIceDef(e.data) });
  } catch (err) {
    self.postMessage({ ok: false, error: String(err) });
  }
};
