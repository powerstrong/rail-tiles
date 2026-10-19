/**
 * Daily puzzle check: generation time, size, par, inventory and route spread for a run of dates.
 *
 *   vite-node scripts/daily-report.ts [YYYY-MM-DD] [days]
 */
import { dailyStage } from '../src/engine/generate';
import { solve } from '../src/engine/solver';
import { TWO_STAR_SLACK } from '../src/engine/stars';

const [from = new Date().toISOString().slice(0, 10), days = '14'] = process.argv.slice(2);
const d0 = new Date(`${from}T12:00:00`);
let worst = 0;
for (let i = 0; i < Number(days); i++) {
  const d = new Date(d0.getTime() + i * 86400000);
  const date = d.toISOString().slice(0, 10);
  const t = performance.now();
  const stage = dailyStage(date);
  const ms = performance.now() - t;
  worst = Math.max(worst, ms);
  const res = solve(stage, 4000, true);
  const lens = (res.routes ?? []).map((r) => r.length);
  const three = lens.filter((n) => n <= stage.par).length;
  const two = lens.filter((n) => n > stage.par && n <= stage.par + TWO_STAR_SLACK).length;
  console.log(
    `${date} ${stage.width}x${stage.height} par ${stage.par} min ${res.minRails} inv s${stage.inventory.straight} c${stage.inventory.curve} ` +
      `riders ${stage.waypoints.length}  ★★★ ${three} ★★ ${two} ★ ${lens.length - three - two}  ${ms.toFixed(0)}ms`,
  );
  if (i === 0 || process.env.SHOW) {
    const rows = Array.from({ length: stage.height }, (_, y) =>
      Array.from({ length: stage.width }, (_, x) => {
        const sol = stage.solution.find((p) => p.x === x && p.y === y);
        const c = stage.cells[y * stage.width + x];
        if (sol) return '#';
        if (c.type === 'start') return 'S';
        if (c.type === 'goal') return 'G';
        if (c.type === 'obstacle') return c.deco[0].toUpperCase();
        return c.type === 'empty' && c.waypoint ? 'P' : '.';
      }).join(' '),
    );
    console.log(rows.map((r) => '    ' + r).join('\n'));
  }
}
console.log(`slowest generation: ${worst.toFixed(0)} ms`);
