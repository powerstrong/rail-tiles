import { describe, expect, it } from 'vitest';
import { continueTarget } from './continue';
import { loadProgress } from './storage';
import { worldById } from './worlds';

const machine = worldById('machine')!;
const ids = machine.stages.map((s) => s.id);
const starsUpTo = (n: number) => Object.fromEntries(ids.slice(0, n).map((id) => [id, 3 as const]));

describe('continue', () => {
  it('has nothing to continue before any stage was opened', () => {
    expect(continueTarget({ stars: {} })).toBeNull();
  });

  it('goes back into the last stage while it is not cleared', () => {
    const t = continueTarget({ stars: starsUpTo(3), last: { world: 'machine', stage: ids[3] } })!;
    expect([t.world.id, t.index, t.resume, t.text]).toEqual(['machine', 3, true, '로봇 공장 1-4']);
  });

  it('moves on to the next open stage once the last one is cleared, skipping a cleared bonus', () => {
    expect(continueTarget({ stars: starsUpTo(4), last: { world: 'machine', stage: ids[3] } })!.index).toBe(4);
    // Bonus (1-5) skipped and 1-6 cleared too: on to 1-7.
    const stars = { ...starsUpTo(4), [ids[5]]: 2 as const };
    const t = continueTarget({ stars, last: { world: 'machine', stage: ids[5] } })!;
    expect([t.index, t.resume]).toEqual([6, false]);
  });

  it('comes back for a stage left behind earlier, and stops when the world is all cleared', () => {
    const stars = { ...starsUpTo(30) };
    delete stars[ids[4]];
    expect(continueTarget({ stars, last: { world: 'machine', stage: ids[29] } })!.index).toBe(4);
    expect(continueTarget({ stars: starsUpTo(30), last: { world: 'machine', stage: ids[29] } })).toBeNull();
  });

  it('ignores a last stage that no longer exists', () => {
    expect(continueTarget({ stars: {}, last: { world: 'machine', stage: 'gone' } })).toBeNull();
    expect(continueTarget({ stars: {}, last: { world: 'nowhere', stage: ids[0] } })).toBeNull();
  });

  it('keeps the last stage in saved progress, and drops a damaged one', () => {
    const store = (v: unknown) => ({ getItem: () => JSON.stringify(v), setItem: () => {} });
    expect(loadProgress(store({ schemaVersion: 2, stars: {}, last: { world: 'machine', stage: ids[2] } })).last).toEqual({ world: 'machine', stage: ids[2] });
    expect(loadProgress(store({ schemaVersion: 2, stars: {}, last: { world: 3 } })).last).toBeUndefined();
  });
});
