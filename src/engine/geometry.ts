import { type Dir, DX, DY, opposite } from './dir';
import type { TraceStep } from './simulate';

/**
 * Track geometry in cell units (one tile = 1 × 1, tile (x, y) spans [x, x+1] × [y, y+1]).
 * The same segments drive both the rail artwork and the train's motion, so the train
 * always sits on the drawn rails.
 */
export interface Vec {
  x: number;
  y: number;
}

export type Segment =
  | { type: 'line'; a: Vec; b: Vec; length: number }
  /** Quarter arc around corner `c`: point(θ) = c + r·(cos θ·u + sin θ·v), θ ∈ [0, π/2]. */
  | { type: 'arc'; c: Vec; u: Vec; v: Vec; r: number; length: number };

export interface Pose {
  x: number;
  y: number;
  /** Heading in degrees, 0 = east, clockwise positive (screen coordinates). */
  angle: number;
}

const unit = (d: Dir): Vec => ({ x: DX[d], y: DY[d] });

function edgePoint(cx: number, cy: number, d: Dir): Vec {
  return { x: cx + DX[d] * 0.5, y: cy + DY[d] * 0.5 };
}

/** Track through a whole tile whose centre is (cx, cy). */
export function tileSegment(cx: number, cy: number, inEdge: Dir, outEdge: Dir): Segment {
  if (inEdge === opposite(outEdge)) {
    return { type: 'line', a: edgePoint(cx, cy, inEdge), b: edgePoint(cx, cy, outEdge), length: 1 };
  }
  const i = unit(inEdge);
  const o = unit(outEdge);
  return {
    type: 'arc',
    c: { x: cx + (i.x + o.x) * 0.5, y: cy + (i.y + o.y) * 0.5 },
    u: { x: -o.x, y: -o.y },
    v: { x: -i.x, y: -i.y },
    r: 0.5,
    length: Math.PI / 4,
  };
}

/** Half segment from the tile centre out through `edge` (start stations). */
export function halfOut(cx: number, cy: number, edge: Dir): Segment {
  return { type: 'line', a: { x: cx, y: cy }, b: edgePoint(cx, cy, edge), length: 0.5 };
}

/** Half segment from `edge` into the tile centre (goal stations). */
export function halfIn(cx: number, cy: number, edge: Dir): Segment {
  return { type: 'line', a: edgePoint(cx, cy, edge), b: { x: cx, y: cy }, length: 0.5 };
}

export function pointAt(seg: Segment, t: number): Vec {
  if (seg.type === 'line') return { x: seg.a.x + (seg.b.x - seg.a.x) * t, y: seg.a.y + (seg.b.y - seg.a.y) * t };
  const th = (t * Math.PI) / 2;
  const c = Math.cos(th);
  const s = Math.sin(th);
  return { x: seg.c.x + seg.r * (c * seg.u.x + s * seg.v.x), y: seg.c.y + seg.r * (c * seg.u.y + s * seg.v.y) };
}

/** Unit tangent in the direction of travel. */
export function tangentAt(seg: Segment, t: number): Vec {
  if (seg.type === 'line') return { x: (seg.b.x - seg.a.x) / seg.length, y: (seg.b.y - seg.a.y) / seg.length };
  const th = (t * Math.PI) / 2;
  const c = Math.cos(th);
  const s = Math.sin(th);
  return { x: -s * seg.u.x + c * seg.v.x, y: -s * seg.u.y + c * seg.v.y };
}

const fmt = (n: number) => +n.toFixed(3);

/** SVG path for the segment shifted sideways by `offset` (left of travel is negative), scaled by `scale`. */
export function segmentPath(seg: Segment, offset = 0, scale = 100): string {
  const shift = (p: Vec, t: number): Vec => {
    const tg = tangentAt(seg, t);
    return { x: (p.x - tg.y * offset) * scale, y: (p.y + tg.x * offset) * scale };
  };
  const a = shift(pointAt(seg, 0), 0);
  const b = shift(pointAt(seg, 1), 1);
  if (seg.type === 'line') return `M${fmt(a.x)} ${fmt(a.y)}L${fmt(b.x)} ${fmt(b.y)}`;
  const r = Math.hypot(a.x - seg.c.x * scale, a.y - seg.c.y * scale);
  const sweep = seg.u.x * seg.v.y - seg.u.y * seg.v.x > 0 ? 1 : 0;
  return `M${fmt(a.x)} ${fmt(a.y)}A${fmt(r)} ${fmt(r)} 0 0 ${sweep} ${fmt(b.x)} ${fmt(b.y)}`;
}

export interface TrackPath {
  segments: Segment[];
  /** Cumulative start distance of each segment. */
  starts: number[];
  length: number;
}

export function buildPath(segments: Segment[]): TrackPath {
  const starts: number[] = [];
  let length = 0;
  for (const s of segments) {
    starts.push(length);
    length += s.length;
  }
  return { segments, starts, length };
}

/** Converts a simulation trace into a drivable path through tile centres. */
export function traceToPath(steps: readonly TraceStep[]): TrackPath {
  return buildPath(
    steps.map((step) => {
      const cx = step.x + 0.5;
      const cy = step.y + 0.5;
      if (step.kind === 'start') return halfOut(cx, cy, step.outEdge);
      if (step.kind === 'goal') return halfIn(cx, cy, step.inEdge);
      return tileSegment(cx, cy, step.inEdge, step.outEdge);
    }),
  );
}

export function poseAt(path: TrackPath, distance: number): Pose {
  const d = Math.min(Math.max(distance, 0), path.length);
  let i = path.segments.length - 1;
  while (i > 0 && path.starts[i] > d) i--;
  const seg = path.segments[i];
  const t = seg.length === 0 ? 0 : Math.min(1, (d - path.starts[i]) / seg.length);
  const p = pointAt(seg, t);
  const tg = tangentAt(seg, t);
  return { x: p.x, y: p.y, angle: (Math.atan2(tg.y, tg.x) * 180) / Math.PI };
}
