import { type LookItem, type TrainLook, itemById, useLook } from '../look';
import { C } from './palette';

/** Chimney position in train-local coordinates (train faces +x). Smoke puffs spawn here. */
export const CHIMNEY = { x: 15, y: 0 };

const RED = itemById('body-red')!.paint!;
const TEAL = itemById('roof-teal')!.paint!;

/** Gradient for a fancy paint (gold, rainbow, jewel), or the flat colour. */
function Fill({ item }: { item: LookItem }) {
  const g = item.paint?.gradient;
  if (!g) return null;
  return (
    <linearGradient id={`paint-${item.id}`} x1="0" y1="0" x2="1" y2="1">
      {g.map((c, i) => (
        <stop key={i} offset={i / (g.length - 1)} stopColor={c} />
      ))}
    </linearGradient>
  );
}
const fillOf = (item: LookItem | undefined, fallback: string) => (item?.paint?.gradient ? `url(#paint-${item.id})` : (item?.paint?.main ?? fallback));

function Flower({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <circle key={a} r={2.6} cx={3} fill={color} transform={`rotate(${a})`} />
      ))}
      <circle r={2} fill="#FFE066" />
    </g>
  );
}
const STAR = 'M0 -5 L1.5 -1.6 L5 -1.6 L2.2 0.7 L3.1 4.4 L0 2.3 L-3.1 4.4 L-2.2 0.7 L-5 -1.6 L-1.5 -1.6 Z';
const HEART = 'M0 3 C-5 -1 -4.5 -5.5 -1.8 -5.5 C-0.8 -5.5 0 -4.6 0 -3.8 C0 -4.6 0.8 -5.5 1.8 -5.5 C4.5 -5.5 5 -1 0 3 Z';

/** Decoration drawn over the train (train-local coordinates, facing +x). */
function Deco({ id }: { id: string }) {
  switch (id) {
    case 'deco-flag':
      return (
        <g>
          <path d="M-31 -12 V-30" stroke={C.inkSoft} strokeWidth={2} strokeLinecap="round" />
          <path d="M-31 -30 L-18 -26 L-31 -21 Z" fill="#FFD34E" stroke="#E0A92A" strokeWidth={1} />
        </g>
      );
    case 'deco-ribbon':
      return (
        <g transform="translate(-22 0)">
          <path d="M0 0 L-9 -7 Q-11 0 -9 7 Z M0 0 L9 -7 Q11 0 9 7 Z" fill="#FF7FAE" stroke="#D8578A" strokeWidth={1.2} />
          <circle r={3} fill="#D8578A" />
          <path d="M-1 2 L-5 12 M1 2 L5 12" stroke="#FF7FAE" strokeWidth={2.4} strokeLinecap="round" />
        </g>
      );
    case 'deco-flowers':
      return (
        <g>
          <Flower x={-2} y={-9} color="#FF8FB1" />
          <Flower x={21} y={8} color="#FFFFFF" />
          <Flower x={-27} y={9} color="#B48BF2" />
        </g>
      );
    case 'deco-stars':
      return (
        <g fill="#FFD34E" stroke="#E0A92A" strokeWidth={0.8}>
          <path d={STAR} transform="translate(-1 -8)" />
          <path d={STAR} transform="translate(20 7) scale(0.8)" />
          <path d={STAR} transform="translate(-26 8) scale(0.9)" />
        </g>
      );
    case 'deco-hearts':
      return (
        <g fill="#FF6B8B" stroke="#fff" strokeWidth={1}>
          <path d={HEART} transform="translate(-1 -7) scale(1.1)" />
          <path d={HEART} transform="translate(20 7)" />
          <path d={HEART} transform="translate(-26 8) scale(1.1)" />
        </g>
      );
    case 'deco-crown':
      return (
        <g transform="translate(-22 -2) scale(1.15)">
          <path d="M-10 5 L-11 -5 L-5 0 L0 -8 L5 0 L11 -5 L10 5 Z" fill="#FFD34E" stroke="#C9921C" strokeWidth={1.4} strokeLinejoin="round" />
          <circle cx={0} cy={1} r={1.8} fill="#FF6B8B" />
          <circle cx={-6} cy={2} r={1.4} fill="#5AB8F0" />
          <circle cx={6} cy={2} r={1.4} fill="#6BD68A" />
        </g>
      );
    case 'deco-wings':
      return (
        <g fill="#FFFFFF" stroke="#C9D6E8" strokeWidth={1.2} className="wings">
          {[-1, 1].map((s) => (
            <g key={s} transform={`translate(-20 ${s * 15}) scale(1 ${s})`}>
              <path d="M8 0 Q2 14 -16 20 Q-10 12 -12 10 Q-4 10 -6 4 Q0 6 8 0 Z" />
            </g>
          ))}
        </g>
      );
    default:
      return null;
  }
}

/** A small top-down steam locomotive facing +x, centred on the origin, painted in `look`. */
export function TrainArt({ look }: { look?: TrainLook }) {
  const ctx = useLook();
  const l = look ?? ctx;
  const bodyItem = itemById(l.body);
  const roofItem = itemById(l.roof);
  const body = bodyItem?.paint ?? RED;
  const roof = roofItem?.paint ?? TEAL;
  const bodyFill = fillOf(bodyItem, RED.main);
  const roofFill = fillOf(roofItem, TEAL.main);
  return (
    <g>
      {(bodyItem?.paint?.gradient || roofItem?.paint?.gradient) && (
        <defs>
          {bodyItem && <Fill item={bodyItem} />}
          {roofItem && <Fill item={roofItem} />}
        </defs>
      )}
      {l.deco === 'deco-aura' && (
        <g className="aura">
          <ellipse rx={50} ry={34} fill="#FFE38A" opacity={0.35} />
          <g fill="#FFFFFF">
            <path d={STAR} transform="translate(-40 -26) scale(0.9)" />
            <path d={STAR} transform="translate(38 24) scale(0.8)" />
            <path d={STAR} transform="translate(40 -24) scale(0.6)" />
          </g>
        </g>
      )}
      {l.deco === 'deco-wings' && <Deco id="deco-wings" />}
      <rect x={-34} y={-17} width={65} height={36} rx={12} fill={C.shadow} transform="translate(1 3)" />
      {/* Wheels peek out beneath the running boards. */}
      {[-25, -4, 15].map((x) => (
        <g key={x} fill={C.ink}>
          <rect x={x} y={-19} width={9} height={7} rx={2.5} />
          <rect x={x} y={12} width={9} height={7} rx={2.5} />
        </g>
      ))}
      <rect x={-34} y={-16} width={62} height={32} rx={9} fill={C.inkSoft} />
      <rect x={-26} y={-16} width={49} height={3} rx={1.5} fill={body.dark} />
      <rect x={-26} y={13} width={49} height={3} rx={1.5} fill={body.dark} />
      {/* A little wedge-shaped pilot gives the nose a clear direction. */}
      <path d="M 25,-10 L 32,-6 L 32,6 L 25,10 Z" fill={body.dark} />
      <path d="M 27,-6 L 30,-4 M 27,0 H 31 M 27,6 L 30,4" stroke={C.brass} strokeWidth={1.5} strokeLinecap="round" />
      {/* Rounded boiler with a warm band and a dark, open chimney. */}
      <rect x={-11} y={-12} width={37} height={25} rx={11} fill={body.dark} />
      <rect x={-11} y={-12} width={37} height={22} rx={10} fill={bodyFill} />
      <path d="M -3,-10 H 13 Q 20,-10 22,-5 H -5 Q -9,-5 -9,-7 Q -9,-10 -3,-10 Z" fill={body.hi} opacity={bodyItem?.paint?.gradient ? 0.6 : 1} />
      <rect x={3} y={-12} width={3.5} height={24} rx={1} fill={C.brass} />
      <rect x={3} y={-12} width={3.5} height={8} rx={1} fill={C.brassHi} />
      <circle cx={-3} cy={0} r={3.2} fill={C.brass} />
      <circle cx={-3.5} cy={-1} r={1.6} fill={C.brassHi} />
      <circle cx={CHIMNEY.x} cy={CHIMNEY.y} r={6.5} fill={body.dark} />
      <circle cx={CHIMNEY.x} cy={CHIMNEY.y} r={5.4} fill={C.inkSoft} />
      <circle cx={CHIMNEY.x} cy={CHIMNEY.y} r={3.4} fill={C.coal} />
      <circle cx={27} cy={0} r={4.2} fill={C.brass} />
      <circle cx={27.5} cy={-0.4} r={2.7} fill={C.cream} />
      {/* Broad cab roof, with two bright windows at its front corners. */}
      <rect x={-35} y={-16} width={26} height={32} rx={7} fill={body.dark} />
      <rect x={-33} y={-14} width={22} height={28} rx={6} fill={roofFill} />
      <path d="M -27,-13 H -17 Q -12,-13 -12,-8 V -5 H -32 V -8 Q -32,-13 -27,-13 Z" fill={roof.hi} opacity={roofItem?.paint?.gradient ? 0.6 : 1} />
      <rect x={-15} y={-10} width={5} height={7} rx={1.5} fill={C.trainWindow} />
      <rect x={-15} y={3} width={5} height={7} rx={1.5} fill={C.trainWindow} />
      <path d="M -13,-8 V -5 M -13,5 V 8" stroke={C.trainWindowHi} strokeWidth={1.5} strokeLinecap="round" />
      <path d="M -29,11 H -18" stroke={C.ink} strokeOpacity={0.2} strokeWidth={2} strokeLinecap="round" />
      {l.deco !== 'deco-wings' && l.deco !== 'deco-aura' && <Deco id={l.deco} />}
      {l.deco === 'deco-aura' && <Deco id="deco-crown" />}
    </g>
  );
}
