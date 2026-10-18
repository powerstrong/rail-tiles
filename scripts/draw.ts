import { RAIL_GLYPHS } from '../src/engine/rail';
import { type Placement, type Stage, cellAt } from '../src/engine/stage';

const GLYPH_OF = new Map(Object.entries(RAIL_GLYPHS).map(([g, r]) => [`${r.kind}:${r.rot}`, g]));
const MAP_GLYPH: Record<string, string> = { tree: 'T', rock: 'R', mountain: 'M', water: 'W', house: 'H' };

/** Renders a stage as glyphs, with an optional solution drawn onto the empty cells. */
export function draw(stage: Stage, solution: Placement[] | null): string {
  const rows: string[] = [];
  for (let y = 0; y < stage.height; y++) {
    const row: string[] = [];
    for (let x = 0; x < stage.width; x++) {
      const placed = solution?.find((p) => p.x === x && p.y === y);
      if (placed) {
        row.push(GLYPH_OF.get(`${placed.rail.kind}:${placed.rail.rot}`) ?? '?');
        continue;
      }
      const cell = cellAt(stage, x, y)!;
      if (cell.type === 'start') row.push('S');
      else if (cell.type === 'goal') row.push('G');
      else if (cell.type === 'obstacle') row.push(MAP_GLYPH[cell.deco]);
      else if (cell.type === 'fixed') row.push(cell.bridge ? (cell.rail.rot % 2 ? '═' : '║') : (GLYPH_OF.get(`${cell.rail.kind}:${cell.rail.rot}`) ?? '?'));
      else row.push(cell.waypoint ? 'P' : '·');
    }
    rows.push('    ' + row.join(' '));
  }
  return rows.join('\n');
}


/** The `solution` grid for a StageDef: rail glyphs on placed cells, `.` everywhere else. */
export function solutionGrid(stage: Stage, route: Placement[]): string[] {
  return Array.from({ length: stage.height }, (_, y) =>
    Array.from({ length: stage.width }, (_, x) => {
      const p = route.find((r) => r.x === x && r.y === y);
      return p ? GLYPH_OF.get(`${p.rail.kind}:${p.rail.rot}`) : '.';
    }).join(' '),
  );
}
