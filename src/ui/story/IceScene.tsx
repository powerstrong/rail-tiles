import { FishArt, HoleArt, ICE, PenguinArt, RockArt, SnowArt } from '../../penguin/IceArt';
import { type SceneProps, Mark, Platform, Rail, RideTrain, SCENE_H, SCENE_W, Sparkle, TRACK_Y, useCues, useSteps } from './kit';

/** Lane cells, 70 apart: snowman, (penguin), …, hole, rock. */
const LANE_Y = 100;
const SNOWMAN = 70;
const HOLE = 350;
const ROCK = 490;
const NEW_ROCK = 280;
const PINK = '#EC6A8E';

const FLAKES = Array.from({ length: 18 }, (_, i) => ({
  x: (i * 131 + 17) % 560,
  delay: -((i * 977) % 5200),
  dur: 4200 + ((i * 613) % 2400),
  r: 2.2 + ((i * 7) % 3) * 0.8,
}));

/** A snowy pine tree. */
function Pine({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cy={30} rx={20} ry={5} fill={ICE.shadow} />
      <rect x={-4} y={18} width={8} height={12} rx={2} fill="#8C5E3C" />
      <path d="M0 -34 L22 0 H-22 Z M0 -16 L26 22 H-26 Z" fill="#3E8A6A" />
      <path d="M0 -34 L8 -22 Q0 -18 -8 -22 Z M0 -16 L9 -3 Q0 1 -9 -3 Z" fill="#fff" />
    </g>
  );
}

const TIMES = [[150, 1100], [200, 1150], [200, 900, 1800]];
const CUES = [
  [[150, 'slide'], [1100, 'bump']],
  [[200, 'slide'], [1150, 'bump']],
  [[200, 'place'], [900, 'slide'], [1800, 'splash'], [2150, 'pickup']],
] as const;

/**
 * 펭귄 얼음 나라: snow falls on the station. The pink penguin belly-slides in and bumps the
 * snowman; it tries for its fishing hole but shoots right past and thumps a rock; then a rock
 * lands just past the hole, and this time it stops right on it and a fish pops up.
 */
export function IceScene({ beat, arrived, hurry, onArrive }: SceneProps) {
  const key = arrived ? beat : -1;
  const step = useSteps(key, TIMES[beat] ?? []);
  useCues(key, CUES[beat]);

  // Where the penguin is, and whether it is on the move.
  let px = 620;
  let sliding = false;
  if (beat === 0 && arrived) {
    px = step >= 1 ? SNOWMAN + 70 : 620;
    sliding = step === 1;
  } else if (beat === 1) {
    px = step >= 1 ? ROCK - 70 : SNOWMAN + 70;
    sliding = step === 1;
  } else if (beat === 2) {
    px = step >= 2 ? HOLE : ROCK - 70;
    sliding = step === 2;
  }
  const dir = beat === 2 ? -1 : beat === 1 ? 1 : -1;
  const fished = beat === 2 && step >= 3;

  return (
    <g>
      <rect width={SCENE_W} height={SCENE_H} rx={24} fill="#DCEFF9" />
      <Pine x={34} y={34} s={0.9} />
      <Pine x={528} y={40} />
      <g transform="translate(190 32) scale(0.5)">
        <SnowArt />
      </g>
      <g transform="translate(430 30) scale(0.42)">
        <SnowArt />
      </g>

      {/* The ice lane, one row of tiles. */}
      <rect x={30} y={LANE_Y - 41} width={500} height={82} rx={16} fill={ICE.iceEdge} />
      {Array.from({ length: 7 }, (_, i) => (
        <rect key={i} x={37 + i * 70} y={LANE_Y - 35} width={66} height={70} rx={10} fill={i % 2 ? ICE.iceAlt : ICE.ice} />
      ))}
      <path d={`M60 ${LANE_Y - 20} l14 -6 M300 ${LANE_Y + 22} l18 -5 M450 ${LANE_Y - 22} l12 5`} stroke={ICE.iceHi} strokeWidth={4} strokeLinecap="round" />
      <g transform={`translate(${HOLE} ${LANE_Y + 6}) scale(0.72)`}>
        <HoleArt color={PINK} done={fished} />
      </g>
      <g transform={`translate(${SNOWMAN} ${LANE_Y - 4}) scale(0.62)`}>
        <g key={beat === 0 && step >= 2 ? 'hit' : 'still'} className={beat === 0 && step >= 2 ? 'ss-shake' : undefined}>
          <RockArt snowman />
        </g>
      </g>
      <g transform={`translate(${ROCK} ${LANE_Y - 2}) scale(0.62)`}>
        <g key={beat === 1 && step >= 2 ? 'hit' : 'still'} className={beat === 1 && step >= 2 ? 'ss-shake' : undefined}>
          <RockArt snowman={false} />
        </g>
      </g>
      {beat === 2 && step >= 1 && (
        <g transform={`translate(${NEW_ROCK} ${LANE_Y - 2}) scale(0.62)`}>
          <g className="ss-drop">
            <circle r={44} fill="none" stroke="#F6C443" strokeWidth={6} className="ss-blink" />
            <RockArt snowman={false} />
          </g>
        </g>
      )}

      {/* The penguin: belly-slides along the lane, trailing whooshes. */}
      <g transform={`translate(0 ${LANE_Y - 8})`}>
        <g className="ss-glide" style={{ transform: `translateX(${px}px)` }}>
          {sliding && (
            <g className="ss-trail" transform={`scale(${-dir} 1)`}>
              <path d="M26 -6 H52 M30 6 H60 M24 18 H44" stroke="#fff" strokeWidth={5} strokeLinecap="round" />
            </g>
          )}
          <g transform="scale(0.62)">
            <g className={sliding ? 'ss-lean' : undefined} style={{ ['--lean' as string]: `${dir * -10}deg` }}>
              <PenguinArt color={PINK} cheer={fished} />
            </g>
          </g>
        </g>
      </g>
      {beat === 1 && step >= 2 && <Mark x={ROCK - 70} y={LANE_Y - 50} text="!" color={PINK} />}
      {fished && (
        <>
          <g transform={`translate(${HOLE + 4} ${LANE_Y})`}>
            <g className="ss-fish">
              <g transform="scale(0.8)">
                <FishArt />
              </g>
            </g>
          </g>
          <Mark x={HOLE} y={LANE_Y - 52} text="♥" color={PINK} delay={700} />
          <Sparkle x={HOLE} y={LANE_Y} color="#9FD6F2" delay={200} />
        </>
      )}

      <Platform x={300} w={240} fill="#FFFFFF" edge={ICE.snowShade} />
      <g transform="translate(90 214) scale(0.55)">
        <SnowArt />
      </g>
      <Rail a={[-100, TRACK_Y]} b={[660, TRACK_Y]} tint="#F7FBFF" />
      <RideTrain path={[[-90, TRACK_Y], [418, TRACK_Y]]} at={1} hurry={hurry} onReach={(i) => i === 1 && onArrive()} />

      {/* Snow falling over everything. */}
      {FLAKES.map((f, i) => (
        <circle key={i} cx={f.x} cy={-10} r={f.r} fill="#fff" className="ss-snow" style={{ animationDelay: `${f.delay}ms`, animationDuration: `${f.dur}ms` }} />
      ))}
    </g>
  );
}
