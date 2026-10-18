import { type Dir, DX, DY, opposite, rotateCW } from './dir';
import { type Rail, type RailKind, railExit, railPorts, rotationCount } from './rail';
import { type Placement, type Stage, cellAt, cellKey } from './stage';

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
 * Enumerates every route from start to goal that fits the inventory. A route is a
 * simple path (two-port pieces can never be crossed twice), so a DFS over
 * "go straight / turn left / turn right" with visited-cell pruning is exhaustive.
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
  const visited = new Set<string>();
  const path: Placement[] = [];
  const result: Omit<SolveResult, 'truncated'> = { count: 0, minRails: null, first: null, ...(collect ? { routes: [] } : {}) };
  const copy = () => path.map((p) => ({ ...p, rail: { ...p.rail } }));

  const visit = (x: number, y: number, heading: Dir): void => {
    if (result.count >= limit) return;
    const nx = x + DX[heading];
    const ny = y + DY[heading];
    const inEdge = opposite(heading);
    const cell = cellAt(stage, nx, ny);
    const key = cellKey(nx, ny);
    if (!cell || visited.has(key)) return;

    if (cell.type === 'goal') {
      if (stage.goal.dir !== inEdge) return;
      if (!stage.waypoints.every((p) => visited.has(cellKey(p.x, p.y)))) return;
      result.count += 1;
      if (result.minRails === null || path.length < result.minRails) result.minRails = path.length;
      if (!result.first) result.first = copy();
      result.routes?.push(copy());
      return;
    }

    if (cell.type === 'tunnel') {
      // Each mouth has a single opening, so a tunnel can be ridden at most once.
      if (cell.dir !== inEdge) return;
      const exitKey = cellKey(cell.pair.x, cell.pair.y);
      const exit = cellAt(stage, cell.pair.x, cell.pair.y);
      if (visited.has(exitKey) || exit?.type !== 'tunnel') return;
      visited.add(key);
      visited.add(exitKey);
      visit(cell.pair.x, cell.pair.y, exit.dir);
      visited.delete(exitKey);
      visited.delete(key);
      return;
    }

    if (cell.type === 'fixed') {
      const out = railExit(cell.rail, inEdge);
      if (out === null) return;
      visited.add(key);
      visit(nx, ny, out);
      visited.delete(key);
      return;
    }

    if (cell.type !== 'empty' || path.length >= maxRails) return;

    visited.add(key);
    for (const out of [heading, rotateCW(heading, 1), rotateCW(heading, 3)]) {
      const rail = pieceFor(inEdge, out);
      if (left[rail.kind] <= 0) continue;
      left[rail.kind] -= 1;
      path.push({ x: nx, y: ny, rail });
      visit(nx, ny, out);
      path.pop();
      left[rail.kind] += 1;
    }
    visited.delete(key);
  };

  visited.add(cellKey(stage.start.x, stage.start.y));
  visit(stage.start.x, stage.start.y, stage.start.dir);
  return result;
}
