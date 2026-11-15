import { describe, expect, it } from 'vitest';
import { absorbSaved, emptyProgress, exportCode, loadProgress, readCode, recordClear, saveProgress, totalStars } from '../storage';
import { MEMORY_STAGES, collectedPostcards } from './stages';
import { createRound, memoryReducer } from './model';

const ids = (stars: Readonly<Record<string, number>>) => collectedPostcards(stars).map(s => s.id);
describe('postcards derive solely from existing best star records', () => {
  it('extends a legacy chapter-one save without changing its stories, look or last stage', async () => {
    const old = { ...emptyProgress(), stars: Object.fromEntries([...MEMORY_STAGES.slice(0, 10).map(s => [s.id, 1 as const]), ['last-run', 3 as const]]), stories: ['memory', 'memory:bye', 'train'], look: { body: 'mint' }, last: { world: 'memory', stage: 'memory-1-10' } };
    let raw = JSON.stringify(old);
    const store = { getItem: () => raw, setItem: (_: string, v: string) => { raw = v; } };
    const legacy = loadProgress(store);
    expect(ids(legacy.stars)).toEqual([]);
    // One-star and hint-capped completion have identical collection rights.
    const once = recordClear(legacy, 'memory-2-01', 1);
    const hinted = recordClear(once, 'memory-3-10', 2);
    saveProgress(recordClear(hinted, 'memory-3-10', 1), store);
    const loaded = loadProgress(store);
    expect(loaded).toMatchObject({ schemaVersion: 2, stories: old.stories, look: old.look, last: old.last });
    expect(loaded.stars).toEqual({ ...old.stars, 'memory-2-01': 1, 'memory-3-10': 2 });
    expect(totalStars(loaded)).toBe(totalStars(old) + 3);
    expect(ids(loaded.stars)).toEqual(['memory-2-01', 'memory-3-10']);
    const code = await exportCode(loaded);
    expect(code.startsWith('RT1.')).toBe(true);
    expect(ids((await readCode(code))!.stars)).toEqual(ids(loaded.stars));
    expect(JSON.parse(raw)).not.toHaveProperty('postcards');
    const tab = absorbSaved(loaded, recordClear(old, 'memory-3-02', 1));
    expect(ids(tab.stars)).toEqual(['memory-2-01', 'memory-3-02', 'memory-3-10']);
    expect(tab.stars['last-run']).toBe(3);
    expect(tab.stories).toContain('memory:bye');
  });
  it('excludes partial rounds, unknown ids and invalid ratings, and keeps owned scenes on restart', () => {
    const stage = MEMORY_STAGES[13];
    let state = createRound(stage, 31);
    const mate = state.deck.findIndex((f, i) => i > 0 && f === state.deck[0]);
    state = memoryReducer(memoryReducer(state, { type: 'flip', index: 0 }), { type: 'flip', index: mate });
    expect(state.matched).toHaveLength(2);
    expect(ids({})).toEqual([]);
    const stars = { [stage.id]: 3, 'memory-3-99': 3, 'memory-2-01': 0, 'memory-2-02': 7 };
    expect(ids(stars)).toEqual([stage.id]);
    state = memoryReducer(state, { type: 'restart', stage, seed: 44 });
    expect(state.matched).toEqual([]);
    expect(ids(stars)).toEqual([stage.id]);
  });
});
