/**
 * Space world stage search: `npx vite-node scripts/space-search.ts specs.ts [id ...]`.
 *
 * The spec file exports `specs: SpaceSpec[]` (see src/space/generate.ts): station size, capsules,
 * walls, boosters, wormholes, the par range and a target score. For each spec it builds random
 * stations, maps every capsule layout of each one, offers the layouts `par` presses away as the
 * docks, and prints the candidates closest to the target as stage definitions for
 * src/space/stages.ts. Optional ids after the file limit the run to those specs.
 */
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { type SpaceSpec, searchSpace, toDef } from '../src/space/generate';

const [file, ...only] = process.argv.slice(2);
if (!file) {
  console.error('usage: vite-node scripts/space-search.ts specs.ts [id ...]');
  process.exit(1);
}
const { specs } = (await import(pathToFileURL(resolve(file)).href)) as { specs: SpaceSpec[] };
const show = Number(process.env.SHOW ?? 1);

for (const spec of specs) {
  if (only.length && !only.includes(spec.id)) continue;
  const t0 = performance.now();
  const found = searchSpace(spec);
  const ms = performance.now() - t0;
  if (!found.length) {
    console.log(`// ${spec.id}: nothing found in ${ms.toFixed(0)}ms`);
    continue;
  }
  for (const best of found.slice(0, show)) {
    const a = best.audit;
    console.log(
      `// ${spec.id}: par ${a.par}, score ${a.score.toFixed(1)} (target ${spec.target ?? '-'}), bits ${a.bits.toFixed(1)}, ` +
        `layouts ${a.reachable}, traps ${(a.traps * 100).toFixed(0)}%, shortest answers ${a.optimal}; ${found.length} kept in ${(ms / 1000).toFixed(1)}s`,
    );
    console.log(`${JSON.stringify(toDef(best.stage), null, 2)},`);
  }
}
