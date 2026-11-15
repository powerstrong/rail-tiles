import { describe, expect, it } from 'vitest';
import { WORLDS } from '../worlds';
import { MAP_W, layoutRoutes, locate, pathBetween, poseOn, rerouteTo, runLength, runThrough } from './routeLayout';

const links = WORLDS.filter(w => !w.routeOf).map(w => {
  const owner = WORLDS.find(o => o.stages.some(s => s.id === w.unlockAfter));
  return { id: w.id, parent: owner?.routeOf ?? owner?.id };
});
const layout = layoutRoutes(links);

describe('route map layout', () => {
  it('places every world inside a phone-wide map, apart from each other', () => {
    expect(Object.keys(layout.discs).sort()).toEqual(links.map(w => w.id).sort());
    expect(Object.keys(layout.discs)).toHaveLength(15);
    expect(layout.discs.train2).toBeUndefined();
    for (const w of WORLDS.filter(w => !w.routeOf)) {
      const [x, y] = layout.discs[w.id];
      expect(x, w.id).toBeGreaterThanOrEqual(40);
      expect(x, w.id).toBeLessThanOrEqual(MAP_W - 40);
      expect(y, w.id).toBeLessThan(layout.height);
    }
    const ps = Object.values(layout.discs);
    for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
      // Include labels and the entire 100 × 142 tap area, not only circle centres.
      expect(Math.abs(ps[i][0] - ps[j][0]) >= 100 || Math.abs(ps[i][1] - ps[j][1]) >= 142).toBe(true);
    }
  });

  it('routes long tracks around unrelated station discs', () => {
    for (const edge of layout.edges) {
      const pts = [...edge.pts, ...(layout.discs[edge.b] ? [layout.discs[edge.b]] : [])];
      for (const [id, p] of Object.entries(layout.discs)) {
        if (id === edge.a || id === edge.b) continue;
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1], b = pts[i];
          const dx = b[0] - a[0], dy = b[1] - a[1];
          const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
          expect(Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy), `${edge.a} → ${edge.b} crosses ${id}`).toBeGreaterThan(36);
        }
      }
    }
  });

  it('gives future stations new rows instead of reusing a temporary coordinate', () => {
    const extended = layoutRoutes([...links, { id: 'future' }, { id: 'future-child', parent: 'future' }]);
    expect(extended.discs.future[1]).toBeGreaterThan(layout.discs.volcano[1] + 142);
    expect(extended.discs['future-child'][1]).toBeGreaterThan(extended.discs.future[1] + 142);
    expect(pathBetween(extended, 'board', 'future-child')).toEqual(['board', 'future', 'future-child']);
  });

  it('draws the track the unlock rules describe: every world hangs off the world that opens it', () => {
    for (const l of links) {
      if (!l.parent) continue;
      expect(layout.edges.some((e) => e.a === l.parent && e.b === l.id), l.id).toBe(true);
    }
    // A tree: one edge less than places, and every place reachable from the plaza.
    expect(layout.edges.length).toBe(Object.keys(layout.stops).length - 1);
    for (const id of Object.keys(layout.stops)) expect(pathBetween(layout, 'garage', id), id).not.toBeNull();
  });

  it('runs the train along the track from place to place, ending on the stop', () => {
    const path = pathBetween(layout, 'garage', 'clock')!;
    expect(path).toEqual(['garage', 'board', 'train', 'space', 'clock']);
    const run = runThrough(layout, path);
    const end = poseOn(run, runLength(run));
    expect([end.x, end.y]).toEqual([...layout.stops.clock]);
    expect(run.marks.map((m) => m.id)).toEqual(path);
  });

  it('turns a moving train round the short way when the target changes', () => {
    const run = runThrough(layout, pathBetween(layout, 'train', 'volcano')!);
    // Just past the first world, then the player picks the mailbox.
    const d = run.marks[1].at + 20;
    const here = poseOn(run, d);
    const back = rerouteTo(layout, run, d, 'mail');
    expect(back.pts[0]).toEqual([here.x, here.y]);
    const end = poseOn(back, runLength(back));
    expect([end.x, end.y]).toEqual([...layout.stops.mail]);
    expect(back.marks.at(-1)!.id).toBe('mail');
    // Going back is shorter than carrying on to the robot factory and back.
    expect(back.marks[0].id).toBe('ice');
    expect(runLength(back)).toBeLessThan(runLength(runThrough(layout, pathBetween(layout, 'ice', 'mail')!)) + 25);
  });

  it('turns round again before reaching the first place of a new run, still the short way', () => {
    // Half way from the board to the mailbox, the player picks the garage, then the mailbox again.
    const run = runThrough(layout, ['board', 'mail']);
    const half = runLength(run) / 2;
    const toGarage = rerouteTo(layout, run, half, 'garage');
    expect(toGarage.marks[0].id).toBe('board');
    const again = rerouteTo(layout, toGarage, 10, 'mail');
    // Straight back to the mailbox: about half the siding, less the bit it already went back.
    expect(again.marks.map((m) => m.id)).toEqual(['mail']);
    expect(runLength(again)).toBeCloseTo(half + 10, 0);
    const end = poseOn(again, runLength(again));
    expect([end.x, end.y]).toEqual([...layout.stops.mail]);
  });

  it('knows where on the track a moving train is', () => {
    const run = runThrough(layout, ['train', 'ice', 'machine']);
    expect(locate(run, run.marks[1].at + 5)).toEqual({ a: 'ice', b: 'machine', s: 5 });
    expect(locate(run, runLength(run))).toEqual({ a: 'machine', b: 'machine', s: 0 });
  });
});
