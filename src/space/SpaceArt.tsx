import type { Dir } from '../engine/dir';

/** Space world palette: a deep blue station, silver panels and bright capsules. */
export const SP = {
  space: '#141B33',
  spaceHi: '#1F2A4D',
  floor: '#2C3B66',
  floorAlt: '#293760',
  floorEdge: '#22305A',
  rivet: '#4A5C8E',
  frame: '#9AA8C7',
  frameDark: '#6C7AA0',
  frameHi: '#C9D3EA',
  panel: '#B9C3DA',
  panelDark: '#7F8BAA',
  hazard: '#F2C13A',
  rock: '#8C7B6E',
  rockDark: '#65564C',
  rockHi: '#B3A396',
  boost: '#FF9F43',
  boostDark: '#D9761C',
  ink: '#1E2440',
  glass: '#CDEFFF',
  glassHi: '#F4FCFF',
  star: '#FFF6D6',
} as const;

/** Capsule colours: red, blue, yellow, green. */
export const CAPSULE_COLORS = [
  { main: '#F0625A', dark: '#C2433C', hi: '#FF9A90' },
  { main: '#4C9BE8', dark: '#2F74B8', hi: '#93C8F6' },
  { main: '#F6C744', dark: '#C99A1F', hi: '#FFE38A' },
  { main: '#55BE73', dark: '#378A50', hi: '#94DFA8' },
];

/** Wormhole colours per pair. */
export const HOLE_COLORS = [
  { main: '#9B6BF0', glow: '#D9C6FF' },
  { main: '#2FC6B3', glow: '#B6F3EA' },
];

const STAR = 'M0 -12 L3.5 -4 L12 -3.7 L5.5 2 L7.5 10.5 L0 6 L-7.5 10.5 L-5.5 2 L-12 -3.7 L-3.5 -4 Z';
const MOON = 'M4 -12 A12 12 0 1 0 12 4 A9.5 9.5 0 1 1 4 -12 Z';
const HEART = 'M0 11 C-14 1 -12 -11 -5 -11 C-2 -11 0 -8 0 -6 C0 -8 2 -11 5 -11 C12 -11 14 1 0 11 Z';
const CLOVER = 'M0 -1 C-3 -12 -14 -10 -9 -1 C-14 8 -3 10 0 1 C3 10 14 8 9 -1 C14 -10 3 -12 0 -1 Z M-1 2 L-3 12 H3 L1 2 Z';

/** Each colour also has its own shape, so the pairs read without colour too. */
export const CAPSULE_MARKS = [STAR, MOON, HEART, CLOVER];

export function Mark({ capsule, fill, scale = 1 }: { capsule: number; fill: string; scale?: number }) {
  return <path d={CAPSULE_MARKS[capsule]} fill={fill} transform={scale === 1 ? undefined : `scale(${scale})`} />;
}

export function FloorTile({ seed }: { seed: number }) {
  return (
    <g>
      <rect x={-48} y={-48} width={96} height={96} rx={12} fill={seed > 0.5 ? SP.floor : SP.floorAlt} />
      <rect x={-48} y={42} width={96} height={6} rx={3} fill={SP.floorEdge} opacity={0.7} />
      <circle cx={-37} cy={-37} r={2.5} fill={SP.rivet} />
      <circle cx={37} cy={-37} r={2.5} fill={SP.rivet} />
      <circle cx={-37} cy={33} r={2.5} fill={SP.rivet} />
      <circle cx={37} cy={33} r={2.5} fill={SP.rivet} />
    </g>
  );
}

/** A station wall block or a floating asteroid. */
export function WallArt({ deco }: { deco: 'panel' | 'rock' }) {
  if (deco === 'rock') {
    return (
      <g>
        <ellipse cy={36} rx={34} ry={7} fill="rgba(0,0,0,0.25)" />
        <path d="M-36 4 C-38 -22 -16 -38 6 -36 C30 -34 40 -12 36 10 C32 32 10 40 -10 36 C-28 32 -35 22 -36 4 Z" fill={SP.rockDark} />
        <path d="M-36 0 C-38 -24 -16 -40 6 -38 C30 -36 40 -14 36 6 C32 26 10 34 -10 30 C-28 26 -35 16 -36 0 Z" fill={SP.rock} />
        <circle cx={-12} cy={-14} r={9} fill={SP.rockDark} opacity={0.7} />
        <circle cx={14} cy={8} r={6} fill={SP.rockDark} opacity={0.7} />
        <circle cx={-14} cy={14} r={4} fill={SP.rockDark} opacity={0.6} />
        <path d="M-20 -26 Q-4 -34 12 -30" stroke={SP.rockHi} strokeWidth={4} fill="none" strokeLinecap="round" />
      </g>
    );
  }
  return (
    <g>
      <rect x={-46} y={-42} width={92} height={90} rx={14} fill={SP.panelDark} />
      <rect x={-46} y={-46} width={92} height={86} rx={14} fill={SP.panel} />
      <rect x={-36} y={-36} width={72} height={18} rx={6} fill={SP.hazard} />
      <g stroke={SP.ink} strokeWidth={6} opacity={0.75}>
        {[-26, -10, 6, 22].map((x) => (
          <path key={x} d={`M${x} -36 L${x + 10} -18`} />
        ))}
      </g>
      <rect x={-30} y={-6} width={60} height={34} rx={8} fill={SP.frameDark} opacity={0.5} />
      <circle cx={-18} cy={11} r={5} fill={SP.frameHi} />
      <circle cx={0} cy={11} r={5} fill="#7BE0A5" />
      <circle cx={18} cy={11} r={5} fill={SP.frameHi} />
    </g>
  );
}

/** A docking ring in a capsule's colour, with its shape in the middle; lit while its capsule is home. */
export function DockArt({ capsule, lit }: { capsule: number; lit: boolean }) {
  const c = CAPSULE_COLORS[capsule];
  return (
    <g>
      {lit && <circle r={46} fill={c.hi} opacity={0.45} className="space-dock-glow" />}
      <circle r={38} fill={SP.floorEdge} />
      <circle r={36} fill="none" stroke={c.main} strokeWidth={8} strokeDasharray="14 8" />
      <circle r={24} fill={c.main} opacity={0.3} />
      <Mark capsule={capsule} fill={c.main} scale={1.2} />
    </g>
  );
}

/** A booster pad: chevrons pointing the way it pushes. */
export function PadArt({ dir }: { dir: Dir }) {
  return (
    <g transform={`rotate(${dir * 90})`}>
      <rect x={-40} y={-40} width={80} height={80} rx={18} fill={SP.boostDark} />
      <rect x={-40} y={-42} width={80} height={78} rx={18} fill={SP.boost} />
      <g className="space-pad-chevrons" fill="none" stroke="#fff" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round">
        <path d="M-18 4 L0 -14 L18 4" />
        <path d="M-18 24 L0 6 L18 24" opacity={0.6} />
      </g>
    </g>
  );
}

/** One end of a wormhole: a swirl in its pair's colour. */
export function HoleArt({ pair }: { pair: number }) {
  const c = HOLE_COLORS[pair % HOLE_COLORS.length];
  return (
    <g>
      <circle r={42} fill={c.glow} opacity={0.35} />
      <circle r={36} fill={SP.space} />
      <g className="space-swirl">
        {[0, 120, 240].map((a) => (
          <path key={a} d="M0 0 C10 -8 24 -6 30 6" stroke={c.main} strokeWidth={7} fill="none" strokeLinecap="round" transform={`rotate(${a})`} />
        ))}
      </g>
      <circle r={36} fill="none" stroke={c.main} strokeWidth={5} />
      <circle r={7} fill={c.glow} />
    </g>
  );
}

/** A round capsule with a porthole and a little astronaut, centred on (0,0). */
export function CapsuleArt({ capsule, docked = false }: { capsule: number; docked?: boolean }) {
  const c = CAPSULE_COLORS[capsule];
  return (
    <g>
      <ellipse cy={40} rx={30} ry={7} fill="rgba(0,0,0,0.3)" />
      {/* Fins */}
      <path d="M-30 18 L-42 36 L-20 30 Z M30 18 L42 36 L20 30 Z" fill={c.dark} />
      <circle r={38} fill={c.dark} />
      <circle r={38} cy={-3} fill={c.main} />
      <path d="M-26 -24 A34 34 0 0 1 10 -36" stroke={c.hi} strokeWidth={6} fill="none" strokeLinecap="round" />
      {/* Antenna */}
      <path d="M0 -40 V-50" stroke={SP.ink} strokeWidth={4} strokeLinecap="round" />
      <circle cy={-52} r={5} fill={docked ? '#7BE0A5' : c.hi} />
      {/* Porthole and its passenger */}
      <circle cy={-6} r={21} fill={SP.frameHi} />
      <circle cy={-6} r={17} fill={SP.glass} />
      <circle cx={0} cy={-3} r={11} fill="#FFE2C6" />
      <circle cx={-4} cy={-5} r={2} fill={SP.ink} />
      <circle cx={4} cy={-5} r={2} fill={SP.ink} />
      <path d={docked ? 'M-4 0 Q0 5 4 0' : 'M-3 1 Q0 3 3 1'} stroke={SP.ink} strokeWidth={2} fill="none" strokeLinecap="round" />
      <path d="M-10 -16 Q-4 -22 4 -20" stroke={SP.glassHi} strokeWidth={3.5} fill="none" strokeLinecap="round" />
      {/* Its shape on the hull */}
      <g transform="translate(0 24) scale(0.62)">
        <Mark capsule={capsule} fill="#fff" />
      </g>
    </g>
  );
}

/** A little star-field behind the station, from a fixed pattern. */
export function StarField({ width, height }: { width: number; height: number }) {
  const stars = Array.from({ length: Math.round((width * height) / 9000) }, (_, k) => {
    const h = (n: number) => {
      const s = Math.sin(n * 91.7 + k * 12.9898) * 43758.5453;
      return s - Math.floor(s);
    };
    return { x: h(1) * width, y: h(2) * height, r: 1.5 + h(3) * 2.5, d: h(4) * 3 };
  });
  return (
    <g>
      {stars.map((s, k) => (
        <circle key={k} cx={s.x} cy={s.y} r={s.r} fill={SP.star} className="space-twinkle" style={{ animationDelay: `${s.d}s` }} />
      ))}
    </g>
  );
}
