import { canPlace, place, samePlacement, solve, type Layout, type PiecesStage, type Pose } from './model';
export interface Game { history: Layout[]; hinted: boolean }
export type Action = { type: 'place'; index: number; pose: Pose } | { type: 'remove'; index: number } | { type: 'undo' } | { type: 'reset' } | { type: 'hint' };
export const startGame = (s: PiecesStage): Game => ({ history: [s.pieces.map(() => null)], hinted: false });
export function reduceGame(s: PiecesStage, game: Game, action: Action): Game {
  if (action.type === 'reset') return startGame(s);
  if (action.type === 'hint') return { ...game, hinted: true };
  if (action.type === 'undo') return game.history.length > 1 ? { ...game, history: game.history.slice(0, -1) } : game;
  const layout = game.history.at(-1)!;
  if (!s.pieces[action.index]) return game;
  let next: Layout | null;
  if (action.type === 'remove') { if (!layout[action.index]) return game; next = [...layout]; next[action.index] = null; }
  else { if (samePlacement(s.pieces[action.index], layout[action.index], action.pose)) return game; next = place(s, layout, action.index, action.pose); }
  return next ? { ...game, history: [...game.history, next] } : game;
}
export type Hint = { index: number; pose: Pose; remove: false } | { index: number; remove: true };
/** Preserve a child's placements when possible. Otherwise show one reversible removal, never wipe the board. */
export function nextHint(s: PiecesStage, layout: Layout): Hint | null {
  const result = solve(s, layout, 30_000);
  if (result.solution) {
    const index = layout.findIndex(p => !p);
    return index < 0 ? null : { index, pose: result.solution[index], remove: false };
  }
  const index = layout.findIndex((p, i) => p && !samePlacement(s.pieces[i], p, s.solution[i]));
  if (index >= 0) return { index, remove: true };
  const empty = layout.findIndex(p => !p);
  return empty >= 0 && canPlace(s, layout, empty, s.solution[empty]) ? { index: empty, pose: s.solution[empty], remove: false } : null;
}
