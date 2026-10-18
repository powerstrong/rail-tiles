import { describe, expect, it } from 'vitest';
import { emptyProgress, loadProgress, markCleared, saveProgress } from './storage';

function memory(initial?: string) {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set('rail-tiles:progress', initial);
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
}

describe('progress storage', () => {
  it('round-trips cleared stages', () => {
    const store = memory();
    saveProgress(markCleared(emptyProgress(), 'first-line'), store);
    expect(loadProgress(store).cleared).toEqual(['first-line']);
  });

  it('falls back to a fresh start on bad data', () => {
    for (const raw of ['not json', '{"schemaVersion":99,"cleared":[]}', '{"schemaVersion":1}', 'null', '[]']) {
      expect(loadProgress(memory(raw))).toEqual(emptyProgress());
    }
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

  it('markCleared is idempotent', () => {
    const p = markCleared(emptyProgress(), 'a');
    expect(markCleared(p, 'a')).toBe(p);
  });
});
