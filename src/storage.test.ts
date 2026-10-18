import { describe, expect, it } from 'vitest';
import { starsFor } from './engine/stars';
import { emptyProgress, loadProgress, recordClear, saveProgress } from './storage';

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
});
