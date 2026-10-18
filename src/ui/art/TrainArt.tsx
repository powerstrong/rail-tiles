import { C } from './palette';

/** Chimney position in train-local coordinates (train faces +x). Smoke puffs spawn here. */
export const CHIMNEY = { x: 15, y: 0 };

/** A small top-down steam locomotive facing +x, centred on the origin. */
export function TrainArt() {
  return (
    <g>
      <rect x={-27} y={-14} width={58} height={32} rx={11} fill={C.shadow} transform="translate(2 3)" />
      {/* chassis */}
      <rect x={-29} y={-16} width={58} height={32} rx={10} fill={C.ink} />
      <rect x={27} y={-11} width={5} height={22} rx={2} fill={C.ink} />
      {/* boiler */}
      <rect x={-6} y={-12} width={32} height={24} rx={11} fill={C.trainRed} />
      <rect x={-6} y={-12} width={32} height={9} rx={4.5} fill="#F07A70" />
      <rect x={4} y={-12} width={3} height={24} fill={C.cream} />
      <rect x={18} y={-12} width={3} height={24} fill={C.cream} opacity={0.9} />
      <circle cx={CHIMNEY.x} cy={CHIMNEY.y} r={6} fill={C.ink} />
      <circle cx={CHIMNEY.x} cy={CHIMNEY.y} r={3.2} fill="#24232D" />
      <circle cx={28} cy={0} r={3.2} fill={C.gold} />
      {/* cab */}
      <rect x={-27} y={-15} width={23} height={30} rx={6} fill={C.trainRedDark} />
      <rect x={-25} y={-13} width={19} height={26} rx={5} fill={C.teal} />
      <rect x={-25} y={-13} width={19} height={9} rx={4} fill={C.tealHi} />
    </g>
  );
}
