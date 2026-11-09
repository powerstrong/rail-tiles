/**
 * The route map's geometry: where every station and plaza building stands, the track between
 * them, and the way the player's train runs from one place to another. Pure data, no React.
 *
 * The track is a tree. At the top is the plaza (garage, notice board, mailbox on one siding);
 * a line runs down from the board to the first world, and every other world hangs off the world
 * whose first boss opens it (its `unlockAfter`), so the drawing always matches the unlock rules.
 * The train never stops on a station's disc (it would hide the emblem): each station has a stop
 * just above it on the incoming track.
 */

export type Pt = readonly [number, number];

export const MAP_W = 360;
/** How far above its disc a station's stop is. */
export const STOP_GAP = 52;
const SIDING_Y = 122;

/** Plaza places: where the train stops for each building. */
export const PLAZA = {
  garage: { x: 62, title: '차고', sub: '기차 꾸미기' },
  board: { x: 180, title: '게시판', sub: '오늘의 퍼즐' },
  mail: { x: 298, title: '우체통', sub: '기록 지키기' },
} as const;
export type PlazaId = keyof typeof PLAZA;
export const isPlaza = (id: string): id is PlazaId => id in PLAZA;

/** Station discs, hand-placed for the shipped worlds (a phone is 360 wide). */
const PLACED: Record<string, Pt> = {
  train: [180, 222],
  ice: [62, 344],
  machine: [62, 470],
  volcano: [62, 596],
  train2: [180, 344],
  space: [180, 470],
  clock: [180, 596],
  cargo: [298, 344],
  depot: [298, 486],
};
const ROW = 126;

export interface WorldLink {
  id: string;
  /** The world whose stage opens this one; none for the first world. */
  parent?: string;
}

export interface Edge {
  /** Parent end first. */
  a: string;
  b: string;
  /** Points from a's stop to b's stop. */
  pts: Pt[];
  len: number;
  /** For drawing: from the parent's disc (or the board) to the child's disc. */
  track: string;
}

export interface Layout {
  height: number;
  /** Station disc centres by world id. */
  discs: Record<string, Pt>;
  /** Where the train stops, by place id (world id or plaza id). */
  stops: Record<string, Pt>;
  edges: Edge[];
  /** Neighbours of every place, with the edge between. */
  adj: Record<string, { to: string; edge: Edge }[]>;
}

const dist = (p: Pt, q: Pt) => Math.hypot(q[0] - p[0], q[1] - p[1]);
const lengthOf = (pts: Pt[]) => pts.slice(1).reduce((s, p, i) => s + dist(pts[i], p), 0);

function bezier(p0: Pt, p1: Pt, p2: Pt, p3: Pt, n = 18): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    out.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]);
  }
  return out;
}

/** The map for these worlds (in WORLDS order; parents before children). */
export function layoutRoutes(worlds: WorldLink[]): Layout {
  const discs: Record<string, Pt> = {};
  const stops: Record<string, Pt> = {};
  const edges: Edge[] = [];
  let lowest = 0;
  for (const w of worlds) {
    let p = PLACED[w.id];
    if (!p) {
      // A world without a hand-made spot: below everything, under its parent.
      const px = w.parent && discs[w.parent] ? discs[w.parent][0] : MAP_W / 2;
      p = [px, lowest + ROW];
    }
    discs[w.id] = p;
    stops[w.id] = [p[0], p[1] - STOP_GAP];
    lowest = Math.max(lowest, p[1]);
  }
  for (const id of Object.keys(PLAZA) as PlazaId[]) stops[id] = [PLAZA[id].x, SIDING_Y];

  // Plaza siding, and the line down from the board to the first world.
  const add = (a: string, b: string, pts: Pt[], track: string) => edges.push({ a, b, pts, len: lengthOf(pts), track });
  add('board', 'garage', [stops.board, stops.garage], `M${stops.board[0]} ${SIDING_Y} H${stops.garage[0] - 22}`);
  add('board', 'mail', [stops.board, stops.mail], `M${stops.board[0]} ${SIDING_Y} H${stops.mail[0] + 22}`);
  const root = worlds.find((w) => !w.parent);
  if (root) add('board', root.id, [stops.board, stops[root.id]], `M${stops.board[0]} ${SIDING_Y} V${discs[root.id][1]}`);

  for (const w of worlds) {
    if (!w.parent || !discs[w.parent]) continue;
    const [px, py] = discs[w.parent];
    const [cx, cy] = discs[w.id];
    const bend = cy - 66;
    const k = (bend - py) * 0.55;
    const curve = px === cx ? [[px, py] as Pt, [cx, bend] as Pt] : bezier([px, py], [px, py + k], [cx, bend - k], [cx, bend]);
    add(w.parent, w.id, [stops[w.parent], ...curve, stops[w.id]], px === cx ? `M${px} ${py} V${cy}` : `M${px} ${py} C${px} ${py + k} ${cx} ${bend - k} ${cx} ${bend} V${cy}`);
  }

  const adj: Layout['adj'] = {};
  for (const id of Object.keys(stops)) adj[id] = [];
  for (const e of edges) {
    adj[e.a].push({ to: e.b, edge: e });
    adj[e.b].push({ to: e.a, edge: e });
  }
  return { height: lowest + 90, discs, stops, edges, adj };
}

/** The places on the way from `from` to `to` (both included), or null if they are not joined. */
export function pathBetween(layout: Layout, from: string, to: string): string[] | null {
  const prev = new Map<string, string | null>([[from, null]]);
  const queue = [from];
  for (let i = 0; i < queue.length; i++) {
    for (const { to: n } of layout.adj[queue[i]] ?? []) {
      if (prev.has(n)) continue;
      prev.set(n, queue[i]);
      queue.push(n);
    }
  }
  if (!prev.has(to)) return null;
  const out = [to];
  for (let k = prev.get(to); k; k = prev.get(k)) out.unshift(k);
  return out;
}

/** The points of the track from place `a` to its neighbour `b`. */
function hop(layout: Layout, a: string, b: string): Pt[] {
  const e = layout.adj[a].find((n) => n.to === b)!.edge;
  return e.a === a ? e.pts : [...e.pts].reverse();
}

/**
 * A run of the train: points along the track with the distance to each, the places passed, and
 * where on the track it starts (on the edge from `start.a` to `start.b`, `start.s` from a; a = b
 * when it starts at a place).
 */
export interface Run {
  pts: Pt[];
  cum: number[];
  /** Places along the run with their distance from its start. */
  marks: { id: string; at: number }[];
  start: { a: string; b: string; s: number };
}

function runOf(pts: Pt[], marks: Run['marks'], start: Run['start']): Run {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + dist(pts[i - 1], pts[i]));
  return { pts, cum, marks, start };
}

/** A train standing at a place. */
export const standAt = (layout: Layout, id: string): Run => runOf([layout.stops[id]], [{ id, at: 0 }], { a: id, b: id, s: 0 });

export const runLength = (r: Run) => r.cum[r.cum.length - 1];

/** The run along the track through these places. */
export function runThrough(layout: Layout, places: string[]): Run {
  let pts: Pt[] = [layout.stops[places[0]]];
  const marks = [{ id: places[0], at: 0 }];
  let at = 0;
  for (let i = 1; i < places.length; i++) {
    const h = hop(layout, places[i - 1], places[i]);
    pts = [...pts, ...h.slice(1)];
    at += lengthOf(h);
    marks.push({ id: places[i], at });
  }
  return runOf(pts, marks, { a: places[0], b: places[0], s: 0 });
}

/** Where the train is, and which way it faces (radians), at distance `d` along a run. */
export function poseOn(r: Run, d: number): { x: number; y: number; angle: number } {
  const total = runLength(r);
  const t = Math.max(0, Math.min(total, d));
  let i = 1;
  while (i < r.cum.length - 1 && r.cum[i] < t) i++;
  const [ax, ay] = r.pts[i - 1] ?? r.pts[0];
  const [bx, by] = r.pts[i] ?? r.pts[0];
  const seg = r.cum[i] - r.cum[i - 1] || 1;
  const f = Math.max(0, Math.min(1, (t - r.cum[i - 1]) / seg));
  return { x: ax + (bx - ax) * f, y: ay + (by - ay) * f, angle: Math.atan2(by - ay, bx - ax) };
}

/** Where on the track the train is, `d` along a run: on the edge a → b, `s` from a (a = b at a place). */
export function locate(r: Run, d: number): { a: string; b: string; s: number } {
  const first = r.marks[0];
  if (d < first.at) return { a: r.start.a, b: r.start.b, s: r.start.s + d };
  let i = 0;
  while (i + 1 < r.marks.length && r.marks[i + 1].at <= d) i++;
  if (i === r.marks.length - 1) return { a: r.marks[i].id, b: r.marks[i].id, s: 0 };
  return { a: r.marks[i].id, b: r.marks[i + 1].id, s: d - r.marks[i].at };
}

/** The points of a line from distance `from` along it to its end (starting with the point at `from`). */
function pointsFrom(pts: Pt[], from: number): Pt[] {
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const seg = dist(pts[i - 1], pts[i]);
    if (acc + seg >= from) {
      const f = seg ? (from - acc) / seg : 0;
      const p: Pt = [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f];
      return [p, ...pts.slice(i)];
    }
    acc += seg;
  }
  return [pts[pts.length - 1]];
}

/**
 * A new run to `to` for a train that is `d` along run `r`: on to one end of the edge it is on or
 * back to the other, whichever way is shorter in all, then along the track from there.
 */
export function rerouteTo(layout: Layout, r: Run, d: number, to: string): Run {
  const loc = locate(r, d);
  const total = (place: string) => runLength(runThrough(layout, pathBetween(layout, place, to)!));
  if (loc.a === loc.b) return runThrough(layout, pathBetween(layout, loc.a, to)!);
  const line = hop(layout, loc.a, loc.b);
  const len = lengthOf(line);
  const viaB = len - loc.s + total(loc.b);
  const viaA = loc.s + total(loc.a);
  const toB = viaB <= viaA;
  const lead = toB ? pointsFrom(line, loc.s) : pointsFrom([...line].reverse(), len - loc.s);
  const via = toB ? loc.b : loc.a;
  const rest = runThrough(layout, pathBetween(layout, via, to)!);
  const off = lengthOf(lead);
  const start = toB ? loc : { a: loc.b, b: loc.a, s: len - loc.s };
  return runOf([...lead, ...rest.pts.slice(1)], rest.marks.map((m) => ({ id: m.id, at: m.at + off })), start);
}
