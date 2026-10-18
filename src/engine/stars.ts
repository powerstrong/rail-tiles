export type Stars = 1 | 2 | 3;

/** Extra rails over par that still earn two stars. */
export const TWO_STAR_SLACK = 2;

/**
 * Stars for a clear: ★★★ at or under par, ★★ within a couple of rails of it, ★ otherwise.
 * Using a hint caps the result at ★★.
 */
export function starsFor(railsUsed: number, par: number, hinted: boolean): Stars {
  const stars: Stars = railsUsed <= par ? 3 : railsUsed <= par + TWO_STAR_SLACK ? 2 : 1;
  return hinted ? (Math.min(stars, 2) as Stars) : stars;
}
