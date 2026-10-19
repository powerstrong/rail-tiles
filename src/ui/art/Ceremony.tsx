import type { CSSProperties } from 'react';
import { cellHash, passengerShirt } from './SceneryArt';
import { C } from './palette';

const CONFETTI_COLORS = [C.trainRed, C.gold, C.tealHi, C.tunnelB];
const SHIRTS = [C.amber, C.trainRed, C.teal];
const STAR = 'M0 -11 L3.2 -3.6 L11 -3.4 L5 1.8 L7 10 L0 5.7 L-7 10 L-5 1.8 L-11 -3.4 L-3.2 -3.6 Z';

/** CSS custom properties for one animated particle (SVG user units = px in CSS transforms). */
const vars = (v: Record<string, string | number>) =>
  Object.fromEntries(Object.entries(v).map(([k, val]) => [`--${k}`, typeof val === 'number' ? `${val}px` : val])) as CSSProperties;

function Confetti({ seed }: { seed: number }) {
  const pieces = [];
  for (let i = 0; i < 24; i++) {
    const r = (k: number) => cellHash(i, k, seed);
    // Spread a small handful evenly into a fan so each silhouette reads on a phone.
    const angle = -Math.PI / 2 + ((i + r(1)) / 24 - 0.5) * Math.PI * 1.15;
    const speed = 76 + r(2) * 85;
    const mx = Math.cos(angle) * speed;
    const my = Math.sin(angle) * speed;
    const style = {
      ...vars({ mx, my, ex: mx * 1.15 + (r(3) - 0.5) * 24, ey: my + 100 + r(4) * 35 }),
      '--rot': `${(r(5) - 0.5) * 480}deg`,
      animationDelay: `${r(6) * 0.08}s`,
    } as CSSProperties;
    const color = CONFETTI_COLORS[Math.floor(r(7) * CONFETTI_COLORS.length)];
    pieces.push(
      i % 6 === 0 ? (
        <path key={i} className="confetti-piece" d={STAR} fill={C.gold} style={style} />
      ) : i % 3 === 0 ? (
        <circle key={i} className="confetti-piece" r={6} fill={color} style={style} />
      ) : (
        <rect key={i} className="confetti-piece" x={-4} y={-8} width={8} height={16} rx={3} fill={color} style={style} />
      ),
    );
  }
  return <g>{pieces}</g>;
}

function Sparkles() {
  return (
    <g>
      {[-58, 0, 58].map((deg, i) => {
        const a = ((deg - 90) * Math.PI) / 180;
        return (
          <g key={deg} transform={`translate(${Math.cos(a) * 59} ${Math.sin(a) * 59}) scale(1.4)`}>
            <path
              className="sparkle"
              style={{ animationDelay: `${0.06 + i * 0.06}s` }}
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
      {[0, 1].map((i) => (
        <g key={i} transform={`translate(${(i - 0.5) * 38} -16) scale(1.5)`}>
          <path
            className="heart"
            style={{ ...vars({ sway: (cellHash(i, 1, seed) - 0.5) * 20 }), animationDelay: `${0.26 + i * 0.14}s` }}
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
    <g className="hop-out" style={{ ...vars({ tx, ty }), animationDelay: `${0.14 + Math.min(index, 2) * 0.1}s` }}>
      <ellipse cy={13} rx={9} ry={3} fill={C.shadow} />
      <path d="M-9 12 Q-9 -1 0 -1 Q9 -1 9 12 Z" fill={shirt} />
      <circle cy={-8} r={7.5} fill={C.skin} />
      <path d="M-7.5 -9 Q-7 -16.5 0 -16.5 Q7 -16.5 7.5 -9 Q3 -13 -7.5 -9Z" fill={C.ink} />
      <circle cx={-2.6} cy={-7} r={1.1} fill={C.ink} />
      <circle cx={2.6} cy={-7} r={1.1} fill={C.ink} />
      <path d="M-2.5 -3.5 Q0 -1.5 2.5 -3.5" stroke={C.ink} strokeWidth={1.2} fill="none" strokeLinecap="round" />
      <g className="wave-arm" style={{ animationDelay: `${0.6 + Math.min(index, 2) * 0.1}s` }}>
        <path d="M8 2 L14 -9" stroke={C.skin} strokeWidth={3.4} strokeLinecap="round" />
      </g>
    </g>
  );
}

const THANKS = ['땡큐!', '고마워요!', '감사해요!', '야호!'];

/**
 * A passenger boarding at their stop, drawn at the tile centre while the train waits there:
 * they say thanks in a speech bubble, wave, hop from their corner sticker into the train,
 * and a couple of hearts float up. Mounts when the passenger is picked up and plays once.
 */
export function BoardingFx({ seed, bubbleBelow }: { seed: number; bubbleBelow: boolean }) {
  const text = THANKS[Math.floor(seed * THANKS.length) % THANKS.length];
  const bw = 22 + text.length * 17;
  const by = bubbleBelow ? 74 : -74;
  return (
    <g className="boarding" pointerEvents="none">
      <Hearts seed={Math.round(seed * 97)} />
      {/* Starts where the waiting passenger sticker sits (tile corner) and jumps into the train. */}
      <g transform="translate(-26 -23) scale(1.35)">
        <g className="hop-in" style={vars({ tx: 19, ty: 17 })}>
          <path d="M-9 12 Q-9 -1 0 -1 Q9 -1 9 12 Z" fill={passengerShirt(seed)} />
          <path d="M-3 -1 L0 4 L3 -1" fill={C.cream} />
          <circle cy={-8} r={7.5} fill={C.skin} />
          <path d="M-7.5 -9 Q-7 -16.5 0 -16.5 Q7 -16.5 7.5 -9 Q3 -13 -7.5 -9Z" fill={C.ink} />
          <path d="M-4.2 -7.4 Q-2.6 -9 -1 -7.4 M1 -7.4 Q2.6 -9 4.2 -7.4" stroke={C.ink} strokeWidth={1.2} fill="none" strokeLinecap="round" />
          <circle cx={-4.6} cy={-4.4} r={1.5} fill={C.trainRed} opacity={0.35} />
          <circle cx={4.6} cy={-4.4} r={1.5} fill={C.trainRed} opacity={0.35} />
          <path d="M-2.5 -3.2 Q0 -0.6 2.5 -3.2" stroke={C.ink} strokeWidth={1.2} fill="none" strokeLinecap="round" />
          <g className="wave-arm">
            <path d="M8 2 L14 -9" stroke={C.skin} strokeWidth={3.4} strokeLinecap="round" />
          </g>
        </g>
      </g>
      <g transform={`translate(0 ${by}) scale(1.2)`}>
        <g className="thanks-bubble">
          <rect x={-bw / 2} y={-13} width={bw} height={34} rx={17} fill={C.amberDark} opacity={0.22} />
          <rect x={-bw / 2} y={-17} width={bw} height={34} rx={17} fill={C.snow} stroke={C.trainRed} strokeWidth={3} />
          <path d={bubbleBelow ? 'M-6 -16 L0 -25 L6 -16 Z' : 'M-6 16 L0 25 L6 16 Z'} fill={C.snow} stroke={C.trainRed} strokeWidth={3} strokeLinejoin="round" />
          <rect x={-7} y={bubbleBelow ? -18 : 12} width={14} height={6} fill={C.snow} />
          <text y={6} textAnchor="middle" fontSize={17} fontWeight={900} fill={C.ink}>
            {text}
          </text>
        </g>
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
    <g className="arrival-ceremony" transform={`translate(${cx} ${cy})`} pointerEvents="none">
      <circle className="celebrate-ring" r={35} fill="none" stroke={C.gold} strokeWidth={5} />
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
          <rect x={-39} y={-13} width={78} height={36} rx={18} fill={C.amberDark} opacity={0.22} />
          <rect x={-39} y={-18} width={78} height={36} rx={18} fill={C.snow} stroke={C.amber} strokeWidth={3} />
          <path d={bubbleBelow ? 'M-7 -17 L0 -27 L7 -17 Z' : 'M-7 17 L0 27 L7 17 Z'} fill={C.snow} stroke={C.amber} strokeWidth={3} strokeLinejoin="round" />
          <rect x={-8} y={bubbleBelow ? -19 : 13} width={16} height={6} fill={C.snow} />
          <text y={6.5} textAnchor="middle" fontSize={18} fontWeight={900} fill={C.ink}>
            도착!
          </text>
        </g>
      </g>
    </g>
  );
}
