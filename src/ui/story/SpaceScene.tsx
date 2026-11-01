import { CapsuleArt, DockArt, SP, StarField } from '../../space/SpaceArt';
import { type SceneProps, Bye, Gift, Platform, Pop, Rail, RideTrain, SCENE_H, SCENE_W, Sparkle, TRACK_Y, useAlreadyHere, useCues, useSteps } from './kit';

/** The docking deck: 5 × 3 cells of 56. */
const GX = 256;
const GY = 26;
const CELL = 56;
const at = (col: number, row: number) => ({ x: GX + (col + 0.5) * CELL, y: GY + (row + 0.5) * CELL });
const DOCKS = [
  [2, 2],
  [3, 2],
  [4, 2],
] as const;
/** Where capsules 0, 1, 2 are: at the start, after gravity down, after gravity right. */
const SPOTS = [
  [
    [0, 0],
    [2, 0],
    [3, 1],
  ],
  [
    [0, 2],
    [2, 2],
    [3, 2],
  ],
  [
    [2, 2],
    [3, 2],
    [4, 2],
  ],
] as const;

/** A ringed planet. */
function Planet({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={26} fill="#E88C5A" />
      <path d="M-24 -6 Q0 -14 24 -6 M-25 6 Q0 -2 25 6" stroke="#F4B37E" strokeWidth={5} fill="none" opacity={0.7} />
      <ellipse rx={44} ry={11} fill="none" stroke="#F2D39A" strokeWidth={4} transform="rotate(-16)" />
    </g>
  );
}

/** The big gravity arrow over the deck. */
function Gravity({ dir }: { dir: 'down' | 'right' }) {
  return (
    <g transform={`translate(${GX + CELL * 2.5} ${GY + CELL * 1.5}) rotate(${dir === 'down' ? 90 : 0})`}>
      <g className="ss-mark">
        <path d="M-46 -14 H10 V-34 L50 0 L10 34 V14 H-46 Z" fill="#9B6BF0" opacity={0.55} stroke="#C9B2FF" strokeWidth={4} strokeLinejoin="round" className="ss-blink" />
      </g>
    </g>
  );
}

/** Deep space: stars, a ringed planet, shooting stars. */
function Sky() {
  return (
    <g>
        <rect width={SCENE_W} height={SCENE_H} rx={24} fill={SP.space} />
        <StarField width={SCENE_W} height={SCENE_H} />
        <Planet x={76} y={64} />
        <path d="M0 0 L46 16" stroke="#FFF6D6" strokeWidth={3} strokeLinecap="round" className="ss-shoot" />
        <path d="M0 0 L36 12" stroke="#CDEFFF" strokeWidth={2.5} strokeLinecap="round" className="ss-shoot" style={{ animationDelay: '2.6s' }} />
    </g>
  );
}

/** The docking deck and its three docks. */
function Deck({ lit }: { lit: boolean }) {
  return (
    <g>
        {/* The docking deck. */}
        <rect x={GX - 8} y={GY - 8} width={CELL * 5 + 16} height={CELL * 3 + 16} rx={16} fill={SP.frameDark} />
        <rect x={GX - 4} y={GY - 4} width={CELL * 5 + 8} height={CELL * 3 + 8} rx={13} fill={SP.floorEdge} />
        {Array.from({ length: 15 }, (_, i) => (
          <rect key={i} x={GX + (i % 5) * CELL + 1} y={GY + Math.floor(i / 5) * CELL + 1} width={CELL - 2} height={CELL - 2} rx={8} fill={(i + Math.floor(i / 5)) % 2 ? SP.floorAlt : SP.floor} />
        ))}
        {DOCKS.map(([c, r], i) => (
          <g key={i} transform={`translate(${at(c, r).x} ${at(c, r).y}) scale(0.62)`}>
            <DockArt capsule={i} lit={lit} />
          </g>
        ))}
    </g>
  );
}

const TIMES = [[], [200, 650, 1300], [200, 650, 1300, 1600]];
const CUES = [undefined, [[200, 'swish'], [650, 'slide'], [1300, 'bump']], [[200, 'swish'], [650, 'slide'], [1300, 'pickup'], [1500, 'pickup'], [1700, 'star3']]] as const;

/**
 * 우주 정거장: the starlight line runs right out into space, past a ringed planet, with shooting
 * stars. A gravity arrow appears and all three capsules fall down together; another, and they
 * all slide right, each into its own dock, which lights up.
 */
export function SpaceScene({ beat, arrived, hurry, onArrive }: SceneProps) {
  const key = arrived ? beat : -1;
  const step = useSteps(key, TIMES[beat] ?? []);
  useCues(key, CUES[beat]);
  const phase = beat === 0 ? 0 : beat === 1 ? (step >= 2 ? 1 : 0) : step >= 2 ? 2 : 1;
  const docked = beat === 2 && step >= 3;

  return (
    <g>
      <Sky />
      <Deck lit={docked} />
      {beat === 1 && step >= 1 && <Gravity dir="down" />}
      {beat === 2 && step >= 1 && step < 3 && <Gravity dir="right" />}
      {SPOTS[phase].map(([c, r], i) => (
        <g key={i} className="ss-fall" style={{ transform: `translate(${at(c, r).x}px, ${at(c, r).y}px)` }}>
          <g transform="scale(0.6)">
            <CapsuleArt capsule={i} docked={docked} />
          </g>
        </g>
      ))}
      {docked && DOCKS.map(([c, r], i) => <Sparkle key={i} x={at(c, r).x} y={at(c, r).y - 20} color="#94DFA8" delay={i * 200} />)}

      <Platform x={28} w={212} fill="#E6E9F7" edge="#A9B0D6" />
      <Rail a={[-100, TRACK_Y]} b={[660, TRACK_Y]} tint="#3B4886" />
      <RideTrain path={[[-90, TRACK_Y], [150, TRACK_Y]]} at={1} hurry={hurry} onReach={(i) => i === 1 && onArrive()} />
      {arrived && (
        <Pop x={196} y={150} s={0.62}>
          <g className="ss-float">
            <CapsuleArt capsule={3} docked={beat === 2} />
          </g>
        </Pop>
      )}
    </g>
  );
}

/** A firework bursting in space, again and again. */
function Firework({ x, y, color, delay }: { x: number; y: number; color: string; delay: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {Array.from({ length: 8 }, (_, k) => (
        <g key={k} transform={`rotate(${k * 45})`}>
          <circle cy={-4} r={3} fill={color} className="ss-burst" style={{ animationDelay: `${delay}ms` }} />
        </g>
      ))}
    </g>
  );
}

/** A five-pointed star piece, glowing. */
function StarPiece() {
  return (
    <g>
      <circle r={16} fill="#FFE38A" opacity={0.35} />
      <path d="M0 -13 L3.8 -4 L13 -4 L5.6 2 L8.4 11 L0 5.6 L-8.4 11 L-5.6 2 L-13 -4 L-3.8 -4 Z" fill="#FFD34E" stroke="#F6A623" strokeWidth={1.5} strokeLinejoin="round" />
    </g>
  );
}

const RAMP: readonly [number, number][] = [
  [470, TRACK_Y],
  [720, 150],
];
const BYE_TIMES = [[200], [150, 1300], [300]];
const BYE_CUES = [[[200, 'pop'], [900, 'pop']], [[150, 'swish'], [1300, 'star3']], [[300, 'depart'], [800, 'thanks']]] as const;

/**
 * 우주 정거장 farewell: every capsule sits in its lit dock and fireworks burst over the deck.
 * The astronaut floats a glowing star piece over to the train; then the starlight line curves up
 * into the sky, and the train rides it away.
 */
export function SpaceFarewell({ beat, arrived, onArrive }: SceneProps) {
  useAlreadyHere(onArrive);
  const key = arrived ? beat : -1;
  const step = useSteps(key, BYE_TIMES[beat] ?? []);
  useCues(key, BYE_CUES[beat]);
  const gone = beat === 2 && step >= 1;
  return (
    <g>
      <Sky />
      <Deck lit />
      {SPOTS[2].map(([c, r], i) => (
        <g key={i} transform={`translate(${at(c, r).x} ${at(c, r).y}) scale(0.6)`}>
          <CapsuleArt capsule={i} docked />
        </g>
      ))}
      {(beat > 0 || step >= 1) && (
        <>
          <Firework x={330} y={70} color="#FF9A90" delay={0} />
          <Firework x={470} y={54} color="#93C8F6" delay={500} />
          <Firework x={400} y={110} color="#FFE38A" delay={1000} />
        </>
      )}
      <Platform x={28} w={212} fill="#E6E9F7" edge="#A9B0D6" />
      <Rail a={[-100, TRACK_Y]} b={[RAMP[0][0], TRACK_Y]} tint="#3B4886" />
      <g className="ss-glow-rail">
        <Rail a={RAMP[0]} b={RAMP[1]} tint="#5B4FD1" />
      </g>
      {[0.25, 0.55, 0.85].map((t, i) => (
        <circle key={t} cx={RAMP[0][0] + (RAMP[1][0] - RAMP[0][0]) * t} cy={RAMP[0][1] + (RAMP[1][1] - RAMP[0][1]) * t - 30} r={3} fill="#FFF6D6" className="space-twinkle" style={{ animationDelay: `${i * 0.4}s` }} />
      ))}
      <RideTrain path={[[-90, TRACK_Y], [150, TRACK_Y], RAMP[0], RAMP[1]]} start={1} at={gone ? 3 : 1} ms={[2300, 0, 3200]} />
      <Pop x={196} y={150} s={0.62}>
        <g className="ss-float">
          <CapsuleArt capsule={3} docked />
        </g>
      </Pop>
      {beat === 1 && (
        <Gift from={[196, 128]} to={[156, 250]}>
          <StarPiece />
        </Gift>
      )}
      {beat === 1 && step >= 2 && <Sparkle x={156} y={248} />}
      {beat === 2 && <Bye x={196} y={96} color="#55BE73" text="안녕~" />}
    </g>
  );
}
