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
  const top = variant === 'grass' ? (alt ? C.grassAlt : C.grass) : variant === 'stone' ? C.stone : C.paving;
  const side = variant === 'grass' ? C.grassSide : C.stoneSide;
  return (
    <g>
      <rect x={-48} y={-45} width={96} height={95} rx={13} fill={side} />
      <rect x={-48} y={-48} width={96} height={93} rx={13} fill={top} />
      <rect x={-46.5} y={-46.5} width={93} height={89} rx={11.5} fill="none" stroke={variant === 'grass' ? C.grassHi : C.cream} strokeWidth={1.5} opacity={0.45} />
      {variant === 'stone' &&
        [
          [-37, -37],
          [37, -37],
          [-37, 34],
          [37, 34],
        ].map(([x, y]) => (
          <g key={`${x}${y}`} transform={`translate(${x} ${y})`}>
            <circle cy={1} r={3.5} fill={C.stoneSide} />
            <circle r={2.8} fill={C.bolt} />
            <path d="M-1.2 -1.2 L1.2 -1.2" stroke={C.cream} strokeWidth={1} strokeLinecap="round" />
          </g>
        ))}
    </g>
  );
}

export const GroundDetail = memo(function GroundDetail({ seed }: { seed: number }) {
  if (seed > 0.38) return null;
  const x = -30 + seed * 120;
  const y = 22 - seed * 70;
  if (seed < 0.13) {
    return (
      <g transform={`translate(${x} ${y}) scale(0.85)`}>
        {[0, 72, 144, 216, 288].map((a) => (
          <circle key={a} cx={Math.cos((a * Math.PI) / 180) * 3.6} cy={Math.sin((a * Math.PI) / 180) * 3.6} r={2.8} fill={seed < 0.09 ? C.flowerA : C.flowerB} />
        ))}
        <circle r={2.2} fill={C.flowerCenter} />
      </g>
    );
  }
  return (
    <g transform={`translate(${x} ${y})`} stroke={C.grassTuft} strokeWidth={2.2} strokeLinecap="round" fill="none">
      <path d="M-4 3 Q-4 -1 -6 -3 M0 3 Q2 -2 1 -5 M4 3 L7 -1" />
    </g>
  );
});

function Tree({ seed }: { seed: number }) {
  const crown = (x: number, y: number, scale: number, light: boolean) => (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx={5} cy={16} rx={29} ry={20} fill={C.shadow} />
      <rect x={-4} y={14} width={9} height={17} rx={3} fill={C.trunk} />
      <path d="M-25 9 C-34 -3 -25 -18 -15 -20 C-11 -33 9 -33 16 -22 C31 -20 36 -4 28 6 C31 20 17 30 5 27 C-9 33 -25 24 -25 9Z" fill={C.treeDark} />
      <path d="M-26 3 C-30 -10 -19 -20 -11 -19 C-6 -31 12 -29 17 -18 C31 -13 31 2 23 10 C16 22 1 21 -6 18 C-19 23 -28 13 -26 3Z" fill={light ? C.treeAlt : C.tree} />
      <path d="M-21 -5 C-24 -13 -15 -20 -8 -17 C-4 -25 8 -24 12 -17 C1 -18 -1 -9 -8 -8 C-14 -10 -16 -3 -21 -5Z" fill={C.treeHi} />
      <path d="M12 17 Q20 16 23 9" stroke={C.treeDark} strokeWidth={2} strokeLinecap="round" fill="none" opacity={0.45} />
    </g>
  );
  if (seed < 0.5) return crown(-1, -3, 1, seed < 0.2);
  return (
    <g>
      {crown(-17, -15, 0.62, true)}
      {crown(15, 12, 0.72, false)}
    </g>
  );
}

function Rock({ seed }: { seed: number }) {
  return (
    <g transform={seed < 0.5 ? undefined : 'scale(-1 1)'}>
      <ellipse cx={4} cy={18} rx={33} ry={15} fill={C.shadow} />
      <path d="M-30 11 L-24 -10 L-8 -24 L15 -22 L28 -5 L25 19 L4 25 L-19 21Z" fill={C.rockDark} stroke={C.rockDark} strokeWidth={3} strokeLinejoin="round" />
      <path d="M-29 9 L-24 -10 L-8 -24 L15 -22 L24 -5 L16 13 L-6 18Z" fill={C.rock} />
      <path d="M-24 -10 L-8 -24 L15 -22 L10 -7 L-9 -3Z" fill={C.rockHi} />
      <path d="M-9 -3 L10 -7 L16 13 L-6 18Z" fill={C.rockHi} opacity={0.25} />
      <path d="M22 19 L29 10 L39 14 L38 25 L27 28 L20 24Z" fill={C.rockDark} />
      <path d="M22 19 L29 10 L39 14 L32 21Z" fill={C.rockHi} />
    </g>
  );
}

function Mountain({ seed }: { seed: number }) {
  const peak = -14 + seed * 25;
  const summit = -40 + seed * 9;
  const shoulder = seed < 0.5 ? 27 : -27;
  return (
    <g>
      <ellipse cx={3} cy={30} rx={44} ry={12} fill={C.shadow} />
      <path d="M-46 28 Q-35 9 -17 18 Q1 7 23 16 Q40 14 47 30 L45 38 Q0 44 -45 36Z" fill={C.foothill} />
      <path d={`M-43 28 L${shoulder} -20 L44 29 Q28 37 11 32Z`} fill={C.mountainShade} stroke={C.mountainShade} strokeWidth={4} strokeLinejoin="round" />
      <path d={`M${shoulder} -20 L${shoulder + 9} 12 L9 29 L-43 28Z`} fill={C.mountainHi} />
      <path d={`M-41 29 L${peak - 14} -15 L${peak} ${summit} L${peak + 17} -8 L38 32 Q-1 40 -41 29Z`} fill={C.mountain} stroke={C.mountain} strokeWidth={4} strokeLinejoin="round" />
      <path d={`M${peak} ${summit} L${peak + 17} -8 L38 32 L${peak + 4} 33 L${peak + 3} -7Z`} fill={C.mountainShade} />
      <path d={`M${peak - 12} -17 L${peak} ${summit} L${peak + 12} -18 L${peak + 5} -20 L${peak} -13 L${peak - 5} -22Z`} fill={C.snow} stroke={C.snow} strokeWidth={2} strokeLinejoin="round" />
      <path d="M-32 30 Q-18 23 -7 32 M22 32 Q31 26 39 32" stroke={C.foothill} strokeWidth={5} strokeLinecap="round" fill="none" />
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
      {body(C.grassSide, -3)}
      {body(C.waterDeep, 0)}
      {body(C.water, 5)}
      <path d="M-27 -17 Q-23 -25 -14 -25" stroke={C.waterHi} strokeWidth={2.5} strokeLinecap="round" fill="none" opacity={0.7} />
      <path d="M-15 -3 q5 -3 10 0 M7 17 q5 -3 10 0" stroke={C.waterHi} strokeWidth={2.5} strokeLinecap="round" fill="none" />
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
      <path d="M-30 -2 H26" stroke={C.cream} strokeWidth={2} opacity={0.45} />
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
  const roofDark = kind === 'start' ? C.tealDark : C.amberDark;
  const stub: Segment = { type: 'line', a: { x: -0.36, y: 0 }, b: { x: 0.5, y: 0 }, length: 0.86 };
  return (
    <g transform={`rotate(${(dir - 1) * 90})`}>
      <SegmentArt seg={stub} />
      {/* Raised platform and ticket office, clear of the track centreline. */}
      <rect x={-46} y={-46} width={92} height={24} rx={5} fill={C.platformEdge} />
      <rect x={-46} y={-47} width={92} height={22} rx={5} fill={C.platform} />
      <path d="M-40 -26 H41" stroke={C.brass} strokeWidth={1.5} strokeDasharray="3 4" />
      <rect x={-39} y={-42} width={67} height={17} rx={3} fill={C.shadow} transform="translate(2 2)" />
      <rect x={-38} y={-41} width={63} height={15} rx={2} fill={C.houseWall} />
      <rect x={-11} y={-34} width={10} height={8} rx={1} fill={roofDark} />
      <path d="M-30 -32 H-20 M8 -32 H18" stroke={C.trainWindow} strokeWidth={5} />
      <path d="M-30 -28 H-20 M8 -28 H18" stroke={roofDark} strokeWidth={1.5} />
      {/* Two roof planes and hipped ends stay recognisable at phone scale. */}
      <path d="M-41 -46 Q-41 -48 -38 -48 H25 Q28 -48 28 -45 V-33 H-41Z" fill={roof} />
      <path d="M-38 -48 H25 L18 -40 H-31Z" fill={roofHi} />
      <path d="M-41 -46 L-31 -40 L-41 -33Z M28 -46 V-33 L18 -40Z" fill={roofDark} />
      <path d="M-31 -40 H18" stroke={C.cream} strokeWidth={1.5} opacity={0.5} />
      {kind === 'goal' ? (
        <g>
          <path d="M35 -25 V-46" stroke={C.amberDark} strokeWidth={2.5} strokeLinecap="round" />
          <path d="M36 -46 H46 L43 -41 L46 -36 H36Z" fill={C.amber} />
          <path d="M37 -44 L41 -41 L37 -38" stroke={C.cream} strokeWidth={1.8} fill="none" />
        </g>
      ) : (
        <g>
          <circle cx={36} cy={-36} r={7} fill={C.teal} />
          <circle cx={36} cy={-36} r={5.2} fill={C.cream} />
          <path d="M36 -39 V-36 L39 -35" stroke={C.tealDark} strokeWidth={1.6} strokeLinecap="round" fill="none" />
        </g>
      )}
      <rect x={-42} y={-17} width={7} height={34} rx={2.5} fill={C.trainRedDark} />
      <rect x={-41} y={-17} width={4} height={34} rx={2} fill={C.trainRed} />
      <path d="M-40 -10 V-5 M-40 5 V10" stroke={C.cream} strokeWidth={2} />
    </g>
  );
}

/** Station name label, kept upright regardless of station rotation. */
export function StationLabel({ dir, kind }: { dir: Dir; kind: 'start' | 'goal' }) {
  const a = ((dir - 1) * Math.PI) / 2;
  // Opposite platform: keep the building visible and the sign within its tile.
  // Vertical tracks need less horizontal offset because the sign stays upright.
  const lx = -27 * Math.sin(a);
  const ly = 35 * Math.cos(a);
  const text = kind === 'start' ? '출발' : '도착';
  return (
    <g transform={`translate(${lx} ${ly})`} pointerEvents="none">
      <rect x={-21} y={-10} width={42} height={22} rx={5} fill={C.shadow} />
      <rect x={-21} y={-11} width={42} height={21} rx={5} fill={C.cream} stroke={kind === 'start' ? C.teal : C.amberDark} strokeWidth={2} />
      <circle cx={-17} cy={0} r={1.2} fill={kind === 'start' ? C.teal : C.amberDark} />
      <circle cx={17} cy={0} r={1.2} fill={kind === 'start' ? C.teal : C.amberDark} />
      <text y={5} textAnchor="middle" fontSize={13.5} fontWeight={800} fill={C.ink}>
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
