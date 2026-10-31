import { afterEach, describe, expect, it, vi } from 'vitest';
import { dailyLoader } from './dailyLoader';

/** A worker stand-in that answers each date after the delay given for it. */
function fakeWorker(delays: Record<string, number>) {
  return () => {
    const w = {
      onmessage: null as ((e: { data: unknown }) => void) | null,
      onerror: null as ((e: unknown) => void) | null,
      postMessage(date: string) {
        setTimeout(() => w.onmessage?.({ data: { ok: true, def: { date } } }), delays[date] ?? 0);
      },
      terminate() {},
    };
    return w as unknown as Worker;
  };
}

function memoryStorage() {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), data };
}

const KEY = 'test:daily';

describe('dailyLoader', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('builds once, then serves the day from the cache', async () => {
    const storage = memoryStorage();
    vi.stubGlobal('localStorage', storage);
    const build = vi.fn((date: string) => ({ date }));
    const load = dailyLoader({ cacheKey: KEY, worker: fakeWorker({}), build, toStage: (d: { date: string }) => d.date });
    expect(await load('2026-10-31')).toBe('2026-10-31');
    expect(JSON.parse(storage.data.get(KEY)!).date).toBe('2026-10-31');
    expect(await load('2026-10-31')).toBe('2026-10-31');
    expect(build).not.toHaveBeenCalled();
  });

  it('builds on the main thread when workers fail', async () => {
    vi.stubGlobal('localStorage', memoryStorage());
    const load = dailyLoader({
      cacheKey: KEY,
      worker: () => {
        throw new Error('no workers here');
      },
      build: (date: string) => ({ date, inline: true }),
      toStage: (d: { date: string; inline?: boolean }) => `${d.date}${d.inline ? ' inline' : ''}`,
    });
    expect(await load('2026-10-31')).toBe('2026-10-31 inline');
  });

  it('does not let a late build for yesterday replace today in the cache', async () => {
    vi.useFakeTimers();
    const storage = memoryStorage();
    vi.stubGlobal('localStorage', storage);
    const load = dailyLoader({ cacheKey: KEY, worker: fakeWorker({ '2026-10-31': 50, '2026-11-01': 10 }), build: (date: string) => ({ date }), toStage: (d: { date: string }) => d.date });
    const yesterday = load('2026-10-31');
    const today = load('2026-11-01');
    await vi.advanceTimersByTimeAsync(100);
    expect(await today).toBe('2026-11-01');
    expect(await yesterday).toBe('2026-10-31');
    expect(JSON.parse(storage.data.get(KEY)!).date).toBe('2026-11-01');
  });
});
