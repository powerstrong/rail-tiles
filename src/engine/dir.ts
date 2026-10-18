/** Grid directions, clockwise from north. Screen coordinates: x grows east, y grows south. */
export type Dir = 0 | 1 | 2 | 3;

export const N: Dir = 0;
export const E: Dir = 1;
export const S: Dir = 2;
export const W: Dir = 3;

export const DIR_NAMES = ['N', 'E', 'S', 'W'] as const;
export type DirName = (typeof DIR_NAMES)[number];

export const DX: readonly number[] = [0, 1, 0, -1];
export const DY: readonly number[] = [-1, 0, 1, 0];

export const ALL_DIRS: readonly Dir[] = [N, E, S, W];

export function opposite(d: Dir): Dir {
  return ((d + 2) % 4) as Dir;
}

export function rotateCW(d: Dir, quarterTurns = 1): Dir {
  return ((((d + quarterTurns) % 4) + 4) % 4) as Dir;
}

export function dirFromName(name: DirName): Dir {
  return DIR_NAMES.indexOf(name) as Dir;
}
