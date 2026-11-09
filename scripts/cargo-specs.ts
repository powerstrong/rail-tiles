/**
 * Specs the gift freight yard stages were searched from:
 * `npx vite-node scripts/cargo-search.ts scripts/cargo-specs.ts [id ...]`.
 * Past the first lessons every stage needs the line (`lineMatters`: if any tied-up wagon could
 * leave, it would be quicker) and beats simple players (`beatNaive`); chapter 2 also needs the
 * board. Targets are audit scores (src/cargo/audit.ts); the picked ones are in src/cargo/stages.ts.
 */
import type { CargoSpec } from '../src/cargo/generate';

type S = Omit<CargoSpec, 'title' | 'tip'>;
const hard = { lineMatters: true, beatNaive: true };

export const specs: CargoSpec[] = (
  [
    // Chapter 1: only the front wagon leaves.
    { id: 'cg-first-gift', sizes: [3, 3, 3], trains: 2, kinds: 2, empties: 1, par: [2, 3], target: 5, maxTraps: 0.2 },
    { id: 'cg-big-lift', sizes: [3, 3, 3], trains: 2, kinds: 2, empties: 1, par: [3, 4], target: 8, maxTraps: 0.3 },
    { id: 'cg-ribbon', sizes: [3, 3, 3, 3], trains: 3, kinds: 3, empties: 1, par: [3, 6], target: 10, waits: 1, lineMatters: true, maxTraps: 0.4 },
    { id: 'cg-one-two', sizes: [3, 3, 3, 3], trains: 3, kinds: 3, empties: 1, par: [4, 7], target: 12, chainSeen: 2, ...hard, maxTraps: 0.45 },
    { id: 'cg-party-1', sizes: [3, 3, 3, 3], trains: 3, kinds: 3, empties: 1, par: [4, 8], target: 13, chain: 2, beatNaive: true },
    { id: 'cg-back-first', sizes: [3, 3, 3, 3, 3], trains: 3, kinds: 3, empties: 1, par: [5, 8], target: 15, ...hard, maxOptimal: 12 },
    { id: 'cg-four-gifts', sizes: [3, 3, 3, 3, 3], trains: 4, kinds: 4, empties: 1, par: [6, 9], target: 18, ...hard, maxOptimal: 12 },
    { id: 'cg-waiting-line', sizes: [3, 3, 3, 3, 3], trains: 4, kinds: 3, empties: 1, par: [6, 10], target: 21, ...hard, waits: 1, maxOptimal: 8 },
    { id: 'cg-tight-yard', sizes: [3, 3, 3, 3, 3], trains: 4, kinds: 4, empties: 1, par: [7, 11], target: 24, ...hard, maxOptimal: 6 },
    { id: 'cg-boss-1', sizes: [3, 3, 3, 3, 3], trains: 4, kinds: 4, empties: 1, par: [10, 14], target: 30, ...hard, waits: 1, maxOptimal: 4, tries: 3000 },
    // Chapter 2: the departure board.
    { id: 'cg-board', sizes: [3, 3, 3, 3], trains: 3, kinds: 3, empties: 1, board: true, par: [3, 7], target: 11, boardMatters: true, maxTraps: 0.6, tries: 3000 },
    { id: 'cg-fish-first', sizes: [3, 3, 3, 3], trains: 3, kinds: 3, empties: 1, board: true, par: [5, 8], target: 14, ...hard, boardMatters: true, maxTraps: 0.6, tries: 2000 },
    { id: 'cg-twice', sizes: [3, 3, 3, 3, 3], trains: 4, kinds: 3, empties: 1, board: true, par: [6, 9], target: 16, ...hard, boardMatters: true, maxOptimal: 12 },
    { id: 'cg-wrong-front', sizes: [3, 3, 3, 3, 3], trains: 4, kinds: 3, empties: 1, board: true, par: [6, 10], target: 19, ...hard, boardMatters: true, maxOptimal: 10 },
    { id: 'cg-party-2', sizes: [3, 3, 3, 3, 3], trains: 4, kinds: 3, empties: 1, board: true, par: [6, 10], target: 18, chain: 2, beatNaive: true },
    { id: 'cg-timetable', sizes: [3, 3, 3, 3, 3], trains: 4, kinds: 4, empties: 1, board: true, par: [7, 11], target: 22, ...hard, boardMatters: true, maxOptimal: 8 },
    { id: 'cg-ready-wait', sizes: [3, 3, 3, 3, 3], trains: 4, kinds: 3, empties: 1, board: true, par: [8, 12], target: 25, ...hard, boardMatters: true, waits: 1, maxOptimal: 6 },
    { id: 'cg-rush-hour', sizes: [3, 3, 3, 3, 3], trains: 5, kinds: 4, empties: 1, board: true, par: [8, 12], target: 28, ...hard, boardMatters: true, maxOptimal: 6, tries: 3000, allowTied: true },
    { id: 'cg-five-trains', sizes: [3, 3, 3, 3, 3, 3], trains: 5, kinds: 4, empties: 1, board: true, par: [9, 13], target: 31, ...hard, boardMatters: true, maxOptimal: 4, maxStates: 40000 },
    { id: 'cg-boss-2', sizes: [3, 3, 3, 3, 3, 3], trains: 5, kinds: 4, empties: 1, board: true, par: [11, 16], target: 36, ...hard, boardMatters: true, waits: 1, maxOptimal: 3, tries: 1500, maxStates: 40000 },
    // Chapter 3: big and small wagons (with the board).
    { id: 'cg-small-wagon', sizes: [3, 3, 2, 2], trains: 3, kinds: 2, empties: 1, par: [3, 7], target: 14, lineMatters: true, tries: 3000 },
    { id: 'cg-big-wagon', sizes: [4, 3, 3, 2], trains: 3, kinds: 3, empties: 1, par: [5, 8], target: 16, ...hard, tries: 1500 },
    { id: 'cg-sizes-board', sizes: [4, 3, 3, 2], trains: 3, kinds: 3, empties: 1, board: true, par: [5, 9], target: 19, ...hard, tries: 1500 },
    { id: 'cg-swap-sizes', sizes: [4, 4, 2, 2], trains: 3, kinds: 3, empties: 1, board: true, par: [6, 10], target: 22, ...hard, tries: 1500 },
    { id: 'cg-party-3', sizes: [3, 3, 3, 2, 2], trains: 4, kinds: 3, empties: 1, par: [6, 11], target: 22, chain: 3, beatNaive: true, tries: 2000 },
    { id: 'cg-mixed-line', sizes: [4, 3, 3, 2, 2], trains: 4, kinds: 3, empties: 1, par: [7, 11], target: 25, ...hard, tries: 1500 },
    { id: 'cg-big-small-board', sizes: [4, 3, 3, 2, 2], trains: 4, kinds: 3, empties: 1, board: true, par: [8, 12], target: 28, ...hard, tries: 2000 },
    { id: 'cg-heavy', sizes: [4, 4, 3, 3, 2], trains: 4, kinds: 3, empties: 1, board: true, par: [8, 13], target: 31, ...hard, maxOptimal: 6, tries: 2000 },
    { id: 'cg-gift-mountain', sizes: [4, 3, 3, 2, 2], trains: 5, kinds: 4, empties: 1, board: true, par: [9, 14], target: 34, ...hard, maxOptimal: 6, tries: 4000 },
    { id: 'cg-final-boss', sizes: [4, 4, 3, 3, 2], trains: 5, kinds: 4, empties: 1, board: true, par: [11, 18], target: 40, ...hard, waits: 1, maxOptimal: 4, tries: 5000 },
  ] as S[]
).map((s) => ({ title: '', tip: '', ...s }));
