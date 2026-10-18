import { memo } from 'react';
import { type Dir, DX, DY } from '../../engine/dir';
import type { Segment } from '../../engine/geometry';
import type { Decoration } from '../../engine/stage';
import { C } from './palette';
import { SegmentArt } from './TrackArt';

/** Small deterministic hash so decorations vary per cell but never flicker between renders. */
export function cellHash(x: number, y: number, salt = 0): number {
  let h = (x * 374761393 + y * 668265263 + salt * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export type TileVariant = 'grass' | 'stone' | 'paved';

/** A raised board tile: top face plus a darker side band for a touch of depth. */
export function TileBase({ variant, alt }: { variant: TileVariant; alt: boolean }) {
  const top = variant === 'grass' ? (alt ? C.grassAlt : C.grass) : variant === 'stone' ? C.stone : '#EFE6D6';
  const side = variant === 'grass' ? C.grassSide : C.stoneSide;
  return (
    <g>
      <rect x={-48} y={-46} width={96} height={96} rx={12} fill={side} />
      <rect x={-48} y={-48} width={96} height={93} rx={12} fill={top} />
      {variant === 'stone' &&
        [
          [-37, -37],
          [37, -37],
          [-37, 34],
          [37, 34],
        ].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r={3.2} fill={C.bolt} />)}
    </g>
  );
}

export const GroundDetail = memo(function GroundDetail({ seed }: { seed: number }) {
  if (seed > 0.45) return null;
  const x = -30 + seed * 120;
  const y = 22 - seed * 70;
  if (seed < 0.18) {
    return (
      <g transform={`translate(${x} ${y})`}>
        {[0, 72, 144, 216, 288].map((a) => (
          <circle key={a} cx={Math.cos((a * Math.PI) / 180) * 3.6} cy={Math.sin((a * Math.PI) / 180) * 3.6} r={2.8} fill={seed < 0.09 ? C.flowerA : C.flowerB} />
        ))}
        <circle r={2.2} fill={C.flowerCenter} />
      </g>
    );
  }
  return (
    <g transform={`translate(${x} ${y})`} stroke={C.grassTuft} strokeWidth={2.6} strokeLinecap="round" fill="none">
      <path d="M-4 3 L-6 -4 M0 3 L0 -6 M4 3 L6 -4" />
    </g>
  );
});

function Tree({ seed }: { seed: number }) {
  if (seed < 0.5) {
    return (
      <g>
        <ellipse cx={6} cy={14} rx={30} ry={22} fill={C.shadow} />
        <circle cx={0} cy={4} r={29} fill={C.treeDark} />
        <circle cx={-2} cy={0} r={26} fill={C.tree} />
        <circle cx={-10} cy={-9} r={10} fill={C.treeHi} opacity={0.85} />
      </g>
    );
  }
  const small = (x: number, y: number, r: number) => (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={4} cy={9} rx={r} ry={r * 0.75} fill={C.shadow} />
      <circle cy={3} r={r} fill={C.treeDark} />
      <circle cx={-1} r={r - 2} fill={C.tree} />
      <circle cx={-r * 0.35} cy={-r * 0.35} r={r * 0.35} fill={C.treeHi} opacity={0.85} />
    </g>
  );
  return (
    <g>
      {small(-15, -14, 18)}
      {small(16, 12, 20)}
    </g>
  );
}

function Rock({ seed }: { seed: number }) {
  return (
    <g transform={seed < 0.5 ? undefined : 'scale(-1 1)'}>
      <ellipse cx={4} cy={18} rx={34} ry={16} fill={C.shadow} />
      <path d="M-30 14 L-22 -14 L2 -26 L24 -14 L30 12 L8 22 L-18 22 Z" fill={C.rockDark} strokeLinejoin="round" />
      <path d="M-28 10 L-21 -16 L2 -28 L22 -16 L26 8 L6 16 L-16 16 Z" fill={C.rock} strokeLinejoin="round" />
      <path d="M-21 -16 L2 -28 L6 -10 L-12 -4 Z" fill={C.rockHi} />
      <path d="M18 16 L28 6 L40 14 L34 26 L20 26 Z" fill={C.rockDark} />
      <path d="M20 13 L28 4 L38 11 L32 20 L22 20 Z" fill={C.rock} />
    </g>
  );
}

function Mountain({ seed }: { seed: number }) {
  const lean = (seed - 0.5) * 10;
  return (
    <g>
      <ellipse cx={6} cy={30} rx={44} ry={14} fill={C.shadow} />
      <path d={`M-44 32 L${lean} -40 L44 32 Z`} fill={C.mountain} strokeLinejoin="round" stroke={C.mountain} strokeWidth={6} />
      <path d={`M${lean} -40 L44 32 L${lean + 8} 32 Z`} fill={C.mountainShade} strokeLinejoin="round" stroke={C.mountainShade} strokeWidth={6} />
      <path
        d={`M${lean - 13} -20 L${lean} -40 L${lean + 13} -20 L${lean + 6} -15 L${lean} -21 L${lean - 6} -14 Z`}
        fill={C.snow}
        strokeLinejoin="round"
        stroke={C.snow}
        strokeWidth={3}
      />
    </g>
  );
}

/** Water joins up with neighbouring water cells so ponds read as one body. */
function Water({ joins }: { joins: Dir[] }) {
  const body = (fill: string, inset: number) => (
    <g fill={fill}>
      <rect x={-40 + inset} y={-40 + inset} width={80 - inset * 2} height={80 - inset * 2} rx={22} />
      {joins.map((d) => (
        <rect
          key={d}
          x={DX[d] === 0 ? -40 + inset : DX[d] > 0 ? 0 : -50}
          y={DY[d] === 0 ? -40 + inset : DY[d] > 0 ? 0 : -50}
          width={DX[d] === 0 ? 80 - inset * 2 : 50}
          height={DY[d] === 0 ? 80 - inset * 2 : 50}
        />
      ))}
    </g>
  );
  return (
    <g>
      {body(C.waterDeep, 0)}
      {body(C.water, 5)}
      <path d="M-18 -6 q6 -5 12 0 M4 12 q6 -5 12 0" stroke={C.waterHi} strokeWidth={3} strokeLinecap="round" fill="none" />
    </g>
  );
}

function House({ seed }: { seed: number }) {
  return (
    <g transform={`rotate(${seed < 0.5 ? 0 : 90})`}>
      <rect x={-26} y={-18} width={56} height={44} rx={5} fill={C.shadow} />
      <rect x={-30} y={-24} width={56} height={44} rx={5} fill={C.houseWall} />
      <path d="M-32 -26 H28 V-2 H-32 Z" fill={C.houseRoof} />
      <path d="M-32 -2 H28 V22 H-32 Z" fill={C.houseRoofShade} />
      <rect x={10} y={-22} width={8} height={10} rx={2} fill={C.inkSoft} />
    </g>
  );
}

export const DecorationArt = memo(function DecorationArt({ deco, seed, joins }: { deco: Decoration; seed: number; joins: Dir[] }) {
  switch (deco) {
    case 'tree':
      return <Tree seed={seed} />;
    case 'rock':
      return <Rock seed={seed} />;
    case 'mountain':
      return <Mountain seed={seed} />;
    case 'water':
      return <Water joins={joins} />;
    case 'house':
      return <House seed={seed} />;
  }
});

/** Station tile. Drawn facing east, then rotated so its track leaves through `dir`. */
export function StationArt({ dir, kind }: { dir: Dir; kind: 'start' | 'goal' }) {
  const roof = kind === 'start' ? C.teal : C.amber;
  const roofHi = kind === 'start' ? C.tealHi : C.amberHi;
  const stub: Segment = { type: 'line', a: { x: -0.36, y: 0 }, b: { x: 0.5, y: 0 }, length: 0.86 };
  return (
    <g transform={`rotate(${(dir - 1) * 90})`}>
      <rect x={-46} y={-46} width={92} height={24} rx={6} fill="#F8F1E4" />
      <rect x={-46} y={-26} width={92} height={4} fill="#D9CCB6" />
      <SegmentArt seg={stub} />
      <rect x={-42} y={-17} width={7} height={34} rx={2.5} fill={C.trainRedDark} />
      <rect x={-41} y={-17} width={4} height={34} rx={2} fill={C.trainRed} />
      <rect x={-38} y={-44} width={78} height={28} rx={7} fill={C.shadow} transform="translate(3 4)" />
      <rect x={-38} y={-48} width={78} height={28} rx={7} fill={roof} />
      <rect x={-38} y={-48} width={78} height={12} rx={6} fill={roofHi} />
      <path d="M-30 -24 H32" stroke="rgba(255,255,255,0.35)" strokeWidth={2} strokeDasharray="6 5" />
    </g>
  );
}

/** Station name label, kept upright regardless of station rotation. */
export function StationLabel({ dir, kind }: { dir: Dir; kind: 'start' | 'goal' }) {
  const a = ((dir - 1) * Math.PI) / 2;
  // Roof centre (0, -34) in station space, rotated with the station.
  const lx = 34 * Math.sin(a);
  const ly = -34 * Math.cos(a);
  const text = kind === 'start' ? '출발' : '도착';
  return (
    <g transform={`translate(${lx} ${ly})`} pointerEvents="none">
      <rect x={-20} y={-11} width={40} height={22} rx={11} fill={C.cream} stroke={kind === 'start' ? C.teal : C.amber} strokeWidth={2.5} />
      <text y={5.5} textAnchor="middle" fontSize={14} fontWeight={800} fill={C.ink}>
        {text}
      </text>
    </g>
  );
}

/** Passenger stop marker for waypoint cells (future stages). */
export function PassengerArt({ visited }: { visited: boolean }) {
  return (
    <g transform="translate(-30 -30)" opacity={visited ? 0.45 : 1}>
      <circle r={15} fill={C.cream} stroke={C.amber} strokeWidth={3} />
      <circle cy={-4} r={4.5} fill={C.ink} />
      <path d="M-7 8 Q0 -2 7 8 Z" fill={C.ink} />
    </g>
  );
}
