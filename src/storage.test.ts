import { afterEach, describe, expect, it, vi } from 'vitest';
import { starsFor } from './engine/stars';
import { emptyProgress, exportCode, loadProgress, mergeProgress, needsNewerBrowser, readCode, recordClear, saveProgress } from './storage';

function memory(initial?: string) {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set('rail-tiles:progress', initial);
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
}

describe('progress storage', () => {
  it('round-trips star ratings', () => {
    const store = memory();
    saveProgress(recordClear(emptyProgress(), 'first-line', 3), store);
    expect(loadProgress(store).stars).toEqual({ 'first-line': 3 });
  });

  it('migrates v1 "cleared" lists to one star each', () => {
    const v1 = JSON.stringify({ schemaVersion: 1, cleared: ['first-line', 'first-turn', 42] });
    expect(loadProgress(memory(v1)).stars).toEqual({ 'first-line': 1, 'first-turn': 1 });
  });

  it('falls back to a fresh start on bad data and drops invalid ratings', () => {
    for (const raw of ['not json', '{"schemaVersion":99,"stars":{}}', '{"schemaVersion":2}', 'null', '[]']) {
      expect(loadProgress(memory(raw))).toEqual(emptyProgress());
    }
    expect(loadProgress(memory('{"schemaVersion":2,"stars":{"a":3,"b":7,"c":"3"}}')).stars).toEqual({ a: 3 });
    expect(loadProgress(null)).toEqual(emptyProgress());
  });

  it('survives storage that throws', () => {
    const broken = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
    };
    expect(loadProgress(broken)).toEqual(emptyProgress());
    expect(() => saveProgress(emptyProgress(), broken)).not.toThrow();
  });

  it('keeps the best rating and is a no-op otherwise', () => {
    const p = recordClear(emptyProgress(), 'a', 2);
    expect(recordClear(p, 'a', 1)).toBe(p);
    expect(recordClear(p, 'a', 2)).toBe(p);
    expect(recordClear(p, 'a', 3).stars.a).toBe(3);
  });
});

describe('stars', () => {
  it('rates by rails used against par', () => {
    expect(starsFor(8, 9, false)).toBe(3);
    expect(starsFor(9, 9, false)).toBe(3);
    expect(starsFor(11, 9, false)).toBe(2);
    expect(starsFor(12, 9, false)).toBe(1);
  });

  it('caps hinted clears at two stars', () => {
    expect(starsFor(9, 9, true)).toBe(2);
    expect(starsFor(12, 9, true)).toBe(1);
  });

  it('keeps the train look across a save', () => {
    const store = memory();
    saveProgress({ ...emptyProgress(), look: { body: 'body-blue' }, lookSeen: 4 }, store);
    expect(loadProgress(store)).toMatchObject({ look: { body: 'body-blue' }, lookSeen: 4 });
  });

  it('save codes round-trip and merge keeping the better rating', async () => {
    const mine = { ...emptyProgress(), stars: { 'first-line': 3 as const, 'ice-first-slide': 1 as const }, look: { body: 'body-pink' } };
    const code = await exportCode(mine);
    expect(code.startsWith('RT1.')).toBe(true);
    const loaded = await readCode(` ${code}\n`);
    expect(loaded).toEqual({ stars: mine.stars, look: mine.look });
    const other = { ...emptyProgress(), stars: { 'ice-first-slide': 3 as const, 'mc-first-mirror': 2 as const } };
    expect(mergeProgress(other, loaded!).stars).toEqual({ 'first-line': 3, 'ice-first-slide': 3, 'mc-first-mirror': 2 });
    expect(await readCode('hello')).toBe(null);
    expect(await readCode('RT1.zAAAA')).toBe(null);
  });

  describe('save codes across browsers', () => {
    const mine = { ...emptyProgress(), stars: { 'first-line': 3 as const }, look: { body: 'body-pink' } };
    afterEach(() => vi.unstubAllGlobals());

    it('falls back to a plain code when compression is there but fails', async () => {
      vi.stubGlobal(
        'CompressionStream',
        class {
          constructor() {
            throw new TypeError('deflate-raw is not supported');
          }
        },
      );
      const code = await exportCode(mine);
      expect(code.startsWith('RT1.j')).toBe(true);
      expect(await readCode(code)).toEqual({ stars: mine.stars, look: mine.look });
    });

    it('reads a plain code where decompression is missing, and says when a compressed one needs a newer browser', async () => {
      const compressed = await exportCode(mine);
      vi.stubGlobal('CompressionStream', undefined);
      const plain = await exportCode(mine);
      vi.stubGlobal('DecompressionStream', undefined);
      expect(plain.startsWith('RT1.j')).toBe(true);
      expect(await readCode(plain)).toEqual({ stars: mine.stars, look: mine.look });
      expect(needsNewerBrowser(plain)).toBe(false);
      expect(compressed.startsWith('RT1.z')).toBe(true);
      expect(await readCode(compressed)).toBe(null);
      expect(needsNewerBrowser(` ${compressed}`)).toBe(true);
    });
  });
});
