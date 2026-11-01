/**
 * Specs the clock tower stages were searched from: `npx vite-node scripts/clock-search.ts scripts/clock-specs.ts [id ...]`.
 * Every stage past the first lessons is `beatNaive`: walking straight at the goal must not earn ★★★.
 * Targets are audit scores (src/clock/audit.ts); the picked candidates are in src/clock/stages.ts.
 */
import type { ClockSpec } from '../src/clock/generate';

type S = Omit<ClockSpec, 'title' | 'tip'>;

export const specs: ClockSpec[] = (
  [
    // Chapter 1: tick-tock blocks and resting.
    { id: 'ck-first-steps', width: 5, height: 5, walls: [4, 6], par: [4, 5], target: 6 },
    { id: 'ck-tick-tock', width: 5, height: 5, walls: [2, 4], blocks: [2, 4], par: [4, 6], target: 8 },
    { id: 'ck-rest', width: 5, height: 5, walls: [2, 5], blocks: [2, 4], par: [4, 7], target: 11, mustRest: true },
    { id: 'ck-red-blue', beatNaive: true, width: 5, height: 5, walls: [3, 5], blocks: [4, 6], par: [6, 9], target: 14 },
    { id: 'ck-midnight-1', beatNaive: true, width: 5, height: 5, walls: [3, 5], blocks: [3, 5], par: [6, 9], target: 14, slack: 3 },
    { id: 'ck-block-maze', beatNaive: true, width: 6, height: 6, walls: [4, 7], blocks: [5, 8], par: [7, 11], target: 17 },
    { id: 'ck-zigzag', beatNaive: true, width: 6, height: 6, walls: [4, 7], blocks: [5, 8], par: [8, 12], target: 20, mustRest: true, maxOptimal: 6 },
    { id: 'ck-double-rest', beatNaive: true, width: 6, height: 6, walls: [4, 7], blocks: [6, 9], par: [9, 13], target: 23, mustRest: true, maxOptimal: 4 },
    { id: 'ck-stairs', beatNaive: true, width: 6, height: 6, walls: [4, 7], blocks: [7, 10], par: [10, 15], target: 26, maxOptimal: 4 },
    { id: 'ck-boss-1', beatNaive: true, width: 7, height: 7, walls: [6, 9], blocks: [9, 13], par: [12, 18], target: 31, maxOptimal: 3 },
    // Chapter 2: clock hands.
    { id: 'ck-clock-hand', width: 5, height: 5, walls: [2, 4], hands: [1], par: [4, 6], target: 8 },
    { id: 'ck-long-hand', width: 5, height: 5, walls: [2, 4], hands: [2], par: [4, 7], target: 11 },
    { id: 'ck-wait-hand', beatNaive: true, width: 5, height: 5, walls: [2, 4], hands: [2], par: [5, 8], target: 14, mustRest: true },
    { id: 'ck-two-hands', beatNaive: true, width: 6, height: 6, walls: [3, 5], hands: [2, 1], par: [6, 10], target: 17, maxOptimal: 6 },
    { id: 'ck-midnight-2', beatNaive: true, width: 5, height: 5, walls: [2, 4], hands: [2], par: [6, 9], target: 16, slack: 3 },
    { id: 'ck-hand-blocks', beatNaive: true, width: 6, height: 6, walls: [3, 5], blocks: [2, 4], hands: [2], par: [7, 11], target: 20, maxOptimal: 6 },
    { id: 'ck-gears', beatNaive: true, width: 6, height: 6, walls: [3, 5], hands: [2, 2], par: [8, 12], target: 23, maxOptimal: 4 },
    { id: 'ck-sweep', beatNaive: true, width: 6, height: 6, walls: [3, 5], blocks: [3, 5], hands: [2, 1], par: [9, 13], target: 26, maxOptimal: 4 },
    { id: 'ck-clockwork', beatNaive: true, width: 6, height: 6, walls: [3, 5], blocks: [3, 5], hands: [2, 2], par: [10, 15], target: 29, maxOptimal: 4 },
    { id: 'ck-boss-2', beatNaive: true, width: 7, height: 7, walls: [4, 7], blocks: [4, 6], hands: [3, 2], par: [12, 18], target: 34, maxOptimal: 3 },
    // Chapter 3: levers that turn the hands back, then everything together.
    { id: 'ck-lever', tries: 3000, width: 5, height: 5, walls: [2, 4], hands: [2], levers: 1, par: [4, 8], target: 14 },
    { id: 'ck-lever-back', beatNaive: true, tries: 3000, width: 5, height: 5, walls: [2, 4], hands: [2], levers: 1, par: [5, 9], target: 17 },
    { id: 'ck-two-levers', beatNaive: true, tries: 3000, width: 6, height: 6, walls: [3, 5], hands: [2], levers: 2, par: [7, 11], target: 20, maxOptimal: 6 },
    { id: 'ck-lever-rest', beatNaive: true, tries: 3000, width: 6, height: 6, walls: [3, 5], hands: [2], levers: 1, par: [7, 12], target: 23, mustRest: true, maxOptimal: 6 },
    { id: 'ck-midnight-3', beatNaive: true, tries: 3000, width: 6, height: 6, walls: [3, 5], hands: [2], levers: 1, par: [7, 11], target: 21, slack: 3 },
    { id: 'ck-lever-blocks', beatNaive: true, tries: 3000, width: 6, height: 6, walls: [3, 5], blocks: [2, 4], hands: [2], levers: 1, par: [8, 13], target: 25, maxOptimal: 4 },
    { id: 'ck-two-hands-lever', beatNaive: true, tries: 3000, width: 6, height: 6, walls: [3, 5], hands: [2, 2], levers: 1, par: [9, 14], target: 28, maxOptimal: 4 },
    { id: 'ck-lever-maze', beatNaive: true, tries: 3000, width: 6, height: 6, walls: [3, 5], blocks: [2, 4], hands: [2, 1], levers: 2, par: [10, 15], target: 31, maxOptimal: 4 },
    { id: 'ck-big-clock', beatNaive: true, tries: 3000, width: 7, height: 7, walls: [4, 7], blocks: [3, 5], hands: [3, 2], levers: 2, par: [12, 18], target: 34, maxOptimal: 3 },
    { id: 'ck-final-boss', beatNaive: true, width: 7, height: 7, walls: [4, 7], blocks: [3, 6], hands: [3, 2, 2], levers: 2, par: [14, 22], target: 40, maxOptimal: 3, tries: 1500 },
  ] as S[]
).map((s) => ({ title: s.id, tip: '', ...s }));
