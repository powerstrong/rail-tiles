/** How one world builds and caches its daily puzzle. */
export interface DailyLoaderSpec<Def, S> {
  /** Per-device cache key. Bump its suffix whenever the generator changes, so old cached puzzles are rebuilt. */
  cacheKey: string;
  /**
   * Starts the worker that builds the definition for a date. Write it as
   * `new Worker(new URL('./x.worker.ts', import.meta.url), { type: 'module' })` so Vite bundles the worker.
   */
  worker: () => Worker;
  /** The same build on the main thread, used when workers fail. */
  build: (date: string) => Def;
  /** Turns a definition (fresh or cached) into a playable stage; may throw on a stale cache. */
  toStage: (def: Def) => S;
}

/**
 * Today's puzzle loader: from the per-device cache, else built in a worker (or inline if
 * workers fail). Only the latest day is kept.
 */
export function dailyLoader<Def, S>(spec: DailyLoaderSpec<Def, S>): (date: string) => Promise<S> {
  /** The date last asked for: a build for another day that finishes late (around midnight) is not cached. */
  let latest = '';

  function readCache(date: string): Def | null {
    try {
      const raw = localStorage.getItem(spec.cacheKey);
      const data = raw ? (JSON.parse(raw) as { date?: string; def?: Def }) : null;
      return data?.date === date && data.def ? data.def : null;
    } catch {
      return null;
    }
  }

  function writeCache(date: string, def: Def) {
    if (date !== latest) return;
    try {
      localStorage.setItem(spec.cacheKey, JSON.stringify({ date, def }));
    } catch {
      // Storage full or blocked: the puzzle is simply rebuilt next time.
    }
  }

  function buildInWorker(date: string): Promise<Def> {
    return new Promise((resolve, reject) => {
      let worker: Worker;
      try {
        worker = spec.worker();
      } catch (err) {
        reject(err);
        return;
      }
      worker.onmessage = (e: MessageEvent<{ ok: boolean; def?: Def; error?: string }>) => {
        worker.terminate();
        if (e.data.ok && e.data.def) resolve(e.data.def);
        else reject(new Error(e.data.error));
      };
      worker.onerror = (e) => {
        worker.terminate();
        reject(e);
      };
      worker.postMessage(date);
    });
  }

  return async (date) => {
    latest = date;
    const cached = readCache(date);
    if (cached) {
      try {
        return spec.toStage(cached);
      } catch {
        // Stale cache from an older generator: rebuild below.
      }
    }
    let def: Def;
    try {
      def = await buildInWorker(date);
    } catch {
      def = spec.build(date);
    }
    writeCache(date, def);
    return spec.toStage(def);
  };
}
