import { type Dir, DX, DY, opposite } from '../engine/dir';
import type { PenguinStage, Push } from './model';

/** Everything that can change during play. */
export interface IceState {
  /** Cell of each penguin. */
  pos: number[];
  /** Bitmask of fish picked up. */
  fish: number;
  /** Bitmask of cracked tiles that have broken into water. */
  broken: number;
}

/** One beat of a slide, for the animation. */
export type SlideBeat =
  | { kind: 'move'; cell: number; dir: Dir }
  | { kind: 'turn'; cell: number; dir: Dir }
  | { kind: 'igloo'; from: number; to: number; out: number; dir: Dir }
  | { kind: 'fish'; cell: number; index: number }
  | { kind: 'crack'; cell: number; index: number }
  | { kind: 'snow'; cell: number }
  | { kind: 'fall'; cell: number };

export type SlideOutcome = 'moved' | 'blocked' | 'fell' | 'spin';

export interface Slide {
  outcome: SlideOutcome;
  /** The state after the push (unchanged unless outcome is 'moved'). */
  state: IceState;
  beats: SlideBeat[];
}

export function initialState(stage: PenguinStage): IceState {
  return { pos: [...stage.penguins], fish: 0, broken: 0 };
}

export function stateKey(s: IceState): string {
  return `${s.pos.join(',')}|${s.fish}|${s.broken}`;
}

export function isWon(stage: PenguinStage, s: IceState): boolean {
  return s.fish === (1 << stage.fish.length) - 1 && s.pos.every((p, k) => p === stage.homes[k]);
}

const step = (stage: PenguinStage, cell: number, dir: Dir): number | null => {
  const x = (cell % stage.width) + DX[dir];
  const y = Math.floor(cell / stage.width) + DY[dir];
  return x < 0 || y < 0 || x >= stage.width || y >= stage.height ? null : y * stage.width + x;
};

/**
 * Pushes one penguin. The single source of truth for the rules: the UI animates its beats,
 * the solver explores its states.
 */
export function slide(stage: PenguinStage, state: IceState, push: Push): Slide {
  const others = new Set(state.pos.filter((_, k) => k !== push.penguin));
  let cell = state.pos[push.penguin];
  let dir = push.dir;
  let fish = state.fish;
  let broken = state.broken;
  const beats: SlideBeat[] = [];
  const seen = new Set<string>();
  const blocked = (to: number | null) => {
    if (to === null || others.has(to)) return true;
    const t = stage.tiles[to];
    return t.t === 'rock';
  };
  /** A cracked tile gives way behind a penguin leaving it. */
  const leave = (from: number) => {
    const t = stage.tiles[from];
    if (t.t === 'crack' && !(broken & (1 << t.index))) {
      broken |= 1 << t.index;
      beats.push({ kind: 'crack', cell: from, index: t.index });
    }
  };

  for (;;) {
    const loopKey = `${cell},${dir}`;
    if (seen.has(loopKey)) return { outcome: 'spin', state, beats };
    seen.add(loopKey);

    let next = step(stage, cell, dir);
    if (blocked(next)) break;
    let tile = stage.tiles[next!];
    if (tile.t === 'igloo') {
      // In through the door, out of the twin igloo's door; any other side is a wall.
      if (dir !== opposite(tile.door)) break;
      const twin = stage.tiles[tile.pair];
      if (twin.t !== 'igloo') break;
      const out = step(stage, tile.pair, twin.door);
      if (blocked(out) || stage.tiles[out!].t === 'igloo') break;
      leave(cell);
      beats.push({ kind: 'igloo', from: next!, to: tile.pair, out: out!, dir: twin.door });
      dir = twin.door;
      next = out;
      tile = stage.tiles[next!];
    } else {
      leave(cell);
      beats.push({ kind: 'move', cell: next!, dir });
    }
    cell = next!;

    if (tile.t === 'water' || (tile.t === 'crack' && broken & (1 << tile.index))) {
      beats.push({ kind: 'fall', cell });
      return { outcome: 'fell', state, beats };
    }
    const f = stage.fish.indexOf(cell);
    if (f >= 0 && !(fish & (1 << f))) {
      fish |= 1 << f;
      beats.push({ kind: 'fish', cell, index: f });
    }
    if (tile.t === 'snow') {
      beats.push({ kind: 'snow', cell });
      break;
    }
    if (tile.t === 'current' && tile.dir !== dir) {
      dir = tile.dir;
      beats.push({ kind: 'turn', cell, dir });
    }
  }

  if (cell === state.pos[push.penguin] && fish === state.fish && broken === state.broken) return { outcome: 'blocked', state, beats: [] };
  const pos = [...state.pos];
  pos[push.penguin] = cell;
  return { outcome: 'moved', state: { pos, fish, broken }, beats };
}
