/**
 * Difficulty audit (library; CLI in difficulty.ts).
 *
 * Walks each stage's ★★★ solution cell by cell, the way a player lays it. At every cell it
 * tries the other pieces that would fit there and keep the train rolling onto open ground,
 * and asks the solver whether the stage can still be won:
 *   trap   – looks fine locally but can never win (a wrong turn the player must see through)
 *   fork   – another way that still wins (freedom, not difficulty)
 * Also reports total search effort under the stage's own inventory.
 */
import { RAIL_KINDS, type Rail, normalizeRot, rotationCount } from '../src/engine/rail';
import { simulate } from '../src/engine/simulate';
import { probe, searchEffort, solve } from '../src/engine/solver';
import { type Placement, type Stage, cellKey } from '../src/engine/stage';

export interface Audit {
  stage: Stage;
  par: number;
  optimal: number;
  routes: number;
  traps: number;
  trapCells: number;
  forks: number;
  effort: number | null;
  mechanics: string[];
}

/** The solution's pieces in the order the train first reaches them. */
function drivingOrder(stage: Stage): Placement[] {
  const byKey = new Map(stage.solution.map((p) => [cellKey(p.x, p.y), p]));
  const trace = simulate(stage, Object.fromEntries([...byKey].map(([k, p]) => [k, p.rail])));
  const out: Placement[] = [];
  for (const st of trace.steps) {
    const p = st.kind === 'rail' ? byKey.get(cellKey(st.x, st.y)) : undefined;
    if (p && !out.includes(p)) out.push(p);
  }
  return out;
}

const same = (a: Rail, b: Rail) => a.kind === b.kind && normalizeRot(a.kind, a.rot) === normalizeRot(b.kind, b.rot);

export function audit(stage: Stage): Audit {
  const order = drivingOrder(stage);
  let traps = 0;
  let trapCells = 0;
  let forks = 0;
  order.forEach((cell, i) => {
    const prefix = order.slice(0, i);
    const used = { straight: 0, curve: 0, cross: 0 };
    for (const p of prefix) used[p.rail.kind]++;
    let cellTraps = 0;
    for (const kind of RAIL_KINDS) {
      if (used[kind] >= stage.inventory[kind]) continue;
      for (let rot = 0; rot < rotationCount(kind); rot++) {
        const alt: Rail = { kind, rot };
        if (same(alt, cell.rail)) continue;
        const preset = [...prefix, { x: cell.x, y: cell.y, rail: alt }];
        const t = simulate(stage, Object.fromEntries(preset.map((p) => [cellKey(p.x, p.y), p.rail])));
        // Only pieces that carry the train on to open ground (or straight to the goal too early) tempt a player.
        const reason = t.failure?.reason;
        const tempting = reason === 'no_track' || reason === 'missed_waypoint' || reason === 'undelivered';
        if (!tempting) continue;
        const r = probe(stage, preset);
        if (r === null || !r.winnable) cellTraps++;
        else forks++;
      }
    }
    traps += cellTraps;
    if (cellTraps > 0) trapCells++;
  });
  const res = solve(stage, 3000, true);
  const mechanics = [
    stage.waypoints.length ? `손님${stage.waypoints.length}` : '',
    stage.riders.length ? `배달${stage.riders.length}` : '',
    stage.cells.some((c) => c.type === 'tunnel') ? '터널' : '',
    stage.inventory.cross ? '교차' : '',
    stage.switches.length ? '분기' : '',
    stage.cells.some((c) => c.type === 'fixed') ? '고정' : '',
  ].filter(Boolean);
  return {
    stage,
    par: stage.par,
    optimal: res.routes!.filter((r) => r.length === stage.par).length,
    routes: res.count,
    traps,
    trapCells,
    forks,
    effort: searchEffort(stage),
    mechanics,
  };
}


/**
 * One number for how hard a stage feels: tempting dead ends along the answer, plus how big
 * the search space is (log2 of solver nodes). Rough guide: 2 trivial, ~10–15 easy,
 * ~20 a chapter-1 finale, 30+ hard, 40+ boss.
 */
export function difficultyScore(a: Pick<Audit, 'traps' | 'effort'>): number {
  return a.traps + Math.log2(Math.max(2, a.effort ?? 8_000_000));
}
