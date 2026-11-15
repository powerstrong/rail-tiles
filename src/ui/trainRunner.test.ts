import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildPath } from '../engine/geometry';
import { runTrain } from './trainRunner';

const path = buildPath([{ type: 'line', a: { x: 0, y: 0 }, b: { x: 8, y: 0 }, length: 8 }]);
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
function animation(scale: () => number) {
  let now = 0, nextId = 0, done = false, distance = 0;
  const frames = new Map<number, FrameRequestCallback>();
  vi.stubGlobal('requestAnimationFrame', (f: FrameRequestCallback) => { frames.set(++nextId, f); return nextId; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  const stopped: number[] = [], departed: number[] = [];
  let stoppedAt: number | null = null;
  const cancel = runTrain(path, { speed: 2.6, brake: true, stops: [2, 5], dwell: 1.2, timeScale: scale,
    onPose: p => { distance = p.x; },
    onStop: index => { stopped.push(now); stoppedAt = [2, 5][index]; },
    onAdvance: d => { if (stoppedAt !== null && d > stoppedAt) { departed.push(now); stoppedAt = null; } },
    onDone: () => { done = true; },
  });
  const step = () => {
    now += 10;
    const pending = [...frames.values()]; frames.clear();
    pending.forEach(f => f(now));
  };
  return { cancel, step, finish: () => { for (let i = 0; i < 3000 && !done; i++) step(); return { now, done, distance, stopped, departed }; }, distance: () => distance, done: () => done };
}
describe('train verification animation', () => {
  it('scales the entire trip including acceleration and every boarding dwell', () => {
    const normal = animation(() => 1).finish();
    vi.restoreAllMocks();
    const quick = animation(() => 6).finish();
    expect(normal.done && quick.done).toBe(true);
    expect(normal.distance).toBe(8); expect(quick.distance).toBe(8);
    expect(quick.now / normal.now).toBeLessThan(0.2);
    expect(quick.stopped).toHaveLength(2);
    quick.departed.forEach((time, i) => expect(time - quick.stopped[i]).toBeLessThan(260));
    normal.departed.forEach((time, i) => expect(time - normal.stopped[i]).toBeGreaterThanOrEqual(1200));
  });
  it('can switch to quick verification during a run and cancel without a later completion', () => {
    let rate = 1;
    const trip = animation(() => rate);
    for (let i = 0; i < 20; i++) trip.step();
    const before = trip.distance();
    rate = 6;
    for (let i = 0; i < 20; i++) trip.step();
    expect(trip.distance() - before).toBeGreaterThan(before * 2);
    trip.cancel();
    const stopped = trip.distance();
    for (let i = 0; i < 2000; i++) trip.step();
    expect(trip.distance()).toBe(stopped);
    expect(trip.done()).toBe(false);
  });
});
