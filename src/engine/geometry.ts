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

/**
 * `fade` makes the train vanish into (`out`) or emerge from (`in`) a tunnel along the
 * segment; `hidden` keeps it invisible (time spent underground).
 */
type SegmentFade = { fade?: 'in' | 'out' | 'hidden' };

/** Path length the train spends out of sight inside a tunnel. */
export const TUNNEL_DWELL = 0.8;

export type Segment =
  | ({ type: 'line'; a: Vec; b: Vec; length: number } & SegmentFade)
  /** Quarter arc around corner `c`: point(θ) = c + r·(cos θ·u + sin θ·v), θ ∈ [0, π/2]. */
  | ({ type: 'arc'; c: Vec; u: Vec; v: Vec; r: number; length: number } & SegmentFade);

export interface Pose {
  x: number;
  y: number;
  /** Heading in degrees, 0 = east, clockwise positive (screen coordinates). */
  angle: number;
  /** Visibility, 0..1 (below 1 only while entering or leaving a tunnel). */
  alpha: number;
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
  if (seg.type === 'line') {
    const dx = seg.b.x - seg.a.x;
    const dy = seg.b.y - seg.a.y;
    const len = Math.hypot(dx, dy);
    return len === 0 ? { x: 1, y: 0 } : { x: dx / len, y: dy / len };
  }
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

export interface TracePath extends TrackPath {
  /** For each trace step: the distance at which the train is in the middle of that step's tile. */
  stepMid: number[];
}

/** Converts a simulation trace into a drivable path through tile centres. */
export function traceToPath(steps: readonly TraceStep[]): TracePath {
  const segments: Segment[] = [];
  const stepMid: number[] = [];
  let length = 0;
  const add = (seg: Segment) => {
    segments.push(seg);
    length += seg.length;
  };
  for (const step of steps) {
    const cx = step.x + 0.5;
    const cy = step.y + 0.5;
    const before = length;
    if (step.kind === 'start') add(halfOut(cx, cy, step.outEdge));
    else if (step.kind === 'goal') add(halfIn(cx, cy, step.inEdge));
    else if (step.kind === 'tunnel') {
      add({ ...halfIn(cx, cy, step.inEdge), fade: 'out' });
      // Out of sight for a moment, parked at the entry mouth, before emerging from the pair.
      add({ type: 'line', a: { x: cx, y: cy }, b: { x: cx, y: cy }, length: TUNNEL_DWELL, fade: 'hidden' });
      add({ ...halfOut(step.toX + 0.5, step.toY + 0.5, step.outEdge), fade: 'in' });
    } else add(tileSegment(cx, cy, step.inEdge, step.outEdge));
    stepMid.push((before + length) / 2);
  }
  return { ...buildPath(segments), stepMid };
}

/** Train visibility on a fading segment at fraction t: gone by the tunnel mouth, back soon after. */
function alphaAt(seg: Segment, t: number): number {
  const smooth = (v: number) => {
    const c = Math.min(1, Math.max(0, v));
    return c * c * (3 - 2 * c);
  };
  if (seg.fade === 'hidden') return 0;
  if (seg.fade === 'out') return 1 - smooth((t - 0.2) / 0.7);
  if (seg.fade === 'in') return smooth((t - 0.1) / 0.7);
  return 1;
}

export function poseAt(path: TrackPath, distance: number): Pose {
  const d = Math.min(Math.max(distance, 0), path.length);
  let i = path.segments.length - 1;
  while (i > 0 && path.starts[i] > d) i--;
  const seg = path.segments[i];
  const t = seg.length === 0 ? 0 : Math.min(1, (d - path.starts[i]) / seg.length);
  const p = pointAt(seg, t);
  const tg = tangentAt(seg, t);
  return { x: p.x, y: p.y, angle: (Math.atan2(tg.y, tg.x) * 180) / Math.PI, alpha: alphaAt(seg, t) };
}
