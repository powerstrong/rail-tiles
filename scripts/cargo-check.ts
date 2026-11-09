/** Checks hand-made yards: `npx vite-node scripts/cargo-check.ts '3:FF,3:WWF,3:W' [board] [chain]` (one yard per argument group separated by +). */
import { auditCargo } from '../src/cargo/audit';
import { naiveMoves, parAnyWagon, parNoBoard, toDef } from '../src/cargo/generate';
import { parseCargoStage } from '../src/cargo/model';
import { explore, shortestFrom } from '../src/cargo/solver';

for (const arg of process.argv.slice(2)) {
  const [w, board = '', chain] = arg.split('/');
  const st = parseCargoStage({ id: 'x', title: '', tip: '', wagons: w.split(','), board: board || 'F', par: 0, solution: '', chain: chain ? Number(chain) : undefined }, 1);
  if (!board) st.board = [];
  const g = explore(st)!;
  const a = auditCargo(st, g);
  if (!a) {
    console.log(arg, '=> unsolvable');
    continue;
  }
  const sol = shortestFrom(st, g, g.states[0])!;
  console.log(`${arg} => par ${a.par} score ${a.score.toFixed(1)} bits ${a.bits.toFixed(1)} states ${a.reachable} traps ${(a.traps * 100).toFixed(0)}% chain ${a.chain} waited ${a.waited} opt ${a.optimal} naive ${naiveMoves({ ...st, par: a.par })} noLine ${parAnyWagon(st)}${st.board.length ? ` noBoard ${parNoBoard(st)}` : ''}  sol ${toDef({ ...st, par: a.par, solution: sol }).solution}`);
}
