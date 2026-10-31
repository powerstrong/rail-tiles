/**
 * Depot world stage search: `npx vite-node scripts/depot-search.ts specs.ts [id ...]`.
 *
 * The spec file exports `specs: DepotSpec[]` (see src/depot/generate.ts): yard size, gates,
 * wagons, crossing, the par range and a target score. For each spec it builds random yards,
 * explores every layout of each one and offers the layouts that need `par` moves as puzzles,
 * then prints the one closest to the target as a stage definition for src/depot/stages.ts.
 * Optional ids after the file limit the run to those specs.
 */
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { type DepotSpec, searchDepot, toDef } from '../src/depot/generate';

const [file, ...only] = process.argv.slice(2);
if (!file) {
  console.error('usage: vite-node scripts/depot-search.ts specs.ts [id ...]');
  process.exit(1);
}
const { specs } = (await import(pathToFileURL(resolve(file)).href)) as { specs: DepotSpec[] };

for (const spec of specs) {
  if (only.length && !only.includes(spec.id)) continue;
  const t0 = performance.now();
  const found = searchDepot(spec);
  const ms = performance.now() - t0;
  const best = found[0];
  if (!best) {
    console.log(`// ${spec.id}: nothing found in ${ms.toFixed(0)}ms`);
    continue;
  }
  const a = best.audit;
  console.log(
    `// ${spec.id}: par ${a.par}, score ${a.score.toFixed(1)} (target ${spec.target ?? '-'}), bits ${a.bits.toFixed(1)}, ` +
      `layouts ${a.reachable}, shortest answers ${a.optimal}; ${found.length} candidates in ${(ms / 1000).toFixed(1)}s`,
  );
  console.log(`${JSON.stringify(toDef(best.stage), null, 2)},`);
}
