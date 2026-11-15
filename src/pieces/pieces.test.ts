import { describe, expect, it } from 'vitest';
import { starsFor } from '../engine/stars';
import { continueTarget } from '../continue';
import { emptyProgress, exportCode, readCode, recordClear } from '../storage';
import { worldById } from '../worlds';
import { isUnlocked } from '../ui/StageSelect';
import { greedyAudit } from './generate';
import { nextHint, reduceGame, startGame } from './game';
import { canPlace, candidates, isComplete, key, occupied, orientations, place, samePlacement, shape, solve, type Cell, type Layout } from './model';
import { PIECES_STAGES } from './stages';

function connected(cells: Cell[]) {
  const reached = new Set([key(cells[0])]);
  for (let changed = true; changed;) {
    changed = false;
    for (const [x, y] of cells) if (!reached.has(key([x, y])) && [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].some(c => reached.has(key(c as Cell)))) { reached.add(key([x, y])); changed = true; }
  }
  return reached.size === cells.length;
}
describe('pieces: fixed silhouettes and replay', () => {
  it('has thirty distinct connected silhouettes and 2–5 cell connected pieces', () => {
    expect(PIECES_STAGES).toHaveLength(30);
    expect(new Set(PIECES_STAGES.map(s => `${s.cols}:${s.target.map(key)}`)).size).toBe(30);
    for (const s of PIECES_STAGES) {
      expect(connected(s.target), s.id).toBe(true);
      expect(s.target.every(([x, y]) => x >= 0 && x < s.cols && y >= 0 && y < s.rows)).toBe(true);
      expect(s.pieces.reduce((n, p) => n + p.cells.length, 0)).toBe(s.target.length);
      for (const p of s.pieces) { expect(p.cells.length).toBeGreaterThanOrEqual(2); expect(p.cells.length).toBeLessThanOrEqual(5); expect(connected(p.cells)).toBe(true); }
    }
  });
  for (const s of PIECES_STAGES) it(`${s.label} ${s.title}: replay and exact cover agree`, () => {
    let layout: Layout = s.pieces.map(() => null);
    for (const [index, pose] of s.solution.entries()) {
      expect(canPlace(s, layout, index, pose)).toBe(true);
      layout = place(s, layout, index, pose)!;
      // Independent absolute-cell coverage, without calling the win predicate.
      const covered = layout.flatMap((p, i) => p ? occupied(s.pieces[i], p).map(key) : []);
      expect(new Set(covered).size).toBe(covered.length);
      expect(covered.every(c => s.target.some(t => key(t) === c))).toBe(true);
    }
    expect(isComplete(s, layout)).toBe(true);
    const result = solve(s);
    expect(result.exhausted).toBe(false);
    expect(isComplete(s, result.solution!)).toBe(true);
    expect(starsFor(s.pieces.length, s.par, false)).toBe(3);
    expect(starsFor(s.par + 2, s.par, false)).toBe(2);
    expect(starsFor(s.par + 3, s.par, false)).toBe(1);
  });
  it('teaches the first silhouette in two placements without rotation or reflection', () => {
    const s = PIECES_STAGES[0];
    expect(s.pieces.length).toBe(2);
    expect(s.solution.every(p => p.turn === 0 && !p.flip)).toBe(true);
  });
  it('adds negative space then actual chirality decisions at chapter boundaries', () => {
    expect(PIECES_STAGES[10].pieces.some(p => p.cells.length === 5)).toBe(true);
    expect(PIECES_STAGES.slice(0, 20).every(s => !s.allowFlip)).toBe(true);
    for (const s of [PIECES_STAGES[20], PIECES_STAGES[29]]) {
      expect(s.allowFlip).toBe(true);
      expect(solve({ ...s, allowFlip: false })).toMatchObject({ solution: null, exhausted: false });
    }
  });
  it('excludes random-placement cakewalks, with deterministic sampling and proven nonextendable first choices', () => {
    for (const s of PIECES_STAGES) {
      expect(greedyAudit(s, s.audit.samples), s.id).toBe(s.audit.greedyWins);
      if (s.number > 1) { expect(s.audit.greedyWins / s.audit.samples).toBeLessThanOrEqual(s.number <= 10 ? .35 : .15); expect(s.audit.deadStarts).toBeGreaterThan(0); }
    }
  });
});
describe('pieces: reversible editing and honest hints', () => {
  const s = PIECES_STAGES[10];
  it('rejects overlap, off-board, silhouette holes and early reflection without changing history', () => {
    let game = startGame(s);
    game = reduceGame(s, game, { type: 'place', index: 0, pose: s.solution[0] });
    for (const p of [{ ...s.solution[1], x: -2 }, { ...s.solution[1], x: 0, y: 0 }, { ...s.solution[1], flip: true }]) {
      if (!canPlace(s, game.history.at(-1)!, 1, p)) expect(reduceGame(s, game, { type: 'place', index: 1, pose: p })).toBe(game);
    }
    expect(canPlace(s, game.history.at(-1)!, 0, { ...s.solution[0], x: s.cols })).toBe(false);
    expect(canPlace(s, game.history.at(-1)!, 0, { ...s.solution[0], x: .5 })).toBe(false);
  });
  it('can always lift any placed piece; undo restores that exact layout and reset clears the hint cap', () => {
    let game = startGame(s);
    for (const [index, pose] of s.solution.entries()) game = reduceGame(s, game, { type: 'place', index, pose });
    const complete = game;
    for (let i = 0; i < s.pieces.length; i++) {
      const lifted = reduceGame(s, complete, { type: 'remove', index: i });
      expect(lifted.history.at(-1)![i]).toBeNull();
      expect(reduceGame(s, lifted, { type: 'undo' }).history).toEqual(complete.history);
    }
    game = reduceGame(s, game, { type: 'hint' });
    expect(starsFor(s.par, s.par, game.hinted)).toBe(2);
    expect(reduceGame(s, game, { type: 'undo' }).hinted).toBe(true);
    expect(reduceGame(s, game, { type: 'reset' })).toEqual(startGame(s));
  });
  it('hints extend existing placements or identify a removable piece, and repeated hints finish every board', () => {
    for (const stage of PIECES_STAGES) {
      const all = candidates(stage);
      let layout: Layout = stage.pieces.map(() => null);
      let dead = false;
      for (let i = 0; i < all.length && !dead; i++) for (const c of all[i]) {
        const trial = [...layout]; trial[i] = c.pose;
        const result = solve(stage, trial);
        if (!result.solution && !result.exhausted) { layout = trial; dead = true; break; }
      }
      let steps = 0;
      while (!isComplete(stage, layout) && steps++ < stage.pieces.length * 3) {
        const h = nextHint(stage, layout); expect(h).not.toBeNull();
        if (!h) break;
        if (h.remove) layout = layout.map((p, i) => i === h.index ? null : p);
        else { expect(canPlace(stage, layout, h.index, h.pose)).toBe(true); layout = place(stage, layout, h.index, h.pose)!; }
      }
      expect(isComplete(stage, layout), stage.id).toBe(true);
    }
  });
  it('rotating four times and reflecting twice preserves the cells; mirrored shapes stay distinct', () => {
    const p = { cells: [[0, 0], [0, 1], [0, 2], [1, 2]] as Cell[] };
    expect(shape(p, 4)).toEqual(shape(p));
    expect(orientations(p, false)).toHaveLength(4);
    expect(orientations(p, true)).toHaveLength(8);
    expect(samePlacement(p, { x: 2, y: 1, turn: 0, flip: false }, { x: 2, y: 1, turn: 0, flip: true })).toBe(false);
  });
  it('distinguishes an unknown search from a proof of no solution', () => {
    expect(solve(s, undefined, 0)).toMatchObject({ solution: null, exhausted: true });
  });
});
it('pieces integrates with sequential unlocks, continue, highest stars and save codes without dropping old ids', async () => {
  const w = worldById('pieces')!;
  expect(w.unlockAfter).toBeUndefined();
  const cards = w.stages;
  expect(isUnlocked(cards, new Set(), 0)).toBe(true);
  expect(isUnlocked(cards, new Set(), 1)).toBe(false);
  let progress = recordClear(emptyProgress(), 'last-run', 3);
  progress = recordClear(progress, cards[0].id, 2);
  expect(recordClear(progress, cards[0].id, 1)).toBe(progress);
  progress.last = { world: 'pieces', stage: cards[0].id };
  expect(continueTarget(progress)?.index).toBe(1);
  expect(isUnlocked(cards, new Set(Object.keys(progress.stars)), 1)).toBe(true);
  expect((await readCode(await exportCode(progress)))?.stars).toEqual({ 'last-run': 3, 'pieces-1': 2 });
});
