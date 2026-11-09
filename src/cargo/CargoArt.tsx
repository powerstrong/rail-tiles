import { memo } from 'react';
import { C } from '../ui/art/palette';
import { type TrainLook, itemById, useLook } from '../ui/look';
import { KINDS, type Kind } from './model';

/** Board geometry (SVG user units). */
export const BOX = 54;
/** Height of one slot in a wagon. */
export const SLOT = 56;
/** Distance between wagons in the line. */
export const PITCH = 88;
export const WAGON_W = 76;
/** Width taken by the locomotive at the front (left). */
export const LOCO_W = 108;
/** Space above the tallest wagon for the crane and hints. */
export const TOP = 74;
/** From the wagon floor down to the bottom of the board (wheels and rails). */
export const UNDER = 62;

const FISH = 'M-17 0 C-10 -11 6 -12 13 -3 L22 -10 L20 0 L22 10 L13 3 C6 12 -10 11 -17 0 Z';
const STAR = 'M0 -19 L5.6 -6.5 L19 -5.8 L8.6 3 L12 17 L0 9.4 L-12 17 L-8.6 3 L-19 -5.8 L-5.6 -6.5 Z';

/** The picture on a gift box, about 44 units across, centred on 0,0. */
export const GiftIcon = memo(function GiftIcon({ kind }: { kind: Kind }) {
  const k = KINDS[kind];
  switch (kind) {
    case 0:
      return (
        <g>
          <path d={FISH} fill={k.color} stroke={k.dark} strokeWidth={2.4} strokeLinejoin="round" />
          <path d="M-2 -7 Q2 0 -2 7" stroke={k.dark} strokeWidth={2} fill="none" strokeLinecap="round" />
          <circle cx={-10} cy={-2} r={2.4} fill={C.ink} />
        </g>
      );
    case 1:
      return (
        <g>
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx={0} cy={-10} rx={7.5} ry={10} fill={k.color} stroke={k.dark} strokeWidth={2} transform={`rotate(${a})`} />
          ))}
          <circle r={6.5} fill="#F6C443" stroke="#C9921A" strokeWidth={2} />
        </g>
      );
    case 2:
      return (
        <g>
          <path d="M-18 12 L-18 -2 L16 -14 L18 12 Z" fill={k.color} stroke={k.dark} strokeWidth={2.4} strokeLinejoin="round" />
          <path d="M-18 -2 L16 -14 L18 -6 L-18 4 Z" fill="#FBE08A" opacity={0.8} />
          {[
            [-8, 6, 3.2],
            [4, 2, 2.4],
            [10, 8, 2],
            [-1, 9, 1.8],
          ].map(([x, y, r]) => (
            <circle key={`${x}`} cx={x} cy={y} r={r} fill={k.dark} opacity={0.55} />
          ))}
        </g>
      );
    case 3:
      return (
        <g>
          <path d={STAR} fill={k.color} stroke={k.dark} strokeWidth={2.4} strokeLinejoin="round" />
          <circle cx={-4} cy={-4} r={2.4} fill="#FFFFFF" opacity={0.7} />
        </g>
      );
    case 4:
      return (
        <g>
          <ellipse rx={18} ry={15} fill={k.color} stroke={k.dark} strokeWidth={2.4} />
          {[-10, -3.5, 3.5, 10].map((x) => (
            <path key={x} d={`M${x} -14 Q${x * 1.5} 0 ${x} 14`} stroke={k.dark} strokeWidth={2.6} fill="none" strokeLinecap="round" />
          ))}
          <path d="M-2 -15 Q0 -20 4 -20" stroke="#7A5A33" strokeWidth={2.4} fill="none" strokeLinecap="round" />
        </g>
      );
    default:
      return (
        <g>
          <g fill={k.color} stroke={k.dark} strokeWidth={2.2} strokeLinejoin="round">
            {[0, 45, 90, 135].map((a) => (
              <rect key={a} x={-4.5} y={-19} width={9} height={38} rx={2} transform={`rotate(${a})`} />
            ))}
            <circle r={13} />
          </g>
          <circle r={5} fill="#F4F1EA" stroke={k.dark} strokeWidth={2.2} />
        </g>
      );
  }
});

/** One gift box, centred on 0,0. */
export const GiftBox = memo(function GiftBox({ kind }: { kind: Kind }) {
  const k = KINDS[kind];
  const h = BOX / 2;
  return (
    <g>
      <rect x={-h} y={-h + 3} width={BOX} height={BOX - 3} rx={9} fill={k.dark} />
      <rect x={-h} y={-h} width={BOX} height={BOX - 3} rx={9} fill="#FFFBF2" stroke={k.dark} strokeWidth={2.5} />
      <g transform="translate(0 -1.5) scale(0.95)">
        <GiftIcon kind={kind} />
      </g>
    </g>
  );
});

/**
 * A ribbon tied round a full wagon (`size` slots tall, floor at 0): the band goes behind the
 * boxes (so it never hides a gift) and the bow on top of them.
 */
export function Ribbon({ size, part }: { size: number; part: 'band' | 'bow' }) {
  const top = -size * SLOT - 2;
  if (part === 'band')
    return (
      <g className="cargo-ribbon" pointerEvents="none">
        <rect x={-6} y={top} width={12} height={-top} fill="#E5584F" stroke="#B83E37" strokeWidth={1.5} />
      </g>
    );
  return (
    <g className="cargo-ribbon" pointerEvents="none">
      <path d={`M0 ${top} C-18 ${top - 18} -30 ${top - 2} -7 ${top + 3} M0 ${top} C18 ${top - 18} 30 ${top - 2} 7 ${top + 3}`} fill="#E5584F" stroke="#B83E37" strokeWidth={2.2} strokeLinejoin="round" />
      <path d={`M-3 ${top + 2} L-10 ${top + 16} M3 ${top + 2} L10 ${top + 16}`} stroke="#E5584F" strokeWidth={5} strokeLinecap="round" />
      <circle cx={0} cy={top} r={5.5} fill="#F07A70" stroke="#B83E37" strokeWidth={2} />
    </g>
  );
}

/** A freight wagon seen from the side, floor at 0, centred on x=0. */
export const WagonArt = memo(function WagonArt({ size, front }: { size: number; front?: boolean }) {
  const w = WAGON_W;
  const h = size * SLOT + 6;
  return (
    <g>
      {/* Wheels and frame. */}
      <rect x={-w / 2 + 4} y={2} width={w - 8} height={10} rx={3} fill={C.steel} />
      {[-w / 2 + 18, w / 2 - 18].map((x) => (
        <g key={x}>
          <circle cx={x} cy={20} r={11} fill={C.ink} />
          <circle cx={x} cy={20} r={5} fill={C.steelPlate} />
        </g>
      ))}
      {/* Couplings. */}
      <rect x={-w / 2 - 9} y={4} width={10} height={5} rx={2} fill={C.steel} />
      <rect x={w / 2 - 1} y={4} width={10} height={5} rx={2} fill={C.steel} />
      {/* Open box: back wall, slots, low side posts. */}
      <rect x={-w / 2} y={-h} width={w} height={h} rx={8} fill={front ? '#F3DDB8' : '#EEDCC0'} stroke={C.boardWoodDark} strokeWidth={2.5} />
      {Array.from({ length: size }, (_, i) => (
        <rect key={i} x={-BOX / 2} y={-(i + 1) * SLOT + 1} width={BOX} height={BOX - 3} rx={9} fill="none" stroke={C.boardWoodDark} strokeOpacity={0.28} strokeWidth={2} strokeDasharray="5 5" />
      ))}
      <rect x={-w / 2} y={-8} width={w} height={10} rx={3} fill={C.boardWood} stroke={C.boardWoodDark} strokeWidth={2} />
      <rect x={-w / 2} y={-h} width={8} height={h} rx={3} fill={C.boardWood} stroke={C.boardWoodDark} strokeWidth={2} />
      <rect x={w / 2 - 8} y={-h} width={8} height={h} rx={3} fill={C.boardWood} stroke={C.boardWoodDark} strokeWidth={2} />
    </g>
  );
});

/** The player's locomotive seen from the side, facing left, wheels on y=20, rear at x=0. */
export function LocoSide({ look }: { look?: TrainLook }) {
  const ctx = useLook();
  const l = look ?? ctx;
  const body = itemById(l.body)?.paint ?? { main: '#E5584F', dark: '#B83E37', hi: '#F48A7F' };
  const roof = itemById(l.roof)?.paint ?? { main: '#2F9A8C', dark: '#1F6E64', hi: '#5CC0B2' };
  return (
    <g>
      <rect x={-112} y={2} width={110} height={10} rx={3} fill={C.steel} />
      {[-92, -60, -28].map((x) => (
        <g key={x}>
          <circle cx={x} cy={20} r={x === -28 ? 13 : 11} fill={C.ink} />
          <circle cx={x} cy={20} r={5} fill={C.steelPlate} />
        </g>
      ))}
      <path d="M-60 20 H-28" stroke={C.steelPlate} strokeWidth={4} strokeLinecap="round" />
      {/* Boiler, pointing left. */}
      <rect x={-112} y={-44} width={74} height={48} rx={20} fill={body.dark} />
      <rect x={-112} y={-46} width={74} height={44} rx={19} fill={body.main} />
      <rect x={-100} y={-42} width={50} height={8} rx={4} fill={body.hi} opacity={0.8} />
      <rect x={-80} y={-46} width={6} height={44} fill="#E0AE3F" />
      <circle cx={-112} cy={-24} r={10} fill="#E0AE3F" stroke="#B5832A" strokeWidth={2} />
      <circle cx={-113} cy={-25} r={5} fill="#FFF6D8" />
      {/* Chimney. */}
      <rect x={-102} y={-66} width={16} height={22} rx={4} fill={C.inkSoft} />
      <rect x={-106} y={-70} width={24} height={8} rx={3} fill={C.ink} />
      {/* Cab. */}
      <rect x={-44} y={-78} width={44} height={82} rx={8} fill={body.dark} />
      <rect x={-42} y={-76} width={40} height={78} rx={7} fill={body.main} />
      <rect x={-36} y={-66} width={28} height={22} rx={5} fill="#BFE3F2" stroke={body.dark} strokeWidth={2.5} />
      <rect x={-50} y={-90} width={56} height={16} rx={6} fill={roof.dark} />
      <rect x={-50} y={-92} width={56} height={13} rx={6} fill={roof.main} />
      <rect x={-44} y={-90} width={30} height={4} rx={2} fill={roof.hi} opacity={0.8} />
      {/* Cowcatcher. */}
      <path d="M-112 6 L-126 22 H-108 Z" fill={C.steel} />
      <rect x={-1} y={4} width={12} height={5} rx={2} fill={C.steel} />
    </g>
  );
}

/** The crane's hook hanging over a wagon, rope from the top of the board. */
export function CraneHook({ y }: { y: number }) {
  return (
    <g className="cargo-hook" pointerEvents="none">
      <path d={`M0 ${-TOP} V${y - 14}`} stroke={C.inkSoft} strokeWidth={3} />
      <rect x={-12} y={y - 18} width={24} height={9} rx={3} fill="#E3AE1F" stroke="#B58515" strokeWidth={2} />
      <path d={`M0 ${y - 9} V${y - 2} Q0 ${y + 6} -7 ${y + 4}`} stroke={C.steel} strokeWidth={3.5} fill="none" strokeLinecap="round" />
    </g>
  );
}
