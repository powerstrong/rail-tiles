import type { Dir } from '../engine/dir';

/** Penguin world palette: cold, bright and friendly. */
export const ICE = {
  ice: '#DDF1FA',
  iceAlt: '#D3ECF8',
  iceEdge: '#B4DAEC',
  iceHi: '#F5FCFF',
  frame: '#9FD0E8',
  frameDark: '#6FAED0',
  frameHi: '#CBE9F6',
  water: '#3A8CC4',
  waterDeep: '#2C74A8',
  waterHi: '#8FD0F0',
  rock: '#A3ACB8',
  rockDark: '#7F8896',
  snow: '#FFFFFF',
  snowShade: '#C9E2F0',
  crack: '#6FA9C7',
  current: '#2FA3B8',
  ink: '#2E3445',
  body: '#2D3446',
  belly: '#FFFFFF',
  beak: '#F5A23A',
  fish: '#F28B4B',
  fishDark: '#D86C2E',
  carrot: '#F08A3A',
  shadow: 'rgba(30, 70, 110, 0.18)',
} as const;

/** Scarf colour per penguin (and its fishing hole flag). */
export const PENGUIN_COLORS = ['#EC6A8E', '#3F8BD9', '#E3AE1F'];
/** Igloo pair badge colours. */
export const IGLOO_COLORS = ['#8E6BD1', '#2FA38C', '#E0782E', '#D85A8C'];

export function IceTile({ seed }: { seed: number }) {
  return (
    <g>
      <rect x={-47} y={-47} width={94} height={94} rx={14} fill={seed > 0.5 ? ICE.ice : ICE.iceAlt} />
      <rect x={-47} y={41} width={94} height={6} rx={3} fill={ICE.iceEdge} opacity={0.7} />
      <path d={seed > 0.3 ? 'M-30 -22 L-12 -34 M-24 -10 L-4 -24' : 'M10 18 L28 6 M18 30 L34 19'} stroke={ICE.iceHi} strokeWidth={5} strokeLinecap="round" />
    </g>
  );
}

export function RockArt({ snowman }: { snowman: boolean }) {
  if (snowman) {
    return (
      <g>
        <ellipse cy={36} rx={30} ry={7} fill={ICE.shadow} />
        <circle cy={14} r={24} fill={ICE.snow} stroke={ICE.snowShade} strokeWidth={3} />
        <circle cy={-22} r={17} fill={ICE.snow} stroke={ICE.snowShade} strokeWidth={3} />
        <circle cx={-6} cy={-25} r={2.6} fill={ICE.ink} />
        <circle cx={6} cy={-25} r={2.6} fill={ICE.ink} />
        <path d="M0 -20 L16 -17 L0 -15 Z" fill={ICE.carrot} />
        <path d="M-17 -8 Q0 -2 17 -8 L15 -2 Q0 4 -15 -2 Z" fill="#D85A5A" />
        <circle cy={8} r={2.6} fill={ICE.ink} />
        <circle cy={18} r={2.6} fill={ICE.ink} />
      </g>
    );
  }
  return (
    <g>
      <ellipse cy={34} rx={36} ry={8} fill={ICE.shadow} />
      <path d="M-36 28 Q-40 -6 -16 -26 Q4 -38 24 -24 Q42 -8 36 28 Z" fill={ICE.rock} />
      <path d="M-36 28 Q-38 10 -28 0 Q-10 14 36 6 Q38 18 36 28 Z" fill={ICE.rockDark} opacity={0.5} />
      <path d="M-20 -22 Q2 -36 22 -22 Q8 -14 -6 -16 Q-14 -14 -20 -22 Z" fill={ICE.snow} />
    </g>
  );
}

export function WaterArt({ hole }: { hole?: boolean }) {
  return (
    <g>
      {hole ? (
        <path d="M-40 -20 Q-34 -42 -6 -40 Q30 -44 40 -16 Q46 14 30 34 Q2 46 -26 36 Q-46 18 -40 -20 Z" fill={ICE.water} />
      ) : (
        <rect x={-50} y={-50} width={100} height={100} fill={ICE.water} />
      )}
      <path d="M-24 -6 Q-16 -12 -8 -6 Q0 0 8 -6 M2 16 Q10 10 18 16 Q26 22 32 16" stroke={ICE.waterHi} strokeWidth={4} fill="none" strokeLinecap="round" />
    </g>
  );
}

export function SnowArt() {
  return (
    <g>
      <ellipse cy={26} rx={40} ry={10} fill={ICE.snowShade} />
      <path d="M-40 26 Q-36 -4 -14 -8 Q-6 -24 12 -18 Q34 -16 40 26 Z" fill={ICE.snow} />
      <circle cx={-14} cy={4} r={4} fill={ICE.snowShade} />
      <circle cx={14} cy={-2} r={3} fill={ICE.snowShade} />
    </g>
  );
}

export function CrackArt() {
  return (
    <path
      d="M-30 -30 L-8 -6 L-18 10 L4 30 M-8 -6 L20 -14 L34 4 M-18 10 L-36 18 M20 -14 L24 -36"
      stroke={ICE.crack}
      strokeWidth={4}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

export function CurrentArt({ dir }: { dir: Dir }) {
  return (
    <g transform={`rotate(${dir * 90})`}>
      <rect x={-40} y={-40} width={80} height={80} rx={18} fill={ICE.current} opacity={0.18} />
      <g className="current-flow">
        <path d="M-20 10 L0 -10 L20 10" stroke={ICE.current} strokeWidth={9} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M-20 30 L0 10 L20 30" stroke={ICE.current} strokeWidth={9} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.5} />
      </g>
    </g>
  );
}

export function IglooArt({ door, color, label }: { door: Dir; color: string; label: string }) {
  // Seen from above: a round snow-block dome, with its entrance passage poking out toward the door.
  return (
    <g>
      <ellipse cy={6} rx={40} ry={38} fill={ICE.shadow} />
      <g transform={`rotate(${door * 90})`}>
        <rect x={-17} y={-50} width={34} height={36} rx={9} fill={ICE.snow} stroke={ICE.snowShade} strokeWidth={3} />
        <rect x={-12} y={-50} width={24} height={16} rx={6} fill={ICE.ink} />
      </g>
      <circle r={29} fill={ICE.snow} stroke={ICE.snowShade} strokeWidth={3} />
      <circle r={19} fill="none" stroke={ICE.snowShade} strokeWidth={2.5} />
      <circle r={8} fill="none" stroke={ICE.snowShade} strokeWidth={2.5} />
      <path d="M0 -29 V-19 M0 19 V29 M-29 0 H-19 M19 0 H29 M-14 -14 L-21 -21 M14 14 L21 21 M14 -14 L21 -21 M-14 14 L-21 21" stroke={ICE.snowShade} strokeWidth={2.5} />
      <g transform="translate(24 24)">
        <circle r={13} fill={color} stroke={ICE.snow} strokeWidth={3} />
        <text y={5.5} textAnchor="middle" fontSize={16} fontWeight={900} fill="#fff">
          {label}
        </text>
      </g>
    </g>
  );
}

export function HoleArt({ color, done }: { color: string; done: boolean }) {
  return (
    <g>
      <ellipse rx={33} ry={23} fill={ICE.iceEdge} />
      <ellipse rx={27} ry={18} fill={ICE.waterDeep} />
      <ellipse rx={33} ry={23} fill="none" stroke={color} strokeWidth={5} className={done ? undefined : 'hole-ring'} />
      <g transform="translate(24 -16)">
        <path d="M0 0 V-30" stroke={ICE.ink} strokeWidth={3} strokeLinecap="round" />
        <path d="M0 -30 L20 -24 L0 -17 Z" fill={color} />
      </g>
    </g>
  );
}

export function FishArt() {
  return (
    <g className="fish-bob">
      <path d="M-20 0 Q-6 -15 12 -4 L22 -12 L22 12 L12 4 Q-6 15 -20 0 Z" fill={ICE.fish} stroke={ICE.fishDark} strokeWidth={2.5} strokeLinejoin="round" />
      <circle cx={-10} cy={-2} r={2.6} fill={ICE.ink} />
    </g>
  );
}

export function PenguinArt({ color, cheer }: { color: string; cheer?: boolean }) {
  return (
    <g className={cheer ? 'penguin-cheer' : undefined}>
      <ellipse cy={36} rx={26} ry={7} fill={ICE.shadow} />
      <path d="M-10 32 L-20 38 L-4 38 Z M10 32 L20 38 L4 38 Z" fill={ICE.beak} />
      <ellipse cy={4} rx={27} ry={33} fill={ICE.body} />
      <path d="M-26 0 Q-36 14 -30 24 Q-22 16 -22 4 Z M26 0 Q36 14 30 24 Q22 16 22 4 Z" fill={ICE.body} />
      <ellipse cy={12} rx={18} ry={23} fill={ICE.belly} />
      <ellipse cx={-9} cy={-14} rx={7} ry={8} fill={ICE.belly} />
      <ellipse cx={9} cy={-14} rx={7} ry={8} fill={ICE.belly} />
      <circle cx={-8} cy={-13} r={3.4} fill={ICE.ink} />
      <circle cx={8} cy={-13} r={3.4} fill={ICE.ink} />
      <circle cx={-7} cy={-14.5} r={1.2} fill="#fff" />
      <circle cx={9} cy={-14.5} r={1.2} fill="#fff" />
      <path d="M-6 -6 L6 -6 L0 2 Z" fill={ICE.beak} />
      <circle cx={-15} cy={-3} r={3.5} fill="#F7A3B5" opacity={0.6} />
      <circle cx={15} cy={-3} r={3.5} fill="#F7A3B5" opacity={0.6} />
      <path d="M-22 6 Q0 16 22 6 L22 13 Q0 23 -22 13 Z" fill={color} />
      <path d="M12 12 L18 30 L8 28 Z" fill={color} />
    </g>
  );
}
