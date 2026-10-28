import type { Dir } from '../engine/dir';
import type { Color } from './model';

export const MC = {
  floor: '#36405A',
  floorAlt: '#323B53',
  bolt: '#4A5571',
  frame: '#56617C',
  frameDark: '#3C4459',
  frameHi: '#7C88A6',
  wall: '#8A94A6',
  wallDark: '#6F7A8E',
  steel: '#59647D',
  steelDark: '#3F4860',
  glass: '#E6F1FF',
  glassEdge: '#8FB6E8',
  half: '#9FE7FF',
  bulbOff: '#4E5870',
  ink: '#2E3445',
  hazard: '#F6C443',
} as const;

/** Beam and bulb colours. */
export const BEAM: Record<Color, string> = { white: '#FFE45C', red: '#FF5468', blue: '#4FB0FF' };
export const NEED_COLOR = { any: '#FFE45C', red: '#FF5468', blue: '#4FB0FF', purple: '#B57CFF' } as const;

export function FloorTile({ alt }: { alt: boolean }) {
  return (
    <g>
      <rect x={-47} y={-47} width={94} height={94} rx={12} fill={alt ? MC.floorAlt : MC.floor} />
      {[
        [-36, -36],
        [36, -36],
        [-36, 36],
        [36, 36],
      ].map(([x, y]) => (
        <circle key={`${x},${y}`} cx={x} cy={y} r={3.5} fill={MC.bolt} />
      ))}
    </g>
  );
}

export function WallArt() {
  return (
    <g>
      <rect x={-42} y={-38} width={84} height={84} rx={10} fill={MC.wallDark} />
      <rect x={-42} y={-44} width={84} height={82} rx={10} fill={MC.wall} />
      <path d="M-30 -32 L30 26 M30 -32 L-30 26" stroke={MC.wallDark} strokeWidth={8} strokeLinecap="round" />
      <rect x={-42} y={-44} width={84} height={82} rx={10} fill="none" stroke={MC.wallDark} strokeWidth={4} />
    </g>
  );
}

export function LaserArt({ dir, color }: { dir: Dir; color: Color }) {
  return (
    <g transform={`rotate(${dir * 90})`}>
      <rect x={-32} y={-26} width={64} height={60} rx={12} fill={MC.steelDark} />
      <rect x={-32} y={-30} width={64} height={60} rx={12} fill={MC.steel} />
      <rect x={-14} y={-48} width={28} height={24} rx={6} fill={MC.steelDark} />
      <circle cy={-44} r={11} fill={BEAM[color]} className="laser-lens" />
      <circle cy={4} r={9} fill={MC.steelDark} />
      <circle cy={4} r={4} fill={BEAM[color]} />
    </g>
  );
}

/** A mirror on a turntable (or bolted down). `spin` counts taps so each one turns it a further 90°. */
export function MirrorArt({ startBack, spin, fixed, half, hint }: { startBack: boolean; spin: number; fixed: boolean; half: boolean; hint: boolean }) {
  const angle = (startBack ? 45 : -45) + spin * 90;
  return (
    <g>
      {fixed ? (
        <g>
          <rect x={-34} y={-34} width={68} height={68} rx={10} fill={MC.steelDark} />
          {[
            [-26, -26],
            [26, -26],
            [-26, 26],
            [26, 26],
          ].map(([x, y]) => (
            <g key={`${x},${y}`} transform={`translate(${x} ${y})`}>
              <circle r={5} fill={MC.bolt} />
              <path d="M-3 0 H3" stroke={MC.steelDark} strokeWidth={1.6} />
            </g>
          ))}
        </g>
      ) : (
        <g>
          <circle r={36} fill={MC.steel} />
          <circle r={36} fill="none" stroke={MC.frameHi} strokeWidth={3} strokeDasharray="6 7" className={hint ? 'mirror-hint' : undefined} />
        </g>
      )}
      <g className="mirror-turn" style={{ transform: `rotate(${angle}deg)` }}>
        {half ? (
          <rect x={-40} y={-6} width={80} height={12} rx={6} fill={MC.half} opacity={0.75} stroke="#fff" strokeWidth={2} strokeDasharray="8 5" />
        ) : (
          <rect x={-40} y={-7} width={80} height={14} rx={7} fill={fixed ? '#C4CFDD' : MC.glass} stroke={MC.glassEdge} strokeWidth={3} />
        )}
      </g>
      {hint && <circle r={42} fill="none" stroke="#F6C443" strokeWidth={6} className="mirror-hint" />}
    </g>
  );
}

export function BulbArt({ need, lit }: { need: keyof typeof NEED_COLOR; lit: boolean }) {
  const c = NEED_COLOR[need];
  return (
    <g>
      {lit && <circle r={44} fill={c} opacity={0.22} className="bulb-glow" />}
      <rect x={-14} y={18} width={28} height={16} rx={4} fill={MC.steelDark} />
      <circle cy={-4} r={26} fill={lit ? c : MC.bulbOff} stroke={c} strokeWidth={5} />
      <path d="M-8 4 Q-4 -10 0 2 Q4 -10 8 4" stroke={lit ? '#fff' : '#8C96AE'} strokeWidth={3} fill="none" strokeLinecap="round" />
      {lit &&
        [0, 1, 2, 3, 4, 5, 6, 7].map((k) => (
          <path key={k} d="M0 -36 V-44" stroke={c} strokeWidth={4} strokeLinecap="round" transform={`translate(0 -4) rotate(${k * 45})`} />
        ))}
    </g>
  );
}

export function FilterArt({ color }: { color: 'red' | 'blue' }) {
  return (
    <g>
      <rect x={-30} y={-30} width={60} height={60} rx={8} fill={BEAM[color]} opacity={0.45} />
      <rect x={-30} y={-30} width={60} height={60} rx={8} fill="none" stroke={BEAM[color]} strokeWidth={5} />
      <path d="M-16 -14 L-4 -24 M-14 0 L6 -18" stroke="#fff" strokeWidth={4} strokeLinecap="round" opacity={0.7} />
    </g>
  );
}

export function SensorArt({ lit }: { lit: boolean }) {
  return (
    <g>
      <rect x={-30} y={-30} width={60} height={60} rx={14} fill={MC.steelDark} />
      <path d="M-22 0 Q0 -20 22 0 Q0 20 -22 0 Z" fill={lit ? '#7CF29A' : MC.bulbOff} stroke={lit ? '#B8FFC8' : '#8C96AE'} strokeWidth={3} />
      <circle r={7} fill={MC.ink} />
    </g>
  );
}

export function DoorArt({ open }: { open: boolean }) {
  return (
    <g>
      <rect x={-44} y={-44} width={88} height={88} rx={8} fill={MC.steelDark} />
      {/* The shutter rolls up into the top of the frame when the sensor sees light. */}
      <g className="door-shutter" style={{ transform: `scaleY(${open ? 0.12 : 1})` }}>
        <rect x={-40} y={-40} width={80} height={80} rx={6} fill={MC.hazard} />
        {[-24, -4, 16].map((y) => (
          <rect key={y} x={-40} y={y} width={80} height={8} fill={MC.ink} opacity={0.8} />
        ))}
      </g>
    </g>
  );
}

export function RobotArt({ mood }: { mood: 'worried' | 'happy' | 'sleep' }) {
  return (
    <g>
      <path d="M0 -44 V-30" stroke="#8C96AE" strokeWidth={4} />
      <circle cy={-48} r={6} fill={mood === 'happy' ? '#7CF29A' : mood === 'sleep' ? '#8C96AE' : '#FF5468'} className={mood === 'worried' ? 'robot-blink' : undefined} />
      <rect x={-34} y={-30} width={68} height={52} rx={16} fill="#D7DEEA" stroke="#9AA6BC" strokeWidth={4} />
      <rect x={-24} y={-20} width={48} height={30} rx={10} fill={MC.ink} />
      {mood === 'sleep' ? (
        <path d="M-15 -6 H-5 M5 -6 H15" stroke="#8C96AE" strokeWidth={4} strokeLinecap="round" />
      ) : (
        <>
          <circle cx={-10} cy={-6} r={5} fill={mood === 'happy' ? '#7CF29A' : '#4FB0FF'} />
          <circle cx={10} cy={-6} r={5} fill={mood === 'happy' ? '#7CF29A' : '#4FB0FF'} />
        </>
      )}
      <path d={mood === 'happy' ? 'M-8 3 Q0 9 8 3' : 'M-8 6 Q0 1 8 6'} stroke={mood === 'sleep' ? '#8C96AE' : '#fff'} strokeWidth={3} fill="none" strokeLinecap="round" />
      <rect x={-22} y={24} width={44} height={22} rx={8} fill="#B9C3D4" />
    </g>
  );
}
