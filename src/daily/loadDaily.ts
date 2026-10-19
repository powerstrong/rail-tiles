import { dailyDef, dailyStageFromDef } from '../engine/generate';
import type { Stage, StageDef } from '../engine/stage';

// Bump the suffix whenever the generator changes, so old cached puzzles are rebuilt.
const CACHE_KEY = 'rail-tiles:daily:v1';

function readCache(date: string): StageDef | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const data = raw ? (JSON.parse(raw) as { date?: string; def?: StageDef }) : null;
    return data?.date === date && data.def ? data.def : null;
  } catch {
    return null;
  }
}

function writeCache(date: string, def: StageDef) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ date, def }));
  } catch {
    // Storage full or blocked: the puzzle is simply rebuilt next time.
  }
}

function buildInWorker(date: string): Promise<StageDef> {
  return new Promise((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL('./daily.worker.ts', import.meta.url), { type: 'module' });
    } catch (err) {
      reject(err);
      return;
    }
    worker.onmessage = (e: MessageEvent<{ ok: boolean; def?: StageDef; error?: string }>) => {
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

/** Today's puzzle: from the per-device cache, else built in a worker (or inline if workers fail). */
export async function loadDaily(date: string): Promise<Stage> {
  const cached = readCache(date);
  if (cached) {
    try {
      return dailyStageFromDef(cached);
    } catch {
      // Stale cache from an older generator: rebuild below.
    }
  }
  let def: StageDef;
  try {
    def = await buildInWorker(date);
  } catch {
    def = dailyDef(date);
  }
  writeCache(date, def);
  return dailyStageFromDef(def);
}
