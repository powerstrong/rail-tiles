import type { PenguinStage } from './model';
import type { SlideBeat } from './slide';

/** A point on a penguin's slide: board cell coordinates (cell units), scale, and when (seconds). */
export interface Key {
  x: number;
  y: number;
  s: number;
  at: number;
  /** Arrive here instantly (popping out of the twin igloo). */
  jump?: boolean;
}

export type BeatEvent =
  | { at: number; kind: 'fish'; index: number }
  | { at: number; kind: 'crack'; index: number }
  | { at: number; kind: 'igloo' }
  | { at: number; kind: 'turn' }
  | { at: number; kind: 'snow' }
  | { at: number; kind: 'fall' };

const CELL_T = 0.085;
const FIRST_T = 0.13;

const centre = (stage: PenguinStage, cell: number) => ({ x: (cell % stage.width) + 0.5, y: Math.floor(cell / stage.width) + 0.5 });

/** Turns a slide's beats into a keyframe path plus timed side effects. */
export function timeline(stage: PenguinStage, from: number, beats: SlideBeat[]): { keys: Key[]; events: BeatEvent[]; duration: number } {
  const keys: Key[] = [{ ...centre(stage, from), s: 1, at: 0 }];
  const events: BeatEvent[] = [];
  let t = 0;
  let first = true;
  const stepT = () => {
    const d = first ? FIRST_T : CELL_T;
    first = false;
    return d;
  };
  for (const b of beats) {
    switch (b.kind) {
      case 'move':
        t += stepT();
        keys.push({ ...centre(stage, b.cell), s: 1, at: t });
        break;
      case 'igloo':
        t += stepT();
        keys.push({ ...centre(stage, b.from), s: 0.2, at: t });
        events.push({ at: t, kind: 'igloo' });
        t += 0.14;
        keys.push({ ...centre(stage, b.to), s: 0.2, at: t, jump: true });
        t += CELL_T * 1.4;
        keys.push({ ...centre(stage, b.out), s: 1, at: t });
        break;
      case 'turn':
        events.push({ at: t, kind: 'turn' });
        break;
      case 'fish':
        events.push({ at: t, kind: 'fish', index: b.index });
        break;
      case 'crack':
        events.push({ at: t + CELL_T * 0.6, kind: 'crack', index: b.index });
        break;
      case 'snow':
        events.push({ at: t, kind: 'snow' });
        break;
      case 'fall':
        events.push({ at: t, kind: 'fall' });
        t += 0.35;
        keys.push({ ...centre(stage, b.cell), s: 0, at: t });
        break;
    }
  }
  return { keys, events, duration: t };
}

/** Position along the keyframes at time `t`. */
export function sample(keys: Key[], t: number): { x: number; y: number; s: number } {
  if (t <= 0) return keys[0];
  for (let i = 1; i < keys.length; i++) {
    const b = keys[i];
    if (t <= b.at) {
      if (b.jump) return keys[i - 1];
      const a = keys[i - 1];
      const u = b.at === a.at ? 1 : (t - a.at) / (b.at - a.at);
      return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, s: a.s + (b.s - a.s) * u };
    }
  }
  return keys[keys.length - 1];
}
