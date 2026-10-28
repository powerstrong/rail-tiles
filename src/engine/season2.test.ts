import { describe, expect, it } from 'vitest';
import { RAIL_GLYPHS, type Rail } from './rail';
import { simulate } from './simulate';
import { solve } from './solver';
import { type StageDef, cellKey, parseStage } from './stage';

const BLANK = ['. . . . .', '. . . . .', '. . . . .', '. . . . .', '. . . . .'];

/** A 5×5 stage whose middle row is `row`; the other rows are trees. */
function line(row: string, extra: Partial<StageDef> = {}, rows?: string[]) {
  const map = rows ?? ['T T T T T', 'T T T T T', row, 'T T T T T', 'T T T T T'];
  return parseStage({ id: 't', title: '', tip: '', map, start: 'E', goal: 'W', inventory: { straight: 9, curve: 9 }, solution: BLANK, ...extra }, 0);
}

/** Rails from a 5×5 glyph grid. */
function rails(grid: string[]): Record<string, Rail> {
  const out: Record<string, Rail> = {};
  grid.forEach((row, y) =>
    row.split(' ').forEach((g, x) => {
      if (RAIL_GLYPHS[g]) out[cellKey(x, y)] = RAIL_GLYPHS[g];
    }),
  );
  return out;
}
const STRAIGHT_ROW = (cells: number[]) => rails(['. . . . .', '. . . . .', [0, 1, 2, 3, 4].map((x) => (cells.includes(x) ? '─' : '.')).join(' '), '. . . . .', '. . . . .']);

describe('season 2 rules', () => {
  it('a gate stays shut until a button of its colour is passed', () => {
    const shut = line('S . D1 . G');
    expect(simulate(shut, STRAIGHT_ROW([1, 2, 3])).failure?.reason).toBe('gate_closed');
    const opened = line('S K1 D1 . G');
    const t = simulate(opened, STRAIGHT_ROW([1, 2, 3]));
    expect(t.success).toBe(true);
    expect(t.steps[1]).toMatchObject({ kind: 'rail', signal: { key: 'ch1', to: 1 } });
    expect(solve(opened).minRails).toBe(3);
  });

  it('a lever flips its drawbridge each time the train passes it', () => {
    expect(simulate(line('S . ═1 . G'), STRAIGHT_ROW([1, 3])).failure?.reason).toBe('bridge_up');
    expect(simulate(line('S L1 ═1 . G'), STRAIGHT_ROW([1, 3])).success).toBe(true);
    // Starting down, the lever raises it in front of the train.
    expect(simulate(line('S L1 ═1 . G', { open: [1] }), STRAIGHT_ROW([1, 3])).failure?.reason).toBe('bridge_up');
  });

  it('the steam train runs dry without a water tower', () => {
    expect(simulate(line('S . . . G', { water: 3 }), STRAIGHT_ROW([1, 2, 3])).failure?.reason).toBe('no_water');
    const t = simulate(line('S . F . G', { water: 3 }), STRAIGHT_ROW([1, 2, 3]));
    expect(t.success).toBe(true);
    expect(t.water).toEqual([3, 2, 3, 2, 1]);
    expect(solve(line('S . . . G', { water: 3 })).minRails).toBe(null);
  });

  it('a turntable sends the train off to its right', () => {
    const map = ['T T T T T', 'T T T T T', 'S . ↻ T T', 'T T . T T', 'T T G T T'];
    const st = parseStage({ id: 't', title: '', tip: '', map, start: 'E', goal: 'N', inventory: { straight: 9, curve: 9 }, solution: BLANK }, 0);
    expect(simulate(st, rails(['. . . . .', '. . . . .', '. ─ . . .', '. . │ . .', '. . . . .'])).success).toBe(true);
    expect(solve(st).minRails).toBe(2);
  });

  it('every freight wagon must be coupled on before the goal', () => {
    const rows = ['T T T T T', 'T O T T T', 'S . . . G', 'T T T T T', 'T T T T T'];
    const st = line('', {}, rows);
    expect(simulate(st, STRAIGHT_ROW([1, 2, 3])).failure?.reason).toBe('missed_wagon');
    expect(simulate(line('S O . . G'), STRAIGHT_ROW([1, 2, 3])).success).toBe(true);
  });
});
