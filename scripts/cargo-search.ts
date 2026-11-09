/**
 * Gift freight yard stage search: `npx vite-node scripts/cargo-search.ts specs.ts [id ...]`.
 *
 * The spec file exports `specs: CargoSpec[]` (see src/cargo/generate.ts): wagon sizes, gifts,
 * trains, the par range, which rules must matter and a target score. For each spec it builds
 * random yards, maps every one with the solver and prints the candidates closest to the target as
 * stage definitions for src/cargo/stages.ts. Optional ids after the file limit the run to those
 * specs. SHOW=n prints n candidates per spec.
 */
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { type CargoSpec, naiveMoves, parAnyWagon, parNoBoard, searchCargo, toDef } from '../src/cargo/generate';
import { KIND_GLYPHS } from '../src/cargo/model';

const [file, ...only] = process.argv.slice(2);
if (!file) {
  console.error('usage: vite-node scripts/cargo-search.ts specs.ts [id ...]');
  process.exit(1);
}
const { specs } = (await import(pathToFileURL(resolve(file)).href)) as { specs: CargoSpec[] };
const show = Number(process.env.SHOW ?? 1);

for (const spec of specs) {
  if (only.length && !only.includes(spec.id)) continue;
  const t0 = performance.now();
  const found = searchCargo(spec);
  const ms = performance.now() - t0;
  if (!found.length) {
    console.log(`// ${spec.id}: nothing found in ${(ms / 1000).toFixed(1)}s`);
    continue;
  }
  for (const best of found.slice(0, show)) {
    const a = best.audit;
    const st = best.stage;
    console.log(
      `// ${spec.id}: par ${a.par}, score ${a.score.toFixed(1)} (target ${spec.target ?? '-'}), bits ${a.bits.toFixed(1)}, states ${a.reachable}, ` +
        `traps ${(a.traps * 100).toFixed(0)}%, chain ${a.chain}, waited ${a.waited}, shortest answers ${a.optimal}, ` +
        `naive ${naiveMoves(st)}, no line ${parAnyWagon(st)}${st.board.length ? `, no board ${parNoBoard(st)}` : ''}; ${found.length} kept in ${(ms / 1000).toFixed(1)}s`,
    );
    const pic = st.sizes.map((n, i) => `[${st.start[i].map((k) => KIND_GLYPHS[k]).join('').padEnd(n, '.')}]`).join(' ');
    console.log(`//   ${pic}${st.board.length ? `  board ${st.board.map((k) => KIND_GLYPHS[k]).join('')}` : ''}`);
    console.log(`${JSON.stringify(toDef(st))},`);
  }
}
