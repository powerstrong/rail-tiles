/**
 * Specs the space world's stages were searched from: `npx vite-node scripts/space-search.ts scripts/space-specs.ts [id ...]`.
 * Every stage past the first lessons is `beatNaive`: walking straight at the goal must not earn ★★★.
 * Targets are audit scores (src/space/audit.ts); the picked candidates are in src/space/stages.ts.
 */
import type { SpaceSpec } from '../src/space/generate';

type S = Omit<SpaceSpec, 'title' | 'tip'>;
const T3 = { tries: 250 };

export const specs: SpaceSpec[] = (
  [
    // Chapter 1: gravity and walls, one to three capsules.
    { id: 'sp-first-gravity', width: 4, height: 4, capsules: 1, walls: [1, 2], par: [3, 3], target: 4 },
    { id: 'sp-wall-stop', width: 5, height: 5, capsules: 1, walls: [3, 5], par: [4, 5], target: 7 },
    { id: 'sp-two-capsules', width: 5, height: 5, capsules: 2, walls: [2, 4], par: [4, 5], target: 11 },
    { id: 'sp-lean-on-wall', beatNaive: true, width: 5, height: 5, capsules: 2, walls: [3, 5], par: [5, 7], target: 15, maxOptimal: 6 },
    { id: 'sp-oxygen-1', beatNaive: true, width: 5, height: 5, capsules: 2, walls: [3, 5], par: [5, 6], target: 14, slack: 3 },
    { id: 'sp-asteroids', beatNaive: true, width: 6, height: 6, capsules: 2, walls: [5, 7], rocks: 1, par: [6, 9], target: 19, maxOptimal: 6 },
    { id: 'sp-crossing', beatNaive: true, width: 6, height: 6, capsules: 2, walls: [4, 7], par: [7, 10], target: 23, maxOptimal: 4 },
    { id: 'sp-three-capsules', beatNaive: true, width: 5, height: 5, capsules: 3, walls: [3, 5], par: [6, 10], target: 25, ...T3 },
    { id: 'sp-queue', beatNaive: true, width: 6, height: 6, capsules: 3, walls: [4, 7], par: [8, 12], target: 30, ...T3 },
    { id: 'sp-boss-1', beatNaive: true, width: 6, height: 6, capsules: 3, walls: [4, 7], par: [10, 14], target: 37, maxOptimal: 2, ...T3 },
    // Chapter 2: booster pads.
    { id: 'sp-booster', width: 5, height: 5, capsules: 1, walls: [2, 4], pads: [1, 2], par: [3, 6], target: 8, tries: 2000 },
    { id: 'sp-booster-two', beatNaive: true, width: 5, height: 5, capsules: 2, walls: [2, 4], pads: [1, 1], par: [4, 6], target: 12 },
    { id: 'sp-split', beatNaive: true, width: 5, height: 5, capsules: 2, walls: [2, 4], pads: [2, 3], par: [5, 7], target: 16 },
    { id: 'sp-backward', beatNaive: true, width: 6, height: 6, capsules: 2, walls: [3, 5], pads: [2, 3], par: [6, 8], target: 20, maxOptimal: 6 },
    { id: 'sp-oxygen-2', beatNaive: true, width: 5, height: 5, capsules: 2, walls: [2, 4], pads: [2, 3], par: [5, 7], target: 17, slack: 3 },
    { id: 'sp-booster-maze', beatNaive: true, width: 6, height: 6, capsules: 2, walls: [3, 6], pads: [3, 4], par: [7, 10], target: 23, maxOptimal: 6 },
    { id: 'sp-relay', beatNaive: true, width: 6, height: 6, capsules: 2, walls: [3, 6], pads: [3, 4], par: [8, 11], target: 26, maxOptimal: 4 },
    { id: 'sp-booster-three', beatNaive: true, width: 5, height: 5, capsules: 3, walls: [2, 4], pads: [1, 2], par: [6, 10], target: 28, ...T3 },
    { id: 'sp-lab', beatNaive: true, width: 6, height: 6, capsules: 3, walls: [3, 6], pads: [2, 3], par: [8, 12], target: 32, ...T3 },
    { id: 'sp-boss-2', beatNaive: true, width: 6, height: 6, capsules: 3, walls: [3, 6], pads: [2, 4], par: [10, 14], target: 39, maxOptimal: 2, ...T3 },
    // Chapter 3: wormholes, then everything together.
    { id: 'sp-wormhole', width: 5, height: 5, capsules: 1, walls: [2, 4], holes: 1, par: [3, 4], target: 7 },
    { id: 'sp-through', beatNaive: true, width: 5, height: 5, capsules: 2, walls: [2, 4], holes: 1, par: [4, 6], target: 12 },
    { id: 'sp-shortcut', beatNaive: true, width: 6, height: 6, capsules: 2, walls: [3, 5], holes: 1, par: [5, 8], target: 17 },
    { id: 'sp-two-wormholes', beatNaive: true, width: 6, height: 6, capsules: 2, walls: [3, 5], holes: 2, par: [6, 8], target: 20, maxOptimal: 6 },
    { id: 'sp-oxygen-3', beatNaive: true, width: 5, height: 5, capsules: 2, walls: [2, 4], holes: 1, par: [5, 7], target: 18, slack: 3 },
    { id: 'sp-warp-boost', beatNaive: true, width: 6, height: 6, capsules: 2, walls: [3, 5], holes: 1, pads: [1, 2], par: [7, 10], target: 24, maxOptimal: 6 },
    { id: 'sp-warp-maze', beatNaive: true, width: 6, height: 6, capsules: 2, walls: [3, 6], holes: 2, par: [8, 11], target: 27, maxOptimal: 4 },
    { id: 'sp-warp-three', beatNaive: true, width: 5, height: 5, capsules: 3, walls: [2, 4], holes: 1, par: [7, 11], target: 30, ...T3 },
    { id: 'sp-galaxy', beatNaive: true, width: 6, height: 6, capsules: 3, walls: [3, 6], holes: 1, pads: [1, 2], par: [9, 13], target: 35, ...T3 },
    { id: 'sp-final-boss', beatNaive: true, width: 6, height: 6, capsules: 3, walls: [3, 6], holes: 1, pads: [1, 3], par: [11, 16], target: 44, maxOptimal: 4, ...T3 },
  ] as S[]
).map((s) => ({ title: s.id, tip: '', ...s }));
