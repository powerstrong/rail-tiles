import { describe, expect, it } from 'vitest';
import { E, N, S, W } from './dir';
import { createEditor, eraseRail, placeBlock, placeRail, remaining, replaceRail, resetBoard, rotateRail, undo } from './editor';
import { RAIL_GLYPHS, type Rail, railExit, railPorts } from './rail';
import { type RailMap, simulate } from './simulate';
import { solve } from './solver';
import { type StageDef, StageError, cellKey, parseStage } from './stage';

const blankSolution = (map: string[]) => map.map((row) => row.replace(/[^\s]/g, '.'));

function stage(map: string[], start: StageDef['start'], goal: StageDef['goal'], inventory = { straight: 9, curve: 9 }) {
  return parseStage({ id: 't', title: 't', tip: '', map, start, goal, inventory, solution: blankSolution(map) }, 1);
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
    expect(railPorts(RAIL_GLYPHS['└']).sort()).toEqual([N, E].sort());
    expect(railPorts(RAIL_GLYPHS['┌']).sort()).toEqual([E, S].sort());
    expect(railPorts(RAIL_GLYPHS['┐']).sort()).toEqual([S, W].sort());
    expect(railPorts(RAIL_GLYPHS['┘']).sort()).toEqual([W, N].sort());
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

describe('editor', () => {
  const s = stage(['. . . . .', '. . R . .', 'S . ─ . G', '. . . . .', '. . . . .'], 'E', 'W', { straight: 2, curve: 1 });

  it('placing spends inventory and erasing refunds it', () => {
    let ed = placeRail(s, createEditor(), 1, 2, 'straight');
    expect(remaining(s, ed.placed)).toEqual({ straight: 1, curve: 1 });
    ed = eraseRail(ed, 1, 2);
    expect(remaining(s, ed.placed)).toEqual({ straight: 2, curve: 1 });
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
    expect(remaining(s, ed.placed)).toEqual({ straight: 2, curve: 0 });
    // The new curve is auto-oriented toward a neighbour that points at it:
    // the start station (west) or the fixed straight (east).
    const ports = railPorts(ed.placed[cellKey(1, 2)]);
    expect(ports.includes(W) || ports.includes(E)).toBe(true);
    ed = replaceRail(s, ed, 1, 2, 'straight');
    expect(remaining(s, ed.placed)).toEqual({ straight: 1, curve: 1 });
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
    expect(railPorts(ed.placed[cellKey(1, 2)]).sort()).toEqual([E, W].sort());
    ed = placeRail(s, ed, 3, 2, 'straight');
    expect(railPorts(ed.placed[cellKey(3, 2)]).sort()).toEqual([E, W].sort());
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
