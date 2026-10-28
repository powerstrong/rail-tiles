import { dailyIceDef, dailyIceStage } from '../penguin/generate';
import type { PenguinStage, PenguinStageDef } from '../penguin/model';

// Bump the suffix whenever the generator changes, so old cached puzzles are rebuilt.
const CACHE_KEY = 'rail-tiles:ice-daily:v1';

function readCache(date: string): PenguinStageDef | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const data = raw ? (JSON.parse(raw) as { date?: string; def?: PenguinStageDef }) : null;
    return data?.date === date && data.def ? data.def : null;
  } catch {
    return null;
  }
}

function writeCache(date: string, def: PenguinStageDef) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ date, def }));
  } catch {
    // Storage full or blocked: rebuilt next time.
  }
}

function buildInWorker(date: string): Promise<PenguinStageDef> {
  return new Promise((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL('./iceDaily.worker.ts', import.meta.url), { type: 'module' });
    } catch (err) {
      reject(err);
      return;
    }
    worker.onmessage = (e: MessageEvent<{ ok: boolean; def?: PenguinStageDef; error?: string }>) => {
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

/** Today's penguin puzzle: cached per device for the day, else built in a worker (or inline). */
export async function loadIceDaily(date: string): Promise<PenguinStage> {
  const cached = readCache(date);
  if (cached) {
    try {
      return dailyIceStage(cached);
    } catch {
      // Stale cache: rebuild.
    }
  }
  let def: PenguinStageDef;
  try {
    def = await buildInWorker(date);
  } catch {
    def = dailyIceDef(date);
  }
  writeCache(date, def);
  return dailyIceStage(def);
}
