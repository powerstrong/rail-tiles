import { describe, expect, it } from 'vitest';
import { ALL_DIRS, type Dir, opposite } from './dir';
import { TUNNEL_DWELL, pointAt, poseAt, segmentPath, tangentAt, tileSegment, traceToPath } from './geometry';
import type { TraceStep } from './simulate';

const close = (a: number, b: number) => expect(a).toBeCloseTo(b, 6);

describe('tile geometry', () => {
  it('every through-route starts and ends on the matching edge midpoints', () => {
    for (const inEdge of ALL_DIRS) {
      for (const outEdge of ALL_DIRS.filter((d) => d !== inEdge)) {
        const seg = tileSegment(0.5, 0.5, inEdge, outEdge);
        const a = pointAt(seg, 0);
        const b = pointAt(seg, 1);
        const mid = (d: Dir) => ({ x: 0.5 + [0, 0.5, 0, -0.5][d], y: 0.5 + [-0.5, 0, 0.5, 0][d] });
        close(a.x, mid(inEdge).x);
        close(a.y, mid(inEdge).y);
        close(b.x, mid(outEdge).x);
        close(b.y, mid(outEdge).y);
        // Travel direction: into the tile at the start, out through outEdge at the end.
        const t0 = tangentAt(seg, 0);
        const t1 = tangentAt(seg, 1);
        const into = opposite(inEdge);
        close(t0.x, [0, 1, 0, -1][into]);
        close(t0.y, [-1, 0, 1, 0][into]);
        close(t1.x, [0, 1, 0, -1][outEdge]);
        close(t1.y, [-1, 0, 1, 0][outEdge]);
      }
    }
  });

  it('curves keep a constant radius from their corner', () => {
    const seg = tileSegment(0.5, 0.5, 3, 2);
    if (seg.type !== 'arc') throw new Error('expected arc');
    for (let t = 0; t <= 1; t += 0.1) {
      const p = pointAt(seg, t);
      close(Math.hypot(p.x - seg.c.x, p.y - seg.c.y), 0.5);
    }
  });

  it('produces SVG arcs that bend the correct way', () => {
    // West → south curve turns right (clockwise on screen): sweep flag 1.
    expect(segmentPath(tileSegment(0.5, 0.5, 3, 2), 0, 100)).toMatch(/A50 50 0 0 1 /);
    // West → north curve turns left: sweep flag 0.
    expect(segmentPath(tileSegment(0.5, 0.5, 3, 0), 0, 100)).toMatch(/A50 50 0 0 0 /);
  });
});

describe('train path', () => {
  // start → straight → right-hand curve → straight down → goal
  const steps: TraceStep[] = [
    { kind: 'start', x: 0, y: 0, outEdge: 1 },
    { kind: 'rail', x: 1, y: 0, inEdge: 3, outEdge: 1 },
    { kind: 'rail', x: 2, y: 0, inEdge: 3, outEdge: 2 },
    { kind: 'rail', x: 2, y: 1, inEdge: 0, outEdge: 2 },
    { kind: 'goal', x: 2, y: 2, inEdge: 0 },
  ];
  const path = traceToPath(steps);

  it('is continuous in position and heading across tile borders', () => {
    for (let i = 1; i < path.segments.length; i++) {
      const end = pointAt(path.segments[i - 1], 1);
      const start = pointAt(path.segments[i], 0);
      close(end.x, start.x);
      close(end.y, start.y);
      const t0 = tangentAt(path.segments[i - 1], 1);
      const t1 = tangentAt(path.segments[i], 0);
      close(t0.x, t1.x);
      close(t0.y, t1.y);
    }
  });

  it('has no jumps when sampled finely', () => {
    let prev = poseAt(path, 0);
    for (let d = 0.01; d <= path.length; d += 0.01) {
      const p = poseAt(path, d);
      expect(Math.hypot(p.x - prev.x, p.y - prev.y)).toBeLessThan(0.011);
      prev = p;
    }
  });

  it('starts at the station centre and ends at the goal centre, facing the right way', () => {
    const a = poseAt(path, 0);
    const b = poseAt(path, path.length);
    expect([a.x, a.y, a.angle, a.alpha]).toEqual([0.5, 0.5, 0, 1]);
    close(b.x, 2.5);
    close(b.y, 2.5);
    close(b.angle, 90);
    close(path.length, 0.5 + 1 + Math.PI / 4 + 1 + 0.5);
  });
});

describe('tunnel path', () => {
  const steps: TraceStep[] = [
    { kind: 'start', x: 0, y: 2, outEdge: 1 },
    { kind: 'tunnel', x: 1, y: 2, inEdge: 3, toX: 1, toY: 0, outEdge: 1 },
    { kind: 'goal', x: 2, y: 0, inEdge: 3 },
  ];
  const path = traceToPath(steps);

  it('splits the tunnel into a fade-out and a fade-in segment', () => {
    expect(path.segments.map((s) => s.fade)).toEqual([undefined, 'out', 'hidden', 'in', undefined]);
    expect(path.stepMid).toHaveLength(steps.length);
  });

  it('hides the train at the mouth and shows it again after', () => {
    expect(poseAt(path, 0.25).alpha).toBe(1);
    expect(poseAt(path, 1.0).alpha).toBeLessThan(0.05); // at the lower mouth's centre
    expect(poseAt(path, 1.0 + TUNNEL_DWELL / 2).alpha).toBe(0); // underground
    expect(poseAt(path, 1.0 + TUNNEL_DWELL + 1e-6).alpha).toBeLessThan(0.05); // just out of the upper mouth
    expect(poseAt(path, 1.5 + TUNNEL_DWELL).alpha).toBeGreaterThan(0.95);
  });
});
