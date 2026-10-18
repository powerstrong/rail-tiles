import type { CSSProperties } from 'react';
import { cellHash } from './SceneryArt';
import { C } from './palette';

const CONFETTI_COLORS = [C.trainRed, C.amber, C.gold, C.teal, C.tunnelA, C.tunnelB, '#7FC487'];
const SHIRTS = [C.amber, C.trainRed, C.teal];

/** CSS custom properties for one animated particle (SVG user units = px in CSS transforms). */
const vars = (v: Record<string, string | number>) =>
  Object.fromEntries(Object.entries(v).map(([k, val]) => [`--${k}`, typeof val === 'number' ? `${val}px` : val])) as CSSProperties;

function Confetti({ seed }: { seed: number }) {
  const pieces = [];
  for (let i = 0; i < 40; i++) {
    const r = (k: number) => cellHash(i, k, seed);
    // Burst mostly upward, then drift down with a little spin.
    const angle = -Math.PI / 2 + (r(1) - 0.5) * Math.PI * 1.25;
    const speed = 90 + r(2) * 130;
    const mx = Math.cos(angle) * speed;
    const my = Math.sin(angle) * speed;
    const style = {
      ...vars({ mx, my, ex: mx * 1.4 + (r(3) - 0.5) * 60, ey: my + 160 + r(4) * 80 }),
      '--rot': `${(r(5) - 0.5) * 900}deg`,
      animationDelay: `${r(6) * 0.15}s`,
    } as CSSProperties;
    const color = CONFETTI_COLORS[Math.floor(r(7) * CONFETTI_COLORS.length)];
    pieces.push(
      i % 3 === 0 ? (
        <circle key={i} className="confetti-piece" r={6.5} fill={color} style={style} />
      ) : (
        <rect key={i} className="confetti-piece" x={-5} y={-8.5} width={10} height={17} rx={2.5} fill={color} style={style} />
      ),
    );
  }
  return <g>{pieces}</g>;
}

function Sparkles() {
  return (
    <g>
      {[0, 72, 144, 216, 288].map((deg, i) => {
        const a = ((deg - 90) * Math.PI) / 180;
        return (
          <g key={deg} transform={`translate(${Math.cos(a) * 58} ${Math.sin(a) * 58}) scale(1.5)`}>
            <path
              className="sparkle"
              style={{ animationDelay: `${0.1 + i * 0.06}s` }}
              d="M0 -10 L2.6 -2.6 L10 0 L2.6 2.6 L0 10 L-2.6 2.6 L-10 0 L-2.6 -2.6 Z"
              fill={C.gold}
            />
          </g>
        );
      })}
    </g>
  );
}

function Hearts({ seed }: { seed: number }) {
  return (
    <g>
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${(i - 1) * 28} -14) scale(1.6)`}>
          <path
            className="heart"
            style={{ ...vars({ sway: (cellHash(i, 1, seed) - 0.5) * 24 }), animationDelay: `${0.35 + i * 0.18}s` }}
            d="M0 6 C-9 -1 -9 -9 -4 -10 C-1.5 -10.5 0 -8.5 0 -7 C0 -8.5 1.5 -10.5 4 -10 C9 -9 9 -1 0 6 Z"
            fill={C.trainRed}
          />
        </g>
      ))}
    </g>
  );
}

/** A passenger hopping off the train onto the ground beside the station, then waving. */
function HoppingPassenger({ index, total, seed, ty }: { index: number; total: number; seed: number; ty: number }) {
  const tx = (index - (total - 1) / 2) * 40;
  const shirt = SHIRTS[Math.floor(cellHash(index, 2, seed) * SHIRTS.length)];
  return (
    <g className="hop-out" style={{ ...vars({ tx, ty }), animationDelay: `${0.2 + index * 0.15}s` }}>
      <ellipse cy={13} rx={9} ry={3} fill={C.shadow} />
      <path d="M-9 12 Q-9 -1 0 -1 Q9 -1 9 12 Z" fill={shirt} />
      <circle cy={-8} r={7.5} fill="#F7D2B4" />
      <path d="M-7.5 -9 Q-7 -16.5 0 -16.5 Q7 -16.5 7.5 -9 Q3 -13 -7.5 -9Z" fill={C.ink} />
      <circle cx={-2.6} cy={-7} r={1.1} fill={C.ink} />
      <circle cx={2.6} cy={-7} r={1.1} fill={C.ink} />
      <path d="M-2.5 -3.5 Q0 -1.5 2.5 -3.5" stroke={C.ink} strokeWidth={1.2} fill="none" strokeLinecap="round" />
      <g className="wave-arm" style={{ animationDelay: `${0.75 + index * 0.15}s` }}>
        <path d="M8 2 L14 -9" stroke="#F7D2B4" strokeWidth={3.4} strokeLinecap="round" />
      </g>
    </g>
  );
}

/**
 * Short arrival celebration drawn at the goal tile centre (cx, cy): confetti, sparkles,
 * hearts, a "도착!" bubble and any passengers hopping off. Purely decorative and
 * self-timed by CSS; it mounts when the train arrives and plays once.
 */
export function Ceremony({ cx, cy, bubbleBelow, passengers, seed }: { cx: number; cy: number; bubbleBelow: boolean; passengers: number; seed: number }) {
  const by = bubbleBelow ? 108 : -108;
  return (
    <g transform={`translate(${cx} ${cy})`} pointerEvents="none">
      <circle className="celebrate-ring" r={40} fill="none" stroke={C.gold} strokeWidth={6} />
      <Sparkles />
      <Confetti seed={seed} />
      <Hearts seed={seed} />
      {Array.from({ length: passengers }, (_, i) => (
        <g key={i} transform="scale(1.3)">
          <HoppingPassenger index={i} total={passengers} seed={seed} ty={bubbleBelow ? 42 : -42} />
        </g>
      ))}
      <g transform={`translate(0 ${by}) scale(1.35)`}>
        <g className="arrive-bubble">
          <rect x={-36} y={-17} width={72} height={34} rx={17} fill={C.cream} stroke={C.amber} strokeWidth={3} />
          <path d={bubbleBelow ? 'M-7 -16 L0 -26 L7 -16 Z' : 'M-7 16 L0 26 L7 16 Z'} fill={C.cream} stroke={C.amber} strokeWidth={3} strokeLinejoin="round" />
          <rect x={-8} y={bubbleBelow ? -18 : 12} width={16} height={6} fill={C.cream} />
          <text y={6.5} textAnchor="middle" fontSize={18} fontWeight={900} fill={C.ink}>
            도착!
          </text>
        </g>
      </g>
    </g>
  );
}
