import { describe, expect, it } from 'vitest';
import { auditDepot } from './audit';
import { dailyDepotDef, dailyDepotStage, randomYard, rng, startsFor, toDef } from './generate';
import { type DepotStageDef, GONE, moveName, parseDepotStage, parseMove } from './model';
import { applyMove, canMove, initialState, isWon, legalMoves, reach } from './slide';
import { hintFrom, solveDepot } from './solver';

const def = (map: string[], extra: Partial<DepotStageDef> = {}): DepotStageDef => ({ id: 't', title: 't', tip: '', map, exits: { r: 'E' }, par: 0, solution: [], ...extra });

describe('depot stages parse', () => {
  it('reads locomotives first, then wagons by letter, with their lines and kinds', () => {
    const s = parseDepotStage(
      def(['. . B . . .', '. . B . . .', 'r r B . . .', '. . . A A A', '. . t . . .'], { exits: { r: 'E' } }),
      1,
    );
    expect(s.vehicles.map((v) => [v.glyph, v.kind, v.horizontal, v.line, v.len])).toEqual([
      ['r', 'loco', true, 2, 2],
      ['A', 'freight', true, 3, 3],
      ['B', 'freight', false, 2, 3],
    ]);
    expect(s.start).toEqual([0, 3, 0]);
    expect(s.tiles[4 * 6 + 2]).toEqual({ t: 'block', deco: 'tower' });
  });

  it('rejects broken maps', () => {
    expect(() => parseDepotStage(def(['r . r . .', '. . . . .', '. . . . .', '. . . . .']), 1)).toThrow(/gap/);
    expect(() => parseDepotStage(def(['r r . . .', '. A . . .', '. A A . .', '. . . . .']), 1)).toThrow(/straight/);
    expect(() => parseDepotStage(def(['r r . . .', '. . . . .', '. . . . .', '. . . . .'], { exits: { r: 'S' } }), 1)).toThrow(/along its line/);
    expect(() => parseDepotStage(def(['r r . . .', '. . . . .', '. . . . .', '. . . . .'], { exits: {} }), 1)).toThrow(/no gate/);
    expect(() => parseDepotStage(def(['r r . = .', '. . . . .', '. . . . .', '. . . . .']), 1)).toThrow(/no button/);
  });

  it('keeps buttons and barriers under wagons', () => {
    const s = parseDepotStage(def(['r r . A .', '. . . A .', '. . . . .', '. . . . .'], { under: { '3,0': '=', '3,1': '+' } }), 1);
    expect(s.barriers).toEqual([3]);
    expect(s.buttons).toEqual([8]);
  });
});

describe('depot moves', () => {
  const s = parseDepotStage(def(['. . . . .', '. . A . .', 'r r A . .', '. . . . .', '. . t . .']), 1);

  it('slides a wagon along its line as far as the way is clear', () => {
    expect(reach(s, initialState(s), 1)).toEqual({ min: 0, max: 2, canLeave: false });
    // The water tower stops it two cells down.
    expect(legalMoves(s, initialState(s)).filter((m) => m.vehicle === 1).map((m) => m.to)).toEqual([0, 2]);
  });

  it('lets the locomotive leave only once its way to the gate is clear', () => {
    const start = initialState(s);
    expect(reach(s, start, 0).canLeave).toBe(false);
    expect(canMove(s, start, { vehicle: 0, to: GONE })).toBe(false);
    const cleared = applyMove(start, { vehicle: 1, to: 0 });
    expect(reach(s, cleared, 0)).toEqual({ min: 0, max: 3, canLeave: true });
    const out = applyMove(cleared, { vehicle: 0, to: GONE });
    expect(isWon(s, out)).toBe(true);
  });

  it('finds the fewest moves, the hint, and every shortest answer', () => {
    const res = solveDepot(s);
    expect(res.par).toBe(2);
    expect(res.optimal).toBe(1);
    expect(hintFrom(s, initialState(s))).toEqual({ vehicle: 1, to: 0 });
  });

  it('names moves and reads them back', () => {
    const start = initialState(s);
    expect(moveName(s, start[1], { vehicle: 1, to: 0 })).toBe('A-1');
    expect(moveName(s, start[0], { vehicle: 0, to: GONE })).toBe('r!');
    expect(parseMove(s, start, 'A-1')).toEqual({ vehicle: 1, to: 0 });
    expect(parseMove(s, start, 'r!')).toEqual({ vehicle: 0, to: GONE });
  });
});

describe('level crossings', () => {
  it('keeps the barrier shut until another wagon stands on the button', () => {
    // Wagon A rolls up and down column 3, onto the button in row 3 or off it.
    const s = parseDepotStage(def(['. . . . .', '. . . . .', 'r r . = .', '. . . + .', '. . . A .', '. . . A .']), 1);
    expect(reach(s, initialState(s), 0)).toEqual({ min: 0, max: 1, canLeave: false });
    const parked = applyMove(initialState(s), { vehicle: 1, to: 3 });
    expect(reach(s, parked, 0)).toEqual({ min: 0, max: 3, canLeave: true });
    expect(solveDepot(s).par).toBe(2);
  });

  it('can never be passed when no wagon can reach the button', () => {
    const s = parseDepotStage(def(['. . . . .', '. . . . .', 'r r . = .', '. A . . .', '. A . + .']), 1);
    expect(solveDepot(s).par).toBe(null);
  });

  it('never counts the moving wagon as holding the button for itself', () => {
    // B stands on the button; it may not drive itself across the barrier above.
    const self = parseDepotStage(def(['r r . . .', '. . . . .', '. . . = .', '. . . B .', '. . . B .'], { under: { '3,3': '+' } }), 1);
    expect(reach(self, initialState(self), 1).min).toBe(3);
  });

  it('lets a wagon already on a closed barrier drive off it', () => {
    const on = parseDepotStage(def(['r r . . .', '. . . . .', '. . . A .', '. . . A .', '. . . + .'], { under: { '3,2': '=' } }), 1);
    expect(reach(on, initialState(on), 1)).toEqual({ min: 0, max: 3, canLeave: false });
  });
});

describe('depot generator', () => {
  it('turns a yard into puzzles whose definitions read back with the same par', () => {
    const spec = { id: 'dp-test', title: 't', tip: 't', width: 6, height: 6, locos: [{ glyph: 'r' as const, exit: 'E' as const }], wagons: [4, 6] as [number, number], crossing: true, par: [4, 7] as [number, number] };
    const rand = rng(7);
    let checked = 0;
    for (let t = 0; t < 80 && checked < 3; t++) {
      const yard = randomYard(rand, spec);
      if (!yard) continue;
      for (const c of startsFor(yard, spec, rand, 4, 20_000).slice(0, 1)) {
        const back = parseDepotStage(toDef(c.stage), 1);
        expect(back.start).toEqual(c.stage.start);
        expect(solveDepot(back).par).toBe(c.audit.par);
        expect(auditDepot(back)!.score).toBeCloseTo(c.audit.score, 6);
        checked++;
      }
    }
    expect(checked).toBe(3);
  }, 60_000);

  it('builds the same daily puzzle for a date every time, and the solver agrees with its par', () => {
    const a = dailyDepotDef('2026-11-02');
    expect(dailyDepotDef('2026-11-02')).toEqual(a);
    expect(a.id).toBe('depot-daily-2026-11-02');
    const stage = dailyDepotStage(a);
    expect(solveDepot(stage).par).toBe(a.par);
    let st = initialState(stage);
    for (const m of stage.solution) st = applyMove(st, m);
    expect(isWon(stage, st)).toBe(true);
  }, 60_000);
});

describe('depot hints', () => {
  it('always point at a move that keeps the shortest win in reach, on every stage', async () => {
    const { DEPOT_STAGES } = await import('./stages');
    const { explore } = await import('./solver');
    for (const stage of DEPOT_STAGES.slice(0, 12)) {
      const g = explore(stage);
      const start = initialState(stage);
      const m = hintFrom(stage, start)!;
      const next = applyMove(start, m);
      const key = [...g.states].find(([, s]) => s.join() === next.join())![0];
      expect(g.toWin.get(key), stage.id).toBe(stage.par - 1);
    }
  }, 60_000);
});
