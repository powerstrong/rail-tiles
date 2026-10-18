import { type Dir, DX, DY, opposite, rotateCW } from './dir';
import { type Rail, type RailKind, railPorts, rotationCount } from './rail';
import { type Placement, type Stage, cellAt, cellKey } from './stage';
import { type SwitchStates, enter, initialSwitches, motionKey } from './step';

export interface SolveResult {
  /** Number of distinct winning routes (capped at `limit`). */
  count: number;
  /** True when the route count hit `limit`, i.e. `count` is a lower bound. */
  truncated: boolean;
  /** Fewest player rails any winning route needs, or null when unsolvable. Exact even when truncated. */
  minRails: number | null;
  first: Placement[] | null;
  /** Every route found (up to `limit`), only when `collectRoutes` is set. */
  routes?: Placement[][];
}

function pieceFor(inEdge: Dir, outEdge: Dir): Rail {
  for (const kind of ['straight', 'curve'] as RailKind[]) {
    for (let rot = 0; rot < rotationCount(kind); rot++) {
      const [a, b] = railPorts({ kind, rot });
      if ((a === inEdge && b === outEdge) || (a === outEdge && b === inEdge)) return { kind, rot };
    }
  }
  throw new Error(`no piece connects ${inEdge} and ${outEdge}`);
}

/**
 * Enumerates every winning way to lay track (distinct sets of player rails).
 *
 * The train is driven by the same `enter` rules as `simulate`. Whenever it reaches an
 * empty cell with no rail yet, the search branches over the pieces that could go there;
 * when it comes back to a cell it already built, it simply follows that piece. Crossings
 * and switches make such revisits possible; a repeated (cell, heading, switches) state
 * means an endless loop and ends that branch.
 */
export function solve(stage: Stage, limit = 1000, collectRoutes = false): SolveResult {
  const all = search(stage, limit, Infinity, collectRoutes);
  const truncated = all.count >= limit;
  if (!truncated || all.minRails === null) return { ...all, truncated };
  // The capped enumeration may have stopped before reaching the shortest route:
  // find the true minimum by iterative deepening on the number of player rails.
  for (let depth = 0; depth < all.minRails; depth++) {
    if (search(stage, 1, depth, false).count > 0) return { ...all, truncated, minRails: depth };
  }
  return { ...all, truncated };
}

function search(stage: Stage, limit: number, maxRails: number, collect: boolean): Omit<SolveResult, 'truncated'> {
  const left = { ...stage.inventory };
  const built = new Map<string, Rail>();
  const path: Placement[] = [];
  /** Axes (bit 0: N–S, bit 1: E–W) each placed crossing has been driven on. */
  const crossAxes = new Map<string, number>();
  const switches: SwitchStates = initialSwitches(stage);
  const seen = new Set<string>();
  const stopVisits = new Map<string, number>(stage.waypoints.map((p) => [cellKey(p.x, p.y), 0]));
  const result: Omit<SolveResult, 'truncated'> = { count: 0, minRails: null, first: null, ...(collect ? { routes: [] } : {}) };
  const lookup = (x: number, y: number) => built.get(cellKey(x, y)) ?? null;

  const record = () => {
    if ([...stopVisits.values()].some((n) => n === 0)) return;
    // A crossing driven on only one axis acts as a straight. If enough straights are left
    // to swap them in, the same route with straights is counted on its own: skip this copy.
    const singleAxis = [...crossAxes.values()].filter((mask) => mask !== 3).length;
    if (singleAxis > 0 && left.straight >= singleAxis) return;
    result.count += 1;
    if (result.minRails === null || path.length < result.minRails) result.minRails = path.length;
    const copy = path.map((p) => ({ ...p, rail: { ...p.rail } }));
    if (!result.first) result.first = copy;
    result.routes?.push(copy);
  };

  /** Moves into (x, y) facing `heading` (already validated), recursing from there. */
  const arrive = (x: number, y: number, heading: Dir, toggle?: { key: string; to: 0 | 1 }) => {
    const key = cellKey(x, y);
    const prevSwitch = toggle ? switches[toggle.key] : undefined;
    if (toggle) switches[toggle.key] = toggle.to;
    const motion = motionKey(stage, x, y, heading, switches);
    if (!seen.has(motion)) {
      seen.add(motion);
      const stop = stopVisits.get(key);
      if (stop !== undefined) stopVisits.set(key, stop + 1);
      const cross = crossAxes.get(key);
      if (cross !== undefined) crossAxes.set(key, cross | (heading % 2 === 0 ? 1 : 2));
      visit(x, y, heading);
      if (cross !== undefined) crossAxes.set(key, cross);
      if (stop !== undefined) stopVisits.set(key, stop);
      seen.delete(motion);
    }
    if (toggle) switches[toggle.key] = prevSwitch!;
  };

  const visit = (x: number, y: number, heading: Dir): void => {
    if (result.count >= limit) return;
    const entry = enter(stage, lookup, switches, x, y, heading);
    if (entry.kind === 'fail') return;
    if (entry.kind === 'goal') return record();
    if (entry.kind === 'move') {
      const toggle = entry.step.kind === 'rail' ? entry.step.toggle : undefined;
      return arrive(entry.x, entry.y, entry.heading, toggle);
    }

    // Unbuilt empty cell: try every piece that could carry the train onward.
    if (path.length >= maxRails) return;
    const nx = x + DX[heading];
    const ny = y + DY[heading];
    const key = cellKey(nx, ny);
    const options: { rail: Rail; out: Dir }[] = [heading, rotateCW(heading, 1), rotateCW(heading, 3)].map((out) => ({
      rail: pieceFor(entry.inEdge, out),
      out,
    }));
    if (left.cross > 0) options.push({ rail: { kind: 'cross', rot: 0 }, out: opposite(entry.inEdge) });
    for (const { rail, out } of options) {
      if (left[rail.kind] <= 0) continue;
      left[rail.kind] -= 1;
      built.set(key, rail);
      path.push({ x: nx, y: ny, rail });
      if (rail.kind === 'cross') crossAxes.set(key, 0);
      arrive(nx, ny, out);
      crossAxes.delete(key);
      path.pop();
      built.delete(key);
      left[rail.kind] += 1;
    }
  };

  const start = stage.start;
  seen.add(motionKey(stage, start.x, start.y, start.dir, switches));
  if (cellAt(stage, start.x, start.y)) visit(start.x, start.y, start.dir);
  return result;
}
