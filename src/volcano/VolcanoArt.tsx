/** Volcano island palette: green grass, dark basalt, glowing lava. */
export const VO = {
  grass: '#8CCB5E',
  grassAlt: '#83C257',
  grassEdge: '#6FA845',
  grassHi: '#A9DD7F',
  frame: '#6B4A3A',
  frameDark: '#4E3428',
  frameHi: '#8C6650',
  rock: '#5D5560',
  rockDark: '#433D47',
  rockHi: '#7C7480',
  sea: '#3F9BD0',
  seaHi: '#9AD6F2',
  cone: '#8A5A44',
  coneDark: '#6A4232',
  lava: '#FF7A2E',
  lavaHot: '#FFC94A',
  lavaDark: '#E0461F',
  stone: '#C9C3BA',
  stoneDark: '#9C958B',
  stoneHi: '#EAE5DD',
  roof: '#E5584F',
  roofDark: '#B83E37',
  wall: '#FFF3DD',
  wallDark: '#E5D2B0',
  egg: '#F7EBD0',
  eggSpot: '#7FBF6A',
  dragon: '#6CC36A',
  dragonDark: '#459A47',
  ink: '#2E3445',
  shadow: 'rgba(40, 30, 20, 0.2)',
} as const;

export function GrassTile({ seed }: { seed: number }) {
  return (
    <g>
      <rect x={-47} y={-47} width={94} height={94} rx={14} fill={seed > 0.5 ? VO.grass : VO.grassAlt} />
      <rect x={-47} y={41} width={94} height={6} rx={3} fill={VO.grassEdge} opacity={0.7} />
      <path
        d={seed > 0.3 ? 'M-26 -14 l4 -10 l4 10 M-14 -18 l3 -8 l3 8' : 'M14 22 l4 -10 l4 10 M26 18 l3 -8 l3 8'}
        stroke={VO.grassHi}
        strokeWidth={4}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

/** Ground next to a crater: too hot for stones. */
export function HotTile() {
  return (
    <g>
      <rect x={-47} y={-47} width={94} height={94} rx={14} fill="#C98A5E" />
      <rect x={-47} y={41} width={94} height={6} rx={3} fill="#A86C45" opacity={0.7} />
      <path d="M-30 -20 L-14 -8 L-20 8 M10 -30 L4 -12 L18 -2 L12 16 M-8 24 L6 30" stroke="#E5583A" strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
    </g>
  );
}

export function SeaArt() {
  return (
    <g>
      <rect x={-50} y={-50} width={100} height={100} fill={VO.sea} />
      <path d="M-30 -10 Q-22 -16 -14 -10 Q-6 -4 2 -10 M0 18 Q8 12 16 18 Q24 24 32 18" stroke={VO.seaHi} strokeWidth={4} fill="none" strokeLinecap="round" />
    </g>
  );
}

export function RockArt() {
  return (
    <g>
      <ellipse cy={34} rx={36} ry={8} fill={VO.shadow} />
      <path d="M-36 28 Q-40 -4 -18 -24 Q2 -38 24 -22 Q42 -6 36 28 Z" fill={VO.rock} />
      <path d="M-36 28 Q-38 10 -28 0 Q-10 14 36 6 Q38 18 36 28 Z" fill={VO.rockDark} opacity={0.6} />
      <path d="M-14 -18 Q2 -28 16 -18" stroke={VO.rockHi} strokeWidth={5} fill="none" strokeLinecap="round" />
    </g>
  );
}

/** A crater: a little cone with a glowing mouth. Small craters carry their volume. */
export function CraterArt({ volume, erupting }: { volume: number | null; erupting: boolean }) {
  return (
    <g>
      <ellipse cy={36} rx={42} ry={9} fill={VO.shadow} />
      <path d="M-42 34 L-16 -22 H16 L42 34 Z" fill={VO.cone} />
      <path d="M-42 34 L-16 -22 H-4 L-14 34 Z" fill={VO.coneDark} opacity={0.5} />
      <ellipse cy={-22} rx={17} ry={7} fill={VO.lavaDark} />
      <ellipse cy={-23} rx={12} ry={4.5} fill={erupting ? VO.lavaHot : VO.lava} className="crater-glow" />
      <path d="M-10 -18 Q-14 0 -8 10 M8 -18 Q12 -2 6 6" stroke={VO.lava} strokeWidth={5} fill="none" strokeLinecap="round" />
      {erupting && (
        <g className="crater-puff">
          <circle cx={-8} cy={-40} r={8} fill={VO.lavaHot} />
          <circle cx={6} cy={-46} r={6} fill={VO.lava} />
        </g>
      )}
      {volume !== null && (
        <g transform="translate(26 -30)">
          <circle r={15} fill="#fff" stroke={VO.lavaDark} strokeWidth={4} />
          <text y={6} textAnchor="middle" fontSize={19} fontWeight={900} fill={VO.lavaDark}>
            {volume}
          </text>
        </g>
      )}
    </g>
  );
}

export function HouseArt({ burned }: { burned: boolean }) {
  return (
    <g>
      <ellipse cy={38} rx={36} ry={8} fill={VO.shadow} />
      <rect x={-28} y={-6} width={56} height={42} rx={6} fill={burned ? '#6E6670' : VO.wall} stroke={burned ? '#4C454F' : VO.wallDark} strokeWidth={3} />
      <path d="M-38 -2 L0 -36 L38 -2 Z" fill={burned ? '#4C454F' : VO.roof} stroke={burned ? '#38323A' : VO.roofDark} strokeWidth={4} strokeLinejoin="round" />
      <rect x={-8} y={12} width={16} height={24} rx={4} fill={burned ? '#38323A' : '#B57A4E'} />
      {!burned && <rect x={12} y={6} width={11} height={11} rx={2} fill="#9FD6F2" />}
      {burned && (
        <g className="smoke">
          <circle cx={-10} cy={-44} r={9} fill="#9A949C" opacity={0.8} />
          <circle cx={4} cy={-56} r={12} fill="#B4AFB6" opacity={0.7} />
          <path d="M-18 -10 Q-12 -26 -6 -12 Q0 -30 8 -10 Q14 -22 18 -8" fill={VO.lava} />
        </g>
      )}
    </g>
  );
}

/** A dragon egg; once the lava warms it a baby dragon peeks out. */
export function EggArt({ hatched }: { hatched: boolean }) {
  if (hatched) {
    return (
      <g className="pop-in">
        <ellipse cy={36} rx={28} ry={7} fill={VO.shadow} />
        <path d="M-24 0 Q-24 36 0 36 Q24 36 24 0 L16 8 L8 -2 L0 8 L-8 -2 L-16 8 Z" fill={VO.egg} stroke="#D9C79E" strokeWidth={3} />
        <circle cy={-14} r={22} fill={VO.dragon} />
        <path d="M-14 -32 L-8 -46 L-2 -34 M2 -34 L8 -46 L14 -32" fill={VO.dragonDark} />
        <circle cx={-8} cy={-16} r={4} fill={VO.ink} />
        <circle cx={8} cy={-16} r={4} fill={VO.ink} />
        <circle cx={-7} cy={-17.5} r={1.4} fill="#fff" />
        <circle cx={9} cy={-17.5} r={1.4} fill="#fff" />
        <path d="M-6 -4 Q0 2 6 -4" stroke={VO.ink} strokeWidth={3} fill="none" strokeLinecap="round" />
        <circle cx={-15} cy={-8} r={3.5} fill="#F59AA8" opacity={0.8} />
        <circle cx={15} cy={-8} r={3.5} fill="#F59AA8" opacity={0.8} />
      </g>
    );
  }
  return (
    <g>
      <ellipse cy={36} rx={26} ry={7} fill={VO.shadow} />
      <path d="M0 -36 Q26 -34 28 4 Q28 36 0 36 Q-28 36 -28 4 Q-26 -34 0 -36 Z" fill={VO.egg} stroke="#D9C79E" strokeWidth={3} />
      <circle cx={-10} cy={-10} r={6} fill={VO.eggSpot} />
      <circle cx={10} cy={8} r={8} fill={VO.eggSpot} />
      <circle cx={-6} cy={20} r={4} fill={VO.eggSpot} />
      <path d="M-14 -24 Q-8 -30 0 -30" stroke="#fff" strokeWidth={4} fill="none" strokeLinecap="round" />
    </g>
  );
}

/** A stone the player put down. */
export function StoneArt() {
  return (
    <g className="pop-in">
      <ellipse cy={34} rx={36} ry={8} fill={VO.shadow} />
      <rect x={-34} y={-24} width={68} height={56} rx={12} fill={VO.stoneDark} />
      <rect x={-34} y={-30} width={68} height={54} rx={12} fill={VO.stone} />
      <path d="M-34 -4 H34 M-6 -30 V-4 M10 -4 V24" stroke={VO.stoneDark} strokeWidth={3} />
      <path d="M-24 -22 H-14" stroke={VO.stoneHi} strokeWidth={5} strokeLinecap="round" />
    </g>
  );
}

export function LavaArt({ fresh }: { fresh: boolean }) {
  return (
    <g className={fresh ? 'lava-in' : undefined}>
      <rect x={-50} y={-50} width={100} height={100} fill={VO.lava} />
      <rect x={-50} y={-50} width={100} height={100} fill="url(#lava-glow)" />
      <circle cx={-18} cy={-14} r={7} fill={VO.lavaHot} className="lava-bubble" />
      <circle cx={16} cy={14} r={5} fill={VO.lavaHot} className="lava-bubble late" />
      <path d="M-34 24 Q-20 16 -6 24 M10 -26 Q22 -32 34 -24" stroke={VO.lavaDark} strokeWidth={4} fill="none" strokeLinecap="round" opacity={0.6} />
    </g>
  );
}

/** A villager for the race bar. */
export function VillagerArt({ mood }: { mood: 'worried' | 'happy' | 'sad' }) {
  return (
    <g>
      <circle cy={-6} r={30} fill="#FFD9B8" stroke="#E8B48C" strokeWidth={3} />
      <path d="M-30 -10 Q-28 -40 0 -40 Q28 -40 30 -10 Q14 -22 0 -20 Q-14 -22 -30 -10 Z" fill="#6B4A3A" />
      <circle cx={-10} cy={-4} r={4} fill={VO.ink} />
      <circle cx={10} cy={-4} r={4} fill={VO.ink} />
      <path
        d={mood === 'happy' ? 'M-9 8 Q0 16 9 8' : mood === 'sad' ? 'M-9 14 Q0 6 9 14' : 'M-7 12 Q0 8 7 12'}
        stroke={VO.ink}
        strokeWidth={3.5}
        fill="none"
        strokeLinecap="round"
      />
      {mood === 'worried' && <path d="M22 -20 Q26 -12 22 -8 Q18 -12 22 -20 Z" fill="#7FC8F2" className="robot-blink" />}
      <circle cx={-18} cy={6} r={4} fill="#F59AA8" opacity={0.7} />
      <circle cx={18} cy={6} r={4} fill="#F59AA8" opacity={0.7} />
    </g>
  );
}
