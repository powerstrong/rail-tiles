import { describe, expect, it } from 'vitest';
import { createRound, isComplete, isFaceUp, memoryReducer as reduce, memoryStarsFor, shuffleDeck, starLimits, type MemoryState } from './model';
import { MEMORY_STAGES } from './stages';
const stage = MEMORY_STAGES[2];
const initial = () => createRound(stage, 42);
const flip = (s: MemoryState, index: number) => reduce(s, { type: 'flip', index });
const mismatch = (s = initial()) => {
  const j = s.deck.findIndex(face => face !== s.deck[0]);
  return flip(flip(s, 0), j);
};
describe('memory rounds', () => {
  it('shuffles reproducibly, keeps exactly two of each face, and uses the supplied seed', () => {
    expect(shuffleDeck(stage.faces, 42)).toEqual(shuffleDeck(stage.faces, 42));
    expect(new Set(Array.from({ length: 10 }, (_, seed) => shuffleDeck(stage.faces, seed).join())).size).toBeGreaterThan(1);
    for (const face of stage.faces) expect(initial().deck.filter(f => f === face)).toHaveLength(2);
  });
  it('ignores duplicate, face-up and invalid clicks without counting an attempt', () => {
    const one = flip(initial(), 0);
    expect(flip(one, 0)).toBe(one);
    for (const i of [-1, 100, 0.5]) expect(flip(one, i)).toBe(one);
    const pending = mismatch();
    for (const i of pending.pendingMismatch!.positions) expect(flip(pending, i)).toBe(pending);
    expect(one.attempts).toBe(0);
  });
  it('accepts third and fourth clicks immediately and rejects the old attempt timer', () => {
    const s = mismatch();
    const third = s.deck.findIndex((_, i) => !isFaceUp(s, i));
    const next = flip(s, third);
    expect(next.first).toBe(third);
    for (const i of s.pendingMismatch!.positions) expect(isFaceUp(next, i)).toBe(false);
    const fourth = next.deck.findIndex((f, i) => i !== third && f !== next.deck[third]);
    const pending = flip(next, fourth);
    expect(pending.attempts).toBe(2);
    expect(pending.misses).toBe(2);
    expect(reduce(pending, { type: 'expire', roundId: s.roundId, attemptId: s.pendingMismatch!.attemptId })).toBe(pending);
    expect(reduce(pending, { type: 'expire', roundId: pending.roundId, attemptId: pending.pendingMismatch!.attemptId }).pendingMismatch).toBeNull();
  });
  it('restarts all round data and ignores timers queued before a restart', () => {
    const before = mismatch();
    const reset = reduce(before, { type: 'restart', stage, seed: 90 });
    expect(reset).toEqual(createRound(stage, 90, before.roundId + 1));
    const pending = mismatch(reset);
    expect(reduce(pending, { type: 'expire', roundId: before.roundId, attemptId: before.pendingMismatch!.attemptId })).toBe(pending);
    const hint = { ...pending, hint: [0], hintId: 1 };
    expect(reduce(hint, { type: 'clearHint', roundId: before.roundId, hintId: 1 })).toBe(hint);
  });
  it('keeps matches in place, completes with attempts = pairs + misses, and ignores later input', () => {
    let s = mismatch();
    s = reduce(s, { type: 'expire', roundId: s.roundId, attemptId: s.pendingMismatch!.attemptId });
    for (const face of stage.faces) {
      const indices = s.deck.flatMap((f, i) => f === face ? [i] : []);
      s = flip(flip(s, indices[0]), indices[1]);
      for (const i of indices) expect(flip(s, i)).toBe(s);
    }
    expect(isComplete(s)).toBe(true);
    expect(s.deck).toEqual(initial().deck);
    expect(s.attempts).toBe(stage.faces.length + s.misses);
    expect(flip(s, 0)).toBe(s);
  });
  it('charges only effective hints, never reveals an unseen card, and can close a pending mismatch', () => {
    let s = initial();
    s = reduce(s, { type: 'hint' });
    expect(s.hinted).toBe(false);
    expect(s.hint).toEqual([]);
    const [a, b] = [0, s.deck.findIndex(f => f !== s.deck[0])];
    const mate = s.deck.findIndex((f, i) => i !== a && f === s.deck[a]);
    s = flip(flip(s, a), b);
    const pending = s.pendingMismatch;
    s = reduce(s, { type: 'hint' });
    expect(s.hinted).toBe(false);
    expect(s.pendingMismatch).toBe(pending);
    s = flip(s, mate);
    const noPartner = reduce(s, { type: 'hint' });
    expect(noPartner.hint).toEqual([a]);
    expect(noPartner.first).toBe(mate);
    expect(noPartner.hinted).toBe(true);
    s = flip(s, b);
    const hinted = reduce(s, { type: 'hint' });
    expect(hinted.hint).toEqual(expect.arrayContaining([a, mate]));
    expect(hinted.pendingMismatch).toBeNull();
    expect(hinted.hint.every(i => hinted.seen.includes(i))).toBe(true);
    expect(hinted.matched).toEqual([]);
    expect(reduce(hinted, { type: 'clearHint', roundId: s.roundId, hintId: hinted.hintId - 1 })).toBe(hinted);
    expect(reduce(hinted, { type: 'clearHint', roundId: s.roundId, hintId: hinted.hintId }).hint).toEqual([]);
  });
});
describe('memory star limits', () => {
  for (const pairs of [2, 3, 4, 6, 8, 10]) it(`rates ${pairs} pairs at both boundaries and caps hints`, () => {
    const { three, two } = starLimits(pairs);
    expect([three, two]).toEqual(({ 2: [3, 6], 3: [5, 9], 4: [6, 12], 6: [9, 18], 8: [15, 28], 10: [23, 40] })[pairs]);
    for (const misses of [three - 1, three]) expect(memoryStarsFor(misses, pairs)).toBe(3);
    for (const misses of [three + 1, two - 1, two]) expect(memoryStarsFor(misses, pairs)).toBe(2);
    expect(memoryStarsFor(two + 1, pairs)).toBe(1);
    expect(memoryStarsFor(three, pairs, true)).toBe(2);
    expect(memoryStarsFor(two + 1, pairs, true)).toBe(1);
  });
});

describe('large memory rounds keep input and timer semantics', () => {
  for (const stage of [MEMORY_STAGES[13], MEMORY_STAGES[29]]) it(`${stage.faces.length} pairs accept rapid input through postcard progress and completion`, () => {
    let s = createRound(stage, 77);
    const deck = s.deck;
    const b = deck.findIndex(f => f !== deck[0]);
    s = flip(flip(s, 0), b);
    const pending = s.pendingMismatch!;
    const c = deck.findIndex((_, i) => i !== 0 && i !== b);
    s = flip(s, c);
    expect(s.first).toBe(c);
    expect(reduce(s, { type: 'expire', roundId: s.roundId, attemptId: pending.attemptId })).toBe(s);
    s = reduce(s, { type: 'restart', stage, seed: 77 });
    const restarted = s;
    expect(reduce(s, { type: 'expire', roundId: s.roundId - 1, attemptId: pending.attemptId })).toBe(s);
    for (const face of stage.faces) {
      const [a, b] = s.deck.flatMap((f, i) => f === face ? [i] : []);
      s = flip(flip(s, a), b);
    }
    expect(isComplete(s)).toBe(true);
    expect(s.deck).toEqual(restarted.deck);
    expect(s.attempts).toBe(stage.faces.length);
    expect(flip(s, 0)).toBe(s);
    expect(reduce(s, { type: 'hint' })).toBe(s);
  });
});
