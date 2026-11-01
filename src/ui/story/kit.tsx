import { type ReactNode, useEffect, useRef, useState } from 'react';
import type { Segment } from '../../engine/geometry';
import { C } from '../art/palette';
import { SegmentArt } from '../art/TrackArt';
import { CHIMNEY, TrainArt } from '../art/TrainArt';
import { makePuff, useLook } from '../look';
import { type Sfx, play } from '../sound';

/** Every scene is drawn in this box (SVG units). Rails are 100 units per cell, like the boards. */
export const SCENE_W = 560;
export const SCENE_H = 300;
/** How long the train takes to pull in. */
export const ARRIVE_MS = 2300;
/** The main line along the bottom of most scenes. */
export const TRACK_Y = 258;

export type Pt = readonly [number, number];

/** What the story screen tells a world's scene. */
export interface SceneProps {
  /** The line the friend is saying; it only moves on once the train has arrived. */
  beat: number;
  arrived: boolean;
  /** The player tapped the scene before the train got in: finish the ride at once. */
  hurry: boolean;
  /** Call when the train has pulled in. */
  onArrive: () => void;
}

export const prefersReduced = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** A straight run of track between two scene points. */
export function Rail({ a, b, tint }: { a: Pt; b: Pt; tint?: string }) {
  const seg: Segment = {
    type: 'line',
    a: { x: a[0] / 100, y: a[1] / 100 },
    b: { x: b[0] / 100, y: b[1] / 100 },
    length: Math.hypot(b[0] - a[0], b[1] - a[1]) / 100,
  };
  return <SegmentArt seg={seg} tint={tint} />;
}

/** A station platform whose long edge sits on the main line. */
export function Platform({ x, w, y = TRACK_Y - 60, fill = C.platform, edge = C.platformEdge }: { x: number; w: number; y?: number; fill?: string; edge?: string }) {
  return (
    <g>
      <rect x={x} y={y + 6} width={w} height={30} rx={8} fill={edge} />
      <rect x={x} y={y} width={w} height={30} rx={8} fill={fill} />
      <rect x={x + 10} y={y + 9} width={w - 20} height={4} rx={2} fill={C.stopTint} />
    </g>
  );
}

const easeOut = (k: number) => 1 - (1 - k) ** 3;
const easeInOut = (k: number) => (k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2);

/**
 * The player's train (their look and smoke) running along `path`. It sits at point 0 and rides
 * to point `at`, and on to a later point whenever `at` grows: the first leg brakes into a station,
 * later ones start and stop gently. `onReach` hears the index of each point it gets to.
 */
export function RideTrain({
  path,
  at,
  start = 0,
  ms = [ARRIVE_MS],
  hurry = false,
  scale = 1,
  onReach,
}: {
  path: readonly Pt[];
  at: number;
  /** The point it is already standing at when the scene opens (a farewell starts at the station). */
  start?: number;
  /** Time for each leg: the ride to point 1, to point 2, … */
  ms?: readonly number[];
  hurry?: boolean;
  scale?: number;
  onReach?: (index: number) => void;
}) {
  const { smoke } = useLook();
  const ref = useRef<SVGGElement>(null);
  const smokeRef = useRef<SVGGElement>(null);
  const pos = useRef(start);
  const reach = useRef(onReach);
  reach.current = onReach;

  const place = (p: number) => {
    const i = Math.max(0, Math.min(path.length - 2, Math.floor(p)));
    const f = p - i;
    const [ax, ay] = path[i];
    const [bx, by] = path[i + 1];
    const x = ax + (bx - ax) * f;
    const y = ay + (by - ay) * f;
    const angle = Math.atan2(by - ay, bx - ax);
    ref.current?.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${((angle * 180) / Math.PI).toFixed(1)}) scale(${scale})`);
    return { x, y, angle };
  };
  const [first] = useState(() => {
    const i = Math.min(start, path.length - 2);
    const [ax, ay] = path[start];
    const [bx, by] = path[i + 1];
    return `translate(${ax} ${ay}) rotate(${(Math.atan2(by - ay, bx - ax) * 180) / Math.PI}) scale(${scale})`;
  });

  useEffect(() => {
    const from = pos.current;
    const to = at;
    if (from === to) return;
    if (hurry || prefersReduced()) {
      pos.current = to;
      place(to);
      reach.current?.(to);
      return;
    }
    const ease = from === 0 ? easeOut : easeInOut;
    const dur = ms[Math.ceil(to) - 1] ?? ARRIVE_MS;
    const t0 = performance.now();
    let frame = 0;
    let next = 0;
    let puffs = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / dur);
      const p = from + (to - from) * ease(k);
      pos.current = p;
      const { x, y, angle } = place(p);
      if (k < 1 && now >= next && smokeRef.current) {
        next = now + 230;
        const cx = x + Math.cos(angle) * CHIMNEY.x * scale;
        const cy = y + Math.sin(angle) * CHIMNEY.x * scale;
        smokeRef.current.appendChild(makePuff(smoke, cx, cy, puffs++));
        if (puffs % 2) play('chuff');
      }
      if (k < 1) {
        frame = requestAnimationFrame(tick);
        return;
      }
      pos.current = to;
      reach.current?.(to);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // `path` and `ms` are fixed per scene.
  }, [at, hurry]);

  return (
    <g>
      <g ref={smokeRef} />
      <g ref={ref} transform={first}>
        <TrainArt />
      </g>
    </g>
  );
}

/**
 * A little timeline for one beat of a scene: how many of `times` (ms after the beat starts) have
 * passed. Starts again from 0 whenever `key` changes; -1 holds it at 0.
 */
export function useSteps(key: number, times: readonly number[]): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    if (key < 0) return;
    const ts = times.map((ms, i) => window.setTimeout(() => setN(i + 1), ms));
    return () => ts.forEach(clearTimeout);
    // A beat's times never change.
  }, [key]);
  return n;
}

/** Sounds for a beat, at their times (ms after the beat starts). */
export function useCues(key: number, cues: readonly (readonly [number, Sfx])[] | undefined) {
  useEffect(() => {
    if (key < 0 || !cues) return;
    const ts = cues.map(([ms, sfx]) => window.setTimeout(() => play(sfx), ms));
    return () => ts.forEach(clearTimeout);
  }, [key]);
}

/** Pops in at (x, y) and keeps gently bobbing: the friend of the scene. */
export function Pop({ x, y, s = 1, delay = 0, bob = true, children }: { x: number; y: number; s?: number; delay?: number; bob?: boolean; children: ReactNode }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className="story-friend" style={{ animationDelay: `${delay}ms` }}>
        <g className={bob ? 'story-bob' : undefined}>{children}</g>
      </g>
    </g>
  );
}

/** A round thought mark ("?", "!", "♥") popping above someone. */
export function Mark({ x, y, text, color, delay = 0 }: { x: number; y: number; text: string; color: string; delay?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className="ss-mark" style={{ animationDelay: `${delay}ms` }}>
        <path d="M-4 13 L0 22 L5 12 Z" fill="#fff" />
        <circle r={15} fill="#fff" stroke={color} strokeWidth={3} />
        <text y={6.5} textAnchor="middle" fontSize={19} fontWeight={900} fill={color}>
          {text}
        </text>
      </g>
    </g>
  );
}

/** A name tag pointing out a thing in the scene. */
export function Tag({ x, y, text, color, delay = 0 }: { x: number; y: number; text: string; color: string; delay?: number }) {
  const w = text.length * 15 + 20;
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className="ss-mark" style={{ animationDelay: `${delay}ms` }}>
        <rect x={-w / 2} y={-14} width={w} height={28} rx={14} fill={color} />
        <text y={5.5} textAnchor="middle" fontSize={15} fontWeight={900} fill="#fff">
          {text}
        </text>
      </g>
    </g>
  );
}

/** Little stars bursting out at (x, y): something went right. */
export function Sparkle({ x, y, color = '#FFD34E', delay = 0 }: { x: number; y: number; color?: string; delay?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <g key={a} transform={`rotate(${a})`}>
          <path className="ss-spark" style={{ animationDelay: `${delay}ms` }} d="M0 -6 L2 -2 L6 0 L2 2 L0 6 L-2 2 L-6 0 L-2 -2 Z" fill={color} />
        </g>
      ))}
    </g>
  );
}

type Hat = 'conductor' | 'helmet' | 'straw';

/** A person of the railway (or the island), front on, feet near y = 44. */
export function PersonArt({ shirt, hat, hatColor, cheer }: { shirt: string; hat: Hat; hatColor: string; cheer: boolean }) {
  return (
    <g>
      <ellipse cy={44} rx={26} ry={7} fill="rgba(0,0,0,0.16)" />
      <path d="M-26 44 Q-26 4 0 4 Q26 4 26 44 Z" fill={shirt} />
      <path d="M-8 4 L0 15 L8 4 Z" fill="#FFF6E2" />
      <circle cx={-13} cy={24} r={2.6} fill="#F4C24F" />
      {cheer ? (
        <g className="ss-wave">
          <path d="M22 16 Q36 4 34 -12" stroke={shirt} strokeWidth={10} fill="none" strokeLinecap="round" />
          <circle cx={34} cy={-14} r={6} fill="#F7D2B4" />
        </g>
      ) : (
        <g>
          <path d="M21 14 Q29 26 27 38" stroke={shirt} strokeWidth={10} fill="none" strokeLinecap="round" />
          <circle cx={27} cy={40} r={5.5} fill="#F7D2B4" />
        </g>
      )}
      <circle cy={-16} r={21} fill="#F7D2B4" />
      <path d="M-20 -14 Q-20 -30 -6 -32 L-2 -24 Q-12 -22 -20 -14 Z M20 -14 Q20 -30 6 -32 L2 -24 Q12 -22 20 -14 Z" fill="#5A3E33" />
      <circle cx={-7} cy={-15} r={3.2} fill="#3A3846" />
      <circle cx={7} cy={-15} r={3.2} fill="#3A3846" />
      <circle cx={-6} cy={-16.3} r={1.1} fill="#fff" />
      <circle cx={8} cy={-16.3} r={1.1} fill="#fff" />
      <path d={cheer ? 'M-7 -5 Q0 4 7 -5' : 'M-6 -5 Q0 0 6 -5'} stroke="#3A3846" strokeWidth={2.6} fill={cheer ? '#E8706A' : 'none'} strokeLinecap="round" />
      <circle cx={-14} cy={-7} r={3.4} fill="#F59AA8" opacity={0.6} />
      <circle cx={14} cy={-7} r={3.4} fill="#F59AA8" opacity={0.6} />
      {hat === 'conductor' && (
        <g>
          <path d="M-20 -30 Q-22 -46 0 -47 Q22 -46 20 -30 Z" fill={hatColor} />
          <rect x={-24} y={-32} width={48} height={7} rx={3.5} fill="#2E2C38" />
          <circle cy={-39} r={4} fill="#F4C24F" />
        </g>
      )}
      {hat === 'helmet' && (
        <g>
          <path d="M-22 -26 Q-22 -50 0 -50 Q22 -50 22 -26 Z" fill={hatColor} />
          <path d="M-4 -49 H4 V-27 H-4 Z" fill="#fff" opacity={0.35} />
          <rect x={-27} y={-29} width={54} height={6} rx={3} fill={hatColor} stroke="rgba(0,0,0,0.15)" strokeWidth={1.5} />
        </g>
      )}
      {hat === 'straw' && (
        <g>
          <ellipse cy={-30} rx={34} ry={8} fill={hatColor} stroke="#C9A55A" strokeWidth={2} />
          <path d="M-17 -31 Q-17 -50 0 -50 Q17 -50 17 -31 Z" fill={hatColor} stroke="#C9A55A" strokeWidth={2} />
          <rect x={-17} y={-37} width={34} height={6} fill="#E5584F" />
        </g>
      )}
    </g>
  );
}

/** A passenger waiting for the train, front on, feet near y = 30. */
export function Rider({ shirt, hair = '#3A3846' }: { shirt: string; hair?: string }) {
  return (
    <g>
      <ellipse cy={30} rx={16} ry={5} fill="rgba(0,0,0,0.15)" />
      <path d="M-15 30 Q-15 2 0 2 Q15 2 15 30 Z" fill={shirt} />
      <path d="M-4 2 L0 9 L4 2" fill="#FFF6E2" />
      <circle cy={-11} r={13} fill="#F7D2B4" />
      <path d="M-13 -12 Q-12 -26 0 -26 Q12 -26 13 -12 Q6 -19 -13 -12 Z" fill={hair} />
      <circle cx={-4.5} cy={-9} r={2} fill="#3A3846" />
      <circle cx={4.5} cy={-9} r={2} fill="#3A3846" />
    </g>
  );
}

/** For a farewell, where the train is already standing at the station: tell the story so at once. */
export function useAlreadyHere(onArrive: () => void) {
  useEffect(() => onArrive(), []);
}

/**
 * A present flying from the friend's hands (`from`) in a high arc and landing on the train
 * (`to`), where it gives a little sparkle. Drawn at `from`; the arc is a CSS animation.
 */
export function Gift({ from, to, delay = 0, children }: { from: Pt; to: Pt; delay?: number; children: ReactNode }) {
  const style = {
    animationDelay: `${delay}ms`,
    ['--dx' as string]: `${to[0] - from[0]}px`,
    ['--dy' as string]: `${to[1] - from[1]}px`,
  };
  return (
    <g transform={`translate(${from[0]} ${from[1]})`}>
      <g className="ss-gift" style={style}>
        {children}
      </g>
    </g>
  );
}

const CONFETTI = ['#E5584F', '#F4C24F', '#3F8BD9', '#4CAF6A', '#EC6A8E', '#8E6BD1'];

/** Confetti drifting down over the whole scene. */
export function Confetti({ count = 22 }: { count?: number }) {
  return (
    <g>
      {Array.from({ length: count }, (_, i) => (
        <rect
          key={i}
          x={(i * 149 + 23) % SCENE_W}
          y={-12}
          width={7}
          height={11}
          rx={2}
          fill={CONFETTI[i % CONFETTI.length]}
          className="ss-confetti"
          style={{ animationDelay: `${(i * 173) % 1600}ms`, animationDuration: `${2200 + ((i * 331) % 1400)}ms` }}
        />
      ))}
    </g>
  );
}

/** "안녕!" called out by someone waving the train off. */
export function Bye({ x, y, color, delay = 0, text = '안녕!' }: { x: number; y: number; color: string; delay?: number; text?: string }) {
  return <Tag x={x} y={y} text={text} color={color} delay={delay} />;
}

/** Counts up every `ms` while `on`: for things that keep a beat (party lights, a ticking tower). */
export function useTicker(on: boolean, ms: number) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!on) return;
    const t = window.setInterval(() => setN((k) => k + 1), ms);
    return () => clearInterval(t);
  }, [on, ms]);
  return n;
}
