import { C } from './palette';

/** Chimney position in train-local coordinates (train faces +x). Smoke puffs spawn here. */
export const CHIMNEY = { x: 15, y: 0 };

/** A small top-down steam locomotive facing +x, centred on the origin. */
export function TrainArt() {
  return (
    <g>
      <rect x={-34} y={-17} width={65} height={36} rx={12} fill={C.shadow} transform="translate(1 3)" />
      {/* Wheels peek out beneath the running boards. */}
      {[-25, -4, 15].map((x) => (
        <g key={x} fill={C.ink}>
          <rect x={x} y={-19} width={9} height={7} rx={2.5} />
          <rect x={x} y={12} width={9} height={7} rx={2.5} />
        </g>
      ))}
      <rect x={-34} y={-16} width={62} height={32} rx={9} fill={C.inkSoft} />
      <rect x={-26} y={-16} width={49} height={3} rx={1.5} fill={C.trainRedDark} />
      <rect x={-26} y={13} width={49} height={3} rx={1.5} fill={C.trainRedDark} />
      {/* A little wedge-shaped pilot gives the nose a clear direction. */}
      <path d="M 25,-10 L 32,-6 L 32,6 L 25,10 Z" fill={C.trainRedDark} />
      <path d="M 27,-6 L 30,-4 M 27,0 H 31 M 27,6 L 30,4" stroke={C.brass} strokeWidth={1.5} strokeLinecap="round" />
      {/* Rounded boiler with a warm band and a dark, open chimney. */}
      <rect x={-11} y={-12} width={37} height={25} rx={11} fill={C.trainRedDark} />
      <rect x={-11} y={-12} width={37} height={22} rx={10} fill={C.trainRed} />
      <path d="M -3,-10 H 13 Q 20,-10 22,-5 H -5 Q -9,-5 -9,-7 Q -9,-10 -3,-10 Z" fill={C.trainRedHi} />
      <rect x={3} y={-12} width={3.5} height={24} rx={1} fill={C.brass} />
      <rect x={3} y={-12} width={3.5} height={8} rx={1} fill={C.brassHi} />
      <circle cx={-3} cy={0} r={3.2} fill={C.brass} />
      <circle cx={-3.5} cy={-1} r={1.6} fill={C.brassHi} />
      <circle cx={CHIMNEY.x} cy={CHIMNEY.y} r={6.5} fill={C.trainRedDark} />
      <circle cx={CHIMNEY.x} cy={CHIMNEY.y} r={5.4} fill={C.inkSoft} />
      <circle cx={CHIMNEY.x} cy={CHIMNEY.y} r={3.4} fill={C.coal} />
      <circle cx={27} cy={0} r={4.2} fill={C.brass} />
      <circle cx={27.5} cy={-0.4} r={2.7} fill={C.cream} />
      {/* Broad teal cab roof, with two bright windows at its front corners. */}
      <rect x={-35} y={-16} width={26} height={32} rx={7} fill={C.trainRedDark} />
      <rect x={-33} y={-14} width={22} height={28} rx={6} fill={C.teal} />
      <path d="M -27,-13 H -17 Q -12,-13 -12,-8 V -5 H -32 V -8 Q -32,-13 -27,-13 Z" fill={C.tealHi} />
      <rect x={-15} y={-10} width={5} height={7} rx={1.5} fill={C.trainWindow} />
      <rect x={-15} y={3} width={5} height={7} rx={1.5} fill={C.trainWindow} />
      <path d="M -13,-8 V -5 M -13,5 V 8" stroke={C.trainWindowHi} strokeWidth={1.5} strokeLinecap="round" />
      <path d="M -29,11 H -18" stroke={C.ink} strokeOpacity={0.2} strokeWidth={2} strokeLinecap="round" />
    </g>
  );
}
