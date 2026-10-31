/** Clock tower palette: warm wood, cream floorboards, brass clockwork. */
export const CK = {
  night: '#3A2C4F',
  nightHi: '#4A3A63',
  floor: '#F4E6C8',
  floorAlt: '#EEDDB8',
  floorEdge: '#DCC69C',
  plank: '#E2CDA3',
  frame: '#8A5A33',
  frameDark: '#6A4223',
  frameHi: '#B07A48',
  wall: '#7B5536',
  wallDark: '#5C3E26',
  wallHi: '#9A6E49',
  brass: '#E0AE3F',
  brassDark: '#B5832A',
  brassHi: '#F6D88A',
  ink: '#3A2E2A',
  red: '#E5584F',
  redDark: '#B83F37',
  redHi: '#F58A80',
  blue: '#3A8FD9',
  blueDark: '#2A6FB0',
  blueHi: '#7CB9EE',
  mouse: '#B9B3C2',
  mouseDark: '#8F889B',
  pink: '#F4A3B8',
  cheese: '#F6C744',
  cheeseDark: '#D9A21E',
} as const;

const BLOCK = [
  { main: CK.red, dark: CK.redDark, hi: CK.redHi },
  { main: CK.blue, dark: CK.blueDark, hi: CK.blueHi },
];

export function FloorTile({ seed }: { seed: number }) {
  return (
    <g>
      <rect x={-48} y={-48} width={96} height={96} rx={8} fill={seed > 0.5 ? CK.floor : CK.floorAlt} />
      <path d={`M-48 ${-16 + seed * 8} H48 M-48 ${18 + seed * 6} H48`} stroke={CK.plank} strokeWidth={3} />
      <rect x={-48} y={42} width={96} height={6} rx={3} fill={CK.floorEdge} opacity={0.7} />
    </g>
  );
}

/** A brick pillar of the tower. */
export function WallArt() {
  return (
    <g>
      <rect x={-48} y={-44} width={96} height={94} rx={10} fill={CK.wallDark} />
      <rect x={-48} y={-48} width={96} height={90} rx={10} fill={CK.wall} />
      <g stroke={CK.wallDark} strokeWidth={4} opacity={0.6}>
        <path d="M-48 -18 H48 M-48 12 H48" />
        <path d="M-6 -48 V-18 M24 -18 V12 M-30 -18 V12 M6 12 V42" />
      </g>
      <path d="M-38 -38 H30" stroke={CK.wallHi} strokeWidth={4} strokeLinecap="round" />
    </g>
  );
}

/** A red or blue block: standing up (it blocks) or sunk into the floor (it will rise next tick). */
export function BlockArt({ color, up }: { color: 0 | 1; up: boolean }) {
  const c = BLOCK[color];
  return (
    <g>
      <g className={`clock-block ${up ? 'up' : 'down'}`}>
        <rect x={-40} y={-34} width={80} height={80} rx={14} fill={c.dark} />
        <rect x={-40} y={-42} width={80} height={76} rx={14} fill={c.main} />
        <path d="M-28 -30 H14" stroke={c.hi} strokeWidth={6} strokeLinecap="round" />
        {color === 0 ? <circle cy={-4} r={13} fill="#fff" opacity={0.85} /> : <rect x={-12} y={-16} width={24} height={24} rx={4} fill="#fff" opacity={0.85} transform="rotate(45 0 -4)" />}
      </g>
      <g className={`clock-block-slot ${up ? 'up' : 'down'}`}>
        <rect x={-40} y={-40} width={80} height={80} rx={14} fill={c.main} opacity={0.18} stroke={c.main} strokeWidth={5} strokeDasharray="12 8" />
        {color === 0 ? <circle r={10} fill="none" stroke={c.main} strokeWidth={5} /> : <rect x={-9} y={-9} width={18} height={18} rx={3} fill="none" stroke={c.main} strokeWidth={5} transform="rotate(45)" />}
        <path d="M-10 28 L0 18 L10 28" stroke={c.main} strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" className="clock-rise" />
      </g>
    </g>
  );
}

/** The brass gear a hand turns around. */
export function HubArt() {
  return (
    <g>
      <circle r={40} fill={CK.floorEdge} opacity={0.6} />
      <g className="clock-gear">
        {Array.from({ length: 10 }, (_, k) => (
          <rect key={k} x={-7} y={-40} width={14} height={16} rx={3} fill={CK.brassDark} transform={`rotate(${k * 36})`} />
        ))}
        <circle r={30} fill={CK.brassDark} />
        <circle r={27} fill={CK.brass} />
        <circle r={12} fill={CK.brassDark} />
      </g>
      <circle r={7} fill={CK.ink} />
    </g>
  );
}

/** A clock hand pointing north from its hub, `len` cells long. */
export function HandArt({ len, ghost = false }: { len: number; ghost?: boolean }) {
  const tip = -len * 100 + 14;
  const d = `M-10 0 L-7 ${tip + 34} L-20 ${tip + 34} L0 ${tip} L20 ${tip + 34} L7 ${tip + 34} L10 0 Z`;
  if (ghost) return <path d={d} fill={CK.brass} opacity={0.28} stroke={CK.brassDark} strokeWidth={3} strokeDasharray="8 6" />;
  return (
    <g>
      <path d={d} fill={CK.ink} opacity={0.2} transform="translate(5 7)" />
      <path d={d} fill={CK.brass} stroke={CK.brassDark} strokeWidth={4} strokeLinejoin="round" />
      <path d={`M0 -12 V${tip + 40}`} stroke={CK.brassHi} strokeWidth={4} strokeLinecap="round" />
    </g>
  );
}

/** A lever: its handle leans the way the hands turn (right = clockwise). */
export function LeverArt({ reversed }: { reversed: boolean }) {
  return (
    <g>
      <rect x={-40} y={-40} width={80} height={80} rx={16} fill="#E9D3F2" stroke="#9B4FB8" strokeWidth={4} />
      <g transform={`rotate(${reversed ? -35 : 35})`} className="clock-lever-arm">
        <rect x={-5} y={-34} width={10} height={36} rx={5} fill={CK.ink} />
        <circle cy={-34} r={10} fill={CK.red} stroke="#fff" strokeWidth={3} />
      </g>
      <rect x={-20} y={4} width={40} height={14} rx={6} fill={CK.frameDark} />
      <path d={reversed ? 'M14 28 A16 16 0 1 1 -14 28' : 'M-14 28 A16 16 0 1 0 14 28'} stroke="#9B4FB8" strokeWidth={4} fill="none" transform="translate(0 -6) scale(0.7)" />
    </g>
  );
}

/** The goal: a mouse hole in the tower wall with a wedge of cheese in front. */
export function ExitArt() {
  return (
    <g>
      <path d="M-34 40 V0 A34 34 0 0 1 34 0 V40 Z" fill={CK.frameDark} />
      <path d="M-24 40 V2 A24 24 0 0 1 24 2 V40 Z" fill="#2A1E1A" />
      <g transform="translate(0 22)" className="clock-cheese">
        <path d="M-24 14 L24 14 L24 -4 L-18 -12 Z" fill={CK.cheeseDark} />
        <path d="M-24 10 L24 10 L24 -8 L-18 -16 Z" fill={CK.cheese} />
        <circle cx={-6} cy={-2} r={4} fill={CK.cheeseDark} />
        <circle cx={10} cy={2} r={3} fill={CK.cheeseDark} />
      </g>
    </g>
  );
}

/** The mouse seen from above, facing north; `rot` turns it to face its last step. */
export function MouseArt({ happy = false }: { happy?: boolean }) {
  return (
    <g>
      <ellipse cy={30} rx={26} ry={8} fill="rgba(0,0,0,0.18)" />
      <path d="M0 26 C4 40 18 40 22 32" stroke={CK.pink} strokeWidth={5} fill="none" strokeLinecap="round" />
      <ellipse cy={8} rx={24} ry={28} fill={CK.mouseDark} />
      <ellipse cy={5} rx={23} ry={26} fill={CK.mouse} />
      <circle cx={-20} cy={-20} r={15} fill={CK.mouseDark} />
      <circle cx={20} cy={-20} r={15} fill={CK.mouseDark} />
      <circle cx={-20} cy={-20} r={9} fill={CK.pink} />
      <circle cx={20} cy={-20} r={9} fill={CK.pink} />
      <ellipse cy={-12} rx={17} ry={18} fill={CK.mouse} />
      <circle cx={-7} cy={-14} r={3.5} fill={CK.ink} />
      <circle cx={7} cy={-14} r={3.5} fill={CK.ink} />
      <circle cx={-6} cy={-15} r={1.2} fill="#fff" />
      <circle cx={8} cy={-15} r={1.2} fill="#fff" />
      <circle cy={-29} r={4.5} fill={CK.pink} />
      <path d="M-4 -24 L-16 -28 M-4 -22 L-16 -21 M4 -24 L16 -28 M4 -22 L16 -21" stroke={CK.ink} strokeWidth={1.5} strokeLinecap="round" opacity={0.6} />
      {happy && <path d="M-6 -6 Q0 0 6 -6" stroke={CK.ink} strokeWidth={2.5} fill="none" strokeLinecap="round" />}
    </g>
  );
}

/** A small clock face for the bonus bar and the intro cards. */
export function ClockFace({ hour = 0 }: { hour?: number }) {
  return (
    <g>
      <circle r={40} fill="#fff" stroke={CK.frame} strokeWidth={8} />
      {Array.from({ length: 12 }, (_, k) => (
        <rect key={k} x={-2} y={-34} width={4} height={k % 3 ? 5 : 9} rx={2} fill={CK.ink} transform={`rotate(${k * 30})`} />
      ))}
      <path d="M0 0 V-26" stroke={CK.ink} strokeWidth={5} strokeLinecap="round" transform={`rotate(${hour * 30})`} />
      <path d="M0 0 V-16" stroke={CK.red} strokeWidth={6} strokeLinecap="round" transform={`rotate(${hour * 30 + 120})`} />
      <circle r={5} fill={CK.brass} />
    </g>
  );
}
