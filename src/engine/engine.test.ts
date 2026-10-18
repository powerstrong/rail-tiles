import { describe, expect, it } from 'vitest';
import { E, N, S, W } from './dir';
import { createEditor, eraseRail, placeBlock, placeRail, remaining, replaceRail, resetBoard, rotateRail, undo } from './editor';
import { RAIL_GLYPHS, type Rail, railExit, railPorts } from './rail';
import { type RailMap, simulate } from './simulate';
import { solve } from './solver';
import { switchExit } from './step';
import { type StageDef, StageError, cellKey, parseStage } from './stage';

const blankSolution = (map: string[]) => map.map((row) => row.replace(/[^\s]/g, '.'));

function stage(
  map: string[],
  start: StageDef['start'],
  goal: StageDef['goal'],
  inventory = { straight: 9, curve: 9 },
  tunnels?: StageDef['tunnels'],
) {
  return parseStage({ id: 't', title: 't', tip: '', map, start, goal, inventory, tunnels, solution: blankSolution(map) }, 1);
}

/** Builds a RailMap from a glyph grid laid over the stage (`.` = nothing). */
function rails(grid: string[]): RailMap {
  const out: Record<string, Rail> = {};
  grid.forEach((row, y) =>
    row
      .trim()
      .split(/\s+/)
      .forEach((g, x) => {
        if (RAIL_GLYPHS[g]) out[cellKey(x, y)] = { ...RAIL_GLYPHS[g] };
      }),
  );
  return out;
}

// 5×5 board: start on the left facing east, goal on the right accepting from the west.
const LINE = ['. . . . .', '. . . . .', 'S . . . G', '. . . . .', '. . . . .'];

describe('rail ports', () => {
  it('straight pieces connect opposite edges', () => {
    expect(railPorts({ kind: 'straight', rot: 0 })).toEqual([N, S]);
    expect(railPorts({ kind: 'straight', rot: 1 })).toEqual([E, W]);
    expect(railPorts({ kind: 'straight', rot: 2 })).toEqual([N, S]);
    expect(railPorts({ kind: 'straight', rot: 3 })).toEqual([E, W]);
  });

  it('curve pieces connect adjacent edges, clockwise', () => {
    expect(railPorts({ kind: 'curve', rot: 0 })).toEqual([N, E]);
    expect(railPorts({ kind: 'curve', rot: 1 })).toEqual([E, S]);
    expect(railPorts({ kind: 'curve', rot: 2 })).toEqual([S, W]);
    expect(railPorts({ kind: 'curve', rot: 3 })).toEqual([W, N]);
  });

  it('railExit is symmetric and rejects missing ports', () => {
    for (const kind of ['straight', 'curve'] as const) {
      for (let rot = 0; rot < 4; rot++) {
        const rail = { kind, rot };
        const [a, b] = railPorts(rail);
        expect(railExit(rail, a)).toBe(b);
        expect(railExit(rail, b)).toBe(a);
        for (const d of [N, E, S, W].filter((d) => d !== a && d !== b)) expect(railExit(rail, d)).toBeNull();
      }
    }
  });

  it('map glyphs match their drawn shape', () => {
    expect([...railPorts(RAIL_GLYPHS['└'])].sort()).toEqual([N, E].sort());
    expect([...railPorts(RAIL_GLYPHS['┌'])].sort()).toEqual([E, S].sort());
    expect([...railPorts(RAIL_GLYPHS['┐'])].sort()).toEqual([S, W].sort());
    expect([...railPorts(RAIL_GLYPHS['┘'])].sort()).toEqual([W, N].sort());
  });
});

describe('stage parsing', () => {
  it('rejects malformed stages', () => {
    expect(() => stage(['. . . .', '. . . .', 'S . . G', '. . . .'], 'E', 'W')).toThrow(StageError);
    expect(() => stage(LINE.map((r) => r.replace('G', '.')), 'E', 'W')).toThrow(/missing goal/);
    expect(() => stage(LINE, 'W', 'W')).toThrow(/faces off the board/);
    expect(() => stage(['. . . . .', '. . . . .', 'S . ? . G', '. . . . .', '. . . . .'], 'E', 'W')).toThrow(/unknown glyph/);
  });
});

describe('simulate', () => {
  const s = stage(LINE, 'E', 'W');

  it('succeeds on a straight connection', () => {
    const trace = simulate(s, rails(['', '', '. ─ ─ ─ .']));
    expect(trace.success).toBe(true);
    expect(trace.steps.map((st) => st.kind)).toEqual(['start', 'rail', 'rail', 'rail', 'goal']);
  });

  it('fails where the track ends', () => {
    const trace = simulate(s, rails(['', '', '. ─ ─ . .']));
    expect(trace.success).toBe(false);
    expect(trace.failure).toMatchObject({ reason: 'no_track', cell: { x: 3, y: 2 }, from: { x: 2, y: 2 }, edge: E });
  });

  it('fails on a rail that does not face the train', () => {
    const trace = simulate(s, rails(['', '', '. ─ │ ─ .']));
    expect(trace.failure).toMatchObject({ reason: 'misaligned', cell: { x: 2, y: 2 }, edge: E });
  });

  it('fails when track runs off the board', () => {
    const trace = simulate(s, rails(['. . │ . .', '. . │ . .', '. ─ ┘ . .']));
    expect(trace.failure).toMatchObject({ reason: 'out_of_bounds', cell: { x: 2, y: -1 } });
  });

  it('fails when the train hits an obstacle', () => {
    const blocked = stage(['. . . . .', '. . . . .', 'S . R . G', '. . . . .', '. . . . .'], 'E', 'W');
    expect(simulate(blocked, rails(['', '', '. ─ . ─ .'])).failure?.reason).toBe('blocked');
  });

  it('fails when the goal is entered from the wrong side', () => {
    const fromBelow = stage(LINE, 'E', 'S');
    const trace = simulate(fromBelow, rails(['', '', '. ─ ─ ─ .']));
    expect(trace.failure).toMatchObject({ reason: 'goal_wrong_side', cell: { x: 4, y: 2 } });
  });

  it('fails when the route bends back into the start station', () => {
    const loopBack = stage(['. . . . .', '. . . . .', '. S . . G', '. . . . .', '. . . . .'], 'E', 'W');
    // (2,2) turns south, (2,3) turns west, (1,3) turns north — straight back into the station.
    const uturn = simulate(loopBack, rails(['', '', '. . ┐ . .', '. └ ┘ . .']));
    expect(uturn.failure).toMatchObject({ reason: 'start_reentry', cell: { x: 1, y: 2 } });
  });

  it('ignores rails that are not on the route', () => {
    const trace = simulate(s, rails(['┌ ─ ┐ │ │', '│ . . . ┘', '. ─ ─ ─ .', '─ ─ ┐ . └']));
    expect(trace.success).toBe(true);
  });

  it('follows fixed rails and refuses to rotate through them', () => {
    const fixed = stage(['. . . . .', '. . . . .', 'S . ─ . G', '. . . . .', '. . . . .'], 'E', 'W');
    expect(simulate(fixed, rails(['', '', '. ─ . ─ .'])).success).toBe(true);
    const fixedWrong = stage(['. . . . .', '. . . . .', 'S . │ . G', '. . . . .', '. . . . .'], 'E', 'W');
    expect(simulate(fixedWrong, rails(['', '', '. ─ ─ ─ .'])).failure?.reason).toBe('misaligned');
  });

  it('requires every passenger stop to be visited', () => {
    const stops = stage(['. . P . .', '. . . . .', 'S . . . G', '. . . . .', '. . . . .'], 'E', 'W');
    const straight = simulate(stops, rails(['', '', '. ─ ─ ─ .']));
    expect(straight.failure?.reason).toBe('missed_waypoint');
    expect(straight.failure?.missedWaypoints).toEqual([{ x: 2, y: 0 }]);
    const detour = simulate(stops, rails(['. ┌ ─ ┐ .', '. │ . │ .', '. ┘ . └ .']));
    expect(detour.success).toBe(true);
  });

  it('always terminates within the step limit', () => {
    // Exhaustively random boards: the trace must end and never claim a broken success.
    let seed = 7;
    const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const glyphs = ['.', '─', '│', '└', '┌', '┐', '┘'];
    for (let i = 0; i < 2000; i++) {
      const grid = [0, 1, 2, 3, 4].map(() => [0, 1, 2, 3, 4].map(() => glyphs[Math.floor(rand() * glyphs.length)]).join(' '));
      const placed = rails(grid);
      delete (placed as Record<string, Rail>)[cellKey(0, 2)];
      delete (placed as Record<string, Rail>)[cellKey(4, 2)];
      const trace = simulate(s, placed);
      expect(trace.steps.length).toBeLessThanOrEqual(5 * 5 + 2);
      if (trace.success) {
        // Independently re-check every hop connects port to port.
        for (let k = 1; k < trace.steps.length; k++) {
          const prev = trace.steps[k - 1];
          const cur = trace.steps[k];
          const out = prev.kind === 'goal' ? null : prev.outEdge;
          const inn = cur.kind === 'start' ? null : cur.inEdge;
          expect(out).not.toBeNull();
          expect(inn).toBe(((out as number) + 2) % 4);
        }
        expect(trace.steps.at(-1)?.kind).toBe('goal');
      }
    }
  });
});

describe('tunnels', () => {
  // Mouth "a" at (2,0) opens east; its pair at (2,2) opens west, right in front of the start.
  const map = ['. . a . .', '. . . . .', 'S . a . G', '. . . . .', '. . . . .'];
  const s = stage(map, 'E', 'W', { straight: 9, curve: 9 }, { a: ['E', 'W'] });
  // Start → (1,2) → into the lower mouth → out of the upper mouth heading east → down to the goal.
  const route = ['. . . ┐ .', '. . . │ .', '. ─ . └ .'];

  it('parses paired mouths with their openings', () => {
    expect(s.cells[0 * 5 + 2]).toMatchObject({ type: 'tunnel', dir: E, pair: { x: 2, y: 2 } });
    expect(s.cells[2 * 5 + 2]).toMatchObject({ type: 'tunnel', dir: W, pair: { x: 2, y: 0 } });
  });

  it('rejects unpaired or undeclared tunnels', () => {
    expect(() => stage(['. . a . .', '. . . . .', 'S . . . G', '. . . . .', '. . . . .'], 'E', 'W', undefined, { a: ['E', 'W'] })).toThrow(
      /exactly two mouths/,
    );
    expect(() => stage(map, 'E', 'W')).toThrow(/no entry in tunnels/);
  });

  it('carries the train from one mouth out of the other', () => {
    const trace = simulate(s, rails(route));
    expect(trace.success).toBe(true);
    expect(trace.steps.map((st) => st.kind)).toEqual(['start', 'rail', 'tunnel', 'rail', 'rail', 'rail', 'goal']);
    expect(trace.steps[2]).toMatchObject({ x: 2, y: 2, inEdge: W, toX: 2, toY: 0, outEdge: E });
  });

  it('refuses a mouth approached from the wrong side', () => {
    const sideways = stage(map, 'E', 'W', undefined, { a: ['E', 'N'] });
    expect(simulate(sideways, rails(route)).failure).toMatchObject({ reason: 'tunnel_wrong_side', cell: { x: 2, y: 2 } });
  });

  it('is understood by the solver and by auto-orient', () => {
    const tight = stage(map, 'E', 'W', { straight: 2, curve: 2 }, { a: ['E', 'W'] });
    const res = solve(tight);
    expect(res.minRails).toBe(4);
    const placed: Record<string, Rail> = {};
    for (const p of res.first ?? []) placed[cellKey(p.x, p.y)] = p.rail;
    expect(simulate(tight, placed).success).toBe(true);
    // A curve beside the upper mouth turns to meet its opening on the west.
    const ed = placeRail(s, createEditor(), 3, 0, 'curve');
    expect(railPorts(ed.placed[cellKey(3, 0)])).toContain(W);
  });
});

describe('crossings', () => {
  // The passenger at (3,2) must be picked up first, and rocks leave (1,2) as the only way
  // down to the goal, so the route has to come back over its own start line at (1,2).
  const map = ['. . . . .', '. . . . .', 'S . . P .', 'R . R . .', '. G . . .'];
  const loopRoute = ['. . . . .', '. ┌ ─ ┐ .', '. ┼ ─ ┘ .', '. │ . . .'];

  it('lets the train pass the same tile twice, once on each axis', () => {
    const s = stage(map, 'E', 'N', { straight: 9, curve: 9, cross: 1 } as never);
    const trace = simulate(s, rails(loopRoute));
    expect(trace.success).toBe(true);
    const visits = trace.steps.filter((st) => st.x === 1 && st.y === 2);
    expect(visits.map((v) => (v.kind === 'rail' ? [v.inEdge, v.outEdge] : null))).toEqual([
      [W, E],
      [N, S],
    ]);
  });

  it('a straight in its place blocks the second pass', () => {
    const s = stage(map, 'E', 'N');
    const trace = simulate(s, rails(['. . . . .', '. ┌ ─ ┐ .', '. ─ ─ ┘ .', '. │ . . .']));
    expect(trace.failure).toMatchObject({ reason: 'misaligned', cell: { x: 1, y: 2 } });
  });

  it('is required by the solver exactly when the map demands it', () => {
    const without = parseStage({ id: 'c', title: '', tip: '', map, start: 'E', goal: 'N', inventory: { straight: 9, curve: 9 }, solution: blankSolution(map) }, 1);
    expect(solve(without).count).toBe(0);
    const withCross = parseStage(
      { id: 'c', title: '', tip: '', map, start: 'E', goal: 'N', inventory: { straight: 9, curve: 9, cross: 1 }, solution: blankSolution(map) },
      1,
    );
    const res = solve(withCross, 1000, true);
    expect(res.count).toBeGreaterThan(0);
    expect(res.minRails).toBe(7);
    // Every route found actually wins and really uses its crossing twice.
    for (const route of res.routes ?? []) {
      const placed: Record<string, Rail> = {};
      for (const p of route) placed[cellKey(p.x, p.y)] = p.rail;
      expect(simulate(withCross, placed).success).toBe(true);
      expect(route.some((p) => p.rail.kind === 'cross')).toBe(true);
    }
  });
});

describe('switches', () => {
  // Switch 1 at (2,2): trunk west, straight branch east, turn branch north.
  const map = ['. . . . .', '. . . . .', 'S . 1 . G', '. . . . .', '. . . . .'];
  const make = (switches: StageDef['switches']) =>
    parseStage({ id: 'sw', title: '', tip: '', map, start: 'E', goal: 'W', inventory: { straight: 9, curve: 9 }, solution: blankSolution(map), switches }, 1);
  const line = rails(['. . . . .', '. . . . .', '. ─ . ─ .']);

  it('sends a train from the trunk along the set branch, then flips', () => {
    const st = make({ '1': { trunk: 'W', turn: 'N' } });
    const sw = st.cells[2 * 5 + 2];
    if (sw.type !== 'switch') throw new Error('expected a switch');
    expect(switchExit(sw, 0, W)).toEqual({ out: E, flips: true });
    expect(switchExit(sw, 1, W)).toEqual({ out: N, flips: true });
    expect(switchExit(sw, 0, E)).toEqual({ out: W, flips: false });
    expect(switchExit(sw, 1, N)).toEqual({ out: W, flips: false });
    expect(switchExit(sw, 0, S)).toBeNull();
  });

  it('records the flip in the trace and honours the initial setting', () => {
    const straightRun = simulate(make({ '1': { trunk: 'W', turn: 'N' } }), line);
    expect(straightRun.success).toBe(true);
    expect(straightRun.steps.find((st) => st.x === 2 && st.y === 2)).toMatchObject({
      kind: 'rail',
      inEdge: W,
      outEdge: E,
      toggle: { key: '2,2', to: 1 },
    });
    const turnRun = simulate(make({ '1': { trunk: 'W', turn: 'N', initial: 'turn' } }), line);
    expect(turnRun.failure).toMatchObject({ reason: 'no_track', cell: { x: 2, y: 1 } });
  });

  it('rejects malformed switches', () => {
    expect(() => make({})).toThrow(/no entry in switches/);
    expect(() => make({ '1': { trunk: 'W', turn: 'E' } })).toThrow(/sideways/);
  });
});

describe('editor', () => {
  const s = stage(['. . . . .', '. . R . .', 'S . ─ . G', '. . . . .', '. . . . .'], 'E', 'W', { straight: 2, curve: 1 });

  it('placing spends inventory and erasing refunds it', () => {
    let ed = placeRail(s, createEditor(), 1, 2, 'straight');
    expect(remaining(s, ed.placed)).toEqual({ straight: 1, curve: 1, cross: 0 });
    ed = eraseRail(ed, 1, 2);
    expect(remaining(s, ed.placed)).toEqual({ straight: 2, curve: 1, cross: 0 });
  });

  it('cannot place when the piece is used up', () => {
    let ed = createEditor();
    ed = placeRail(s, ed, 1, 2, 'curve');
    expect(placeBlock(s, ed.placed, 3, 2, 'curve')).toBe('none_left');
    expect(placeRail(s, ed, 3, 2, 'curve')).toBe(ed);
  });

  it('cannot place on fixed rails, obstacles, stations or occupied cells', () => {
    const ed = placeRail(s, createEditor(), 1, 2, 'straight');
    for (const [x, y] of [[2, 2], [2, 1], [0, 2], [4, 2], [1, 2], [-1, 0], [5, 5]]) {
      expect(placeRail(s, ed, x, y, 'straight')).toBe(ed);
    }
  });

  it('rotation keeps inventory and cycles through orientations', () => {
    let ed = placeRail(s, createEditor(), 1, 0, 'curve');
    const before = remaining(s, ed.placed);
    const rots: number[] = [];
    for (let i = 0; i < 4; i++) {
      ed = rotateRail(ed, 1, 0);
      rots.push(ed.placed[cellKey(1, 0)].rot);
    }
    expect(new Set(rots).size).toBe(4);
    expect(remaining(s, ed.placed)).toEqual(before);
    expect(rotateRail(ed, 3, 3)).toBe(ed);
  });

  it('replacing a rail refunds the old kind and spends the new one', () => {
    let ed = placeRail(s, createEditor(), 1, 2, 'straight');
    ed = replaceRail(s, ed, 1, 2, 'curve');
    expect(ed.placed[cellKey(1, 2)].kind).toBe('curve');
    expect(remaining(s, ed.placed)).toEqual({ straight: 2, curve: 0, cross: 0 });
    // The new curve is auto-oriented toward a neighbour that points at it:
    // the start station (west) or the fixed straight (east).
    const ports = railPorts(ed.placed[cellKey(1, 2)]);
    expect(ports.includes(W) || ports.includes(E)).toBe(true);
    ed = replaceRail(s, ed, 1, 2, 'straight');
    expect(remaining(s, ed.placed)).toEqual({ straight: 1, curve: 1, cross: 0 });
    expect(undo(ed).placed[cellKey(1, 2)].kind).toBe('curve');
  });

  it('replacing is a no-op for the same kind, empty cells, or an empty inventory', () => {
    const ed = placeRail(s, placeRail(s, createEditor(), 1, 2, 'straight'), 1, 0, 'curve');
    expect(replaceRail(s, ed, 1, 2, 'straight')).toBe(ed);
    expect(replaceRail(s, ed, 3, 3, 'curve')).toBe(ed);
    expect(replaceRail(s, ed, 1, 2, 'curve')).toBe(ed); // the only curve is already on the board
  });

  it('undo steps back through place, rotate, erase and reset', () => {
    const e0 = createEditor();
    const e1 = placeRail(s, e0, 1, 2, 'straight');
    const e2 = rotateRail(e1, 1, 2);
    const e3 = eraseRail(e2, 1, 2);
    const e4 = resetBoard(placeRail(s, e3, 3, 2, 'straight'));
    expect(e4.placed).toEqual({});
    const back1 = undo(e4);
    expect(Object.keys(back1.placed)).toEqual([cellKey(3, 2)]);
    expect(undo(undo(back1)).placed).toEqual(e2.placed);
    expect(undo(e0)).toBe(e0);
  });

  it('auto-orients new pieces toward stations and neighbouring rails', () => {
    let ed = placeRail(s, createEditor(), 1, 2, 'straight');
    expect([...railPorts(ed.placed[cellKey(1, 2)])].sort()).toEqual([E, W].sort());
    ed = placeRail(s, ed, 3, 2, 'straight');
    expect([...railPorts(ed.placed[cellKey(3, 2)])].sort()).toEqual([E, W].sort());
    expect(simulate(s, ed.placed).success).toBe(true);

    // A curve next to the start, with the way ahead blocked, should bend toward open ground.
    const turn = stage(['. . . . .', '. . . . .', 'S . R . .', '. . . . .', '. . . . G'], 'E', 'N');
    const c = placeRail(turn, createEditor(), 1, 2, 'curve');
    expect(railPorts(c.placed[cellKey(1, 2)])).toContain(W);
  });
});

describe('solver', () => {
  it('counts every route that fits the inventory', () => {
    expect(solve(stage(LINE, 'E', 'W', { straight: 3, curve: 0 })).count).toBe(1);
    expect(solve(stage(LINE, 'E', 'W', { straight: 2, curve: 0 })).count).toBe(0);
    const roomy = solve(stage(LINE, 'E', 'W'));
    expect(roomy.count).toBeGreaterThan(1);
    expect(roomy.minRails).toBe(3);
  });

  it('reports the true minimum even when the route count is capped', () => {
    // Open board with a huge number of routes; the shortest needs only 3 rails.
    const open = stage(['. . . . . .', 'S . . . . .', '. . . . . .', '. . G . . .', '. . . . . .', '. . . . . .'], 'E', 'N', {
      straight: 20,
      curve: 20,
    });
    for (const limit of [1, 1000]) {
      const res = solve(open, limit);
      expect(res.truncated).toBe(true);
      expect(res.count).toBe(limit);
      expect(res.minRails).toBe(3);
    }
    expect(solve(stage(LINE, 'E', 'W', { straight: 3, curve: 0 })).truncated).toBe(false);
  });

  it('every route it finds actually wins', () => {
    const s = stage(['. . P . .', '. . . . .', 'S . . . G', '. R . . .', '. . . . .'], 'E', 'W', { straight: 6, curve: 6 });
    const res = solve(s);
    expect(res.count).toBeGreaterThan(0);
    const placed: Record<string, Rail> = {};
    for (const p of res.first ?? []) placed[cellKey(p.x, p.y)] = p.rail;
    expect(simulate(s, placed).success).toBe(true);
  });
});
