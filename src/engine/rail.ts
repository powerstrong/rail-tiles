import { type Dir, E, N, S, W, opposite } from './dir';

export type RailKind = 'straight' | 'curve' | 'cross';

export const RAIL_KINDS: readonly RailKind[] = ['straight', 'curve', 'cross'];

/**
 * A rail piece and the edges ("ports") it connects.
 * - straight, rot 0: N–S   rot 1: E–W   (rot is taken mod 2)
 * - curve,    rot r: connects edge r and edge r+1 (0: N–E, 1: E–S, 2: S–W, 3: W–N)
 * - cross:    N–S and E–W at once; a train always goes straight through, so a
 *             route may pass the same crossing twice, once on each axis
 */
export interface Rail {
  kind: RailKind;
  rot: number;
}

export function rotationCount(kind: RailKind): number {
  return kind === 'straight' ? 2 : kind === 'curve' ? 4 : 1;
}

export function normalizeRot(kind: RailKind, rot: number): number {
  const n = rotationCount(kind);
  return ((rot % n) + n) % n;
}

export function railPorts(rail: Rail): readonly Dir[] {
  const rot = normalizeRot(rail.kind, rail.rot);
  if (rail.kind === 'cross') return [N, E, S, W];
  if (rail.kind === 'straight') return rot === 0 ? [N, S] : [E, W];
  return [rot as Dir, ((rot + 1) % 4) as Dir];
}

export function hasPort(rail: Rail, edge: Dir): boolean {
  return railPorts(rail).includes(edge);
}

/** Given the edge a train enters through, the edge it leaves through (or null if the piece has no such port). */
export function railExit(rail: Rail, entryEdge: Dir): Dir | null {
  if (rail.kind === 'cross') return opposite(entryEdge);
  const [a, b] = railPorts(rail);
  if (a === entryEdge) return b;
  if (b === entryEdge) return a;
  return null;
}

/** Map-file glyphs for rails. Box-drawing characters read like the track they describe. */
export const RAIL_GLYPHS: Record<string, Rail> = {
  '│': { kind: 'straight', rot: 0 },
  '─': { kind: 'straight', rot: 1 },
  '└': { kind: 'curve', rot: 0 },
  '┌': { kind: 'curve', rot: 1 },
  '┐': { kind: 'curve', rot: 2 },
  '┘': { kind: 'curve', rot: 3 },
  '┼': { kind: 'cross', rot: 0 },
};
