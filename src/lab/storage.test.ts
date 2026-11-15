import { describe, expect, it } from 'vitest';
import { completeLabStage, LAB_PROGRESS_KEY, loadLabProgress, rateLabConcept, saveLabProgress, type LabStorage } from './storage';
import { PROGRESS_KEY } from '../storage';
function memory(): LabStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: k => data.get(k) ?? null, setItem: (k, v) => { data.set(k, v); } };
}
describe('isolated experimental progress', () => {
  it('keeps official saves byte-for-byte unchanged, unions completed stages across tabs', () => {
    const store = memory(); store.setItem(PROGRESS_KEY, '{"stars":{"last-run":3}}');
    const a = completeLabStage(loadLabProgress(store), 'lab-v1-bee-30');
    const b = completeLabStage(loadLabProgress(store), 'lab-v1-twins-1');
    saveLabProgress(a, store); saveLabProgress(b, store);
    expect(loadLabProgress(store).completed).toEqual({ 'lab-v1-bee-30': true, 'lab-v1-twins-1': true });
    expect(store.getItem(PROGRESS_KEY)).toBe('{"stars":{"last-run":3}}');
    expect(store.data.size).toBe(2);
  });
  it('persists feedback without promoting a game into the shipped world list', () => {
    const store = memory();
    const p = rateLabConcept(loadLabProgress(store), 'twins', 'love'); saveLabProgress(p, store);
    expect(loadLabProgress(store).ratings).toEqual({ twins: 'love' });
    expect(loadLabProgress(store).completed).toEqual({});
  });
  it('handles malformed/full/private storage without crashing play', () => {
    const store = memory(); store.setItem(LAB_PROGRESS_KEY, 'not json');
    expect(loadLabProgress(store)).toEqual({ completed: {}, ratings: {} });
    const broken = { getItem: () => { throw Error(); }, setItem: () => { throw Error(); } };
    expect(loadLabProgress(broken)).toEqual({ completed: {}, ratings: {} });
    expect(saveLabProgress(loadLabProgress(store), broken)).toBe(false);
    expect(saveLabProgress(loadLabProgress(store), null)).toBe(false);
  });
  it('ignores foreign ids and malformed values', () => {
    const store = memory(); store.setItem(LAB_PROGRESS_KEY, JSON.stringify({ completed: { 'first-step': true, 'lab-v1-bee-31': true, 'lab-v1-bee-30': true, 'lab-v1-twins-1': 3 }, ratings: { twins: 'love', bees: 'love', cloud: 12 } }));
    expect(loadLabProgress(store)).toEqual({ completed: { 'lab-v1-bee-30': true }, ratings: { twins: 'love' } });
  });
});
