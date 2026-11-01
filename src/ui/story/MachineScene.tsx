import { BEAM, BulbArt, LaserArt, MC, MirrorArt, RobotArt } from '../../machine/MachineArt';
import { type SceneProps, Bye, Confetti, Gift, Mark, Platform, Pop, Rail, RideTrain, SCENE_H, SCENE_W, Sparkle, TRACK_Y, useAlreadyHere, useCues, useSteps, useTicker } from './kit';

const LASER = { x: 52, y: 62 };
const M1 = { x: 236, y: 62 };
const M2 = { x: 236, y: 166 };
const BULBS = [330, 410, 490];
const BELT = { x: 300, y: 26, w: 236, h: 44 };

/** A crate riding the conveyor belt. */
function Crate({ x, color }: { x: number; color: string }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <rect x={-13} y={-13} width={26} height={24} rx={4} fill={color} />
      <path d="M-13 -4 H13" stroke="rgba(0,0,0,0.2)" strokeWidth={3} />
      <circle cy={4} r={4} fill="rgba(255,255,255,0.5)" />
    </g>
  );
}

/** A beam that draws itself from start to end. */
function Beam({ d, delay = 0 }: { d: string; delay?: number }) {
  return (
    <g>
      <path d={d} stroke={BEAM.white} strokeWidth={14} strokeLinecap="round" fill="none" opacity={0.3} pathLength={1} className="ss-beam" style={{ animationDelay: `${delay}ms` }} />
      <path d={d} stroke={BEAM.white} strokeWidth={6} strokeLinecap="round" fill="none" pathLength={1} className="ss-beam" style={{ animationDelay: `${delay}ms` }} />
      <path d={d} stroke="#fff" strokeWidth={2} strokeLinecap="round" fill="none" pathLength={1} className="ss-beam" style={{ animationDelay: `${delay}ms` }} />
    </g>
  );
}

/** The factory floor, in checker tiles. */
function Floor() {
  return (
    <g>
        <rect width={SCENE_W} height={SCENE_H} rx={24} fill={MC.floor} />
        {Array.from({ length: 14 * 8 }, (_, i) => {
          const x = (i % 14) * 40;
          const y = Math.floor(i / 14) * 40;
          return (i % 14) % 2 === Math.floor(i / 14) % 2 ? <rect key={i} x={x} y={y} width={40} height={40} fill={MC.floorAlt} /> : null;
        })}
    </g>
  );
}

/** Conveyor belt: stops when the power does. */
function Belt({ paused }: { paused: boolean }) {
  return (
    <g>
        {/* Conveyor belt: stops when the power does. */}
        <g transform={`translate(${BELT.x} ${BELT.y})`}>
          <rect width={BELT.w} height={BELT.h} rx={10} fill={MC.steelDark} />
          <rect x={6} y={6} width={BELT.w - 12} height={BELT.h - 12} rx={6} fill="#2A3045" />
          <clipPath id="ss-belt-clip">
            <rect x={6} y={6} width={BELT.w - 12} height={BELT.h - 12} rx={6} />
          </clipPath>
          <g clipPath="url(#ss-belt-clip)">
            <g className="ss-belt" style={{ animationPlayState: paused ? 'paused' : 'running' }} transform={`translate(0 ${BELT.h / 2})`}>
              {[-60, 0, 60, 120, 180, 240].map((x, i) => (
                <Crate key={x} x={x + 20} color={['#E3AE1F', '#4FB0FF', '#FF7A6A'][i % 3]} />
              ))}
            </g>
          </g>
          {[14, BELT.w - 14].map((x) => (
            <circle key={x} cx={x} cy={BELT.h / 2} r={9} fill={MC.frameHi} stroke={MC.steelDark} strokeWidth={3} />
          ))}
        </g>
    </g>
  );
}

const TIMES = [[450], [150, 1000], [200, 800, 1250, 1650, 1950, 2200, 2450]];
const CUES = [
  [[450, 'pickup']],
  [[150, 'swish'], [1000, 'deny']],
  [[200, 'swish'], [800, 'rotate'], [1950, 'pickup'], [2200, 'pickup'], [2450, 'star3']],
] as const;

/**
 * 로봇 공장: crates ride the belt and the robot boots up with a beep. Then the power goes: the
 * bulbs flicker out, the floor goes dark and the belt stops. The laser fires, bounces the wrong
 * way off a mirror, the mirror turns, and the beam runs down and across, lighting each bulb.
 */
export function MachineScene({ beat, arrived, hurry, onArrive }: SceneProps) {
  const key = arrived ? beat : -1;
  const step = useSteps(key, TIMES[beat] ?? []);
  useCues(key, CUES[beat]);

  const dark = (beat === 1 && step >= 2) || (beat === 2 && step < 7);
  const lit = (i: number) => (beat === 0 ? true : beat === 1 ? step < 2 : step >= 5 + i);
  const mood = !arrived || (beat === 0 && step < 1) ? 'sleep' : dark ? 'worried' : 'happy';
  const turned = beat === 2 && step >= 2;

  return (
    <g>
      <Floor />
      <Belt paused={dark} />

      {/* Lights out. */}
      <rect width={SCENE_W} height={SCENE_H} rx={24} fill="#0E1222" className="ss-dark" style={{ opacity: dark ? 0.55 : 0 }} />

      <g transform={`translate(${LASER.x} ${LASER.y}) scale(0.5)`}>
        <LaserArt dir={1} color="white" />
      </g>
      {beat === 2 && step >= 1 && <Beam d={`M${LASER.x + 24} ${M1.y} H${M1.x}`} />}
      {beat === 2 && step === 1 && <Beam d={`M${M1.x} ${M1.y} V2`} delay={300} />}
      {beat === 2 && step >= 3 && <Beam d={`M${M1.x} ${M1.y} V${M2.y}`} />}
      {beat === 2 && step >= 4 && <Beam d={`M${M2.x} ${M2.y} H548`} />}
      <g transform={`translate(${M1.x} ${M1.y}) scale(0.5)`}>
        <MirrorArt startBack={false} spin={turned ? 1 : 0} fixed={false} half={false} hint={beat === 2 && step === 1} />
      </g>
      <g transform={`translate(${M2.x} ${M2.y}) scale(0.5)`}>
        <MirrorArt startBack spin={0} fixed half={false} hint={false} />
      </g>
      {BULBS.map((x, i) => (
        <g key={x} transform={`translate(${x} ${M2.y - 2}) scale(0.55)`}>
          <g className={beat === 1 && step === 1 ? 'ss-flicker' : undefined} style={{ animationDelay: `${i * 90}ms` }}>
            <BulbArt need="any" lit={lit(i)} />
          </g>
        </g>
      ))}
      {beat === 2 && step >= 7 && BULBS.map((x, i) => <Sparkle key={x} x={x} y={M2.y - 20} delay={i * 120} />)}

      <Platform x={28} w={210} />
      <Rail a={[-100, TRACK_Y]} b={[660, TRACK_Y]} tint="#C9CFDB" />
      <RideTrain path={[[-90, TRACK_Y], [170, TRACK_Y]]} at={1} hurry={hurry} onReach={(i) => i === 1 && onArrive()} />
      {arrived && (
        <Pop x={78} y={192} s={0.75}>
          <RobotArt mood={mood} />
        </Pop>
      )}
      {beat === 1 && step >= 2 && <Mark x={78} y={128} text="!" color="#FF5468" />}
    </g>
  );
}

const PARTY = ['any', 'red', 'blue'] as const;
const BYE_TIMES = [[300], [100, 1300], [300]];
const BYE_CUES = [[[300, 'star3']], [[100, 'swish'], [1300, 'pickup']], [[300, 'depart'], [700, 'thanks']]] as const;

/**
 * 로봇 공장 farewell: every light is on and the belt hums; the bulbs flash party colours; the
 * robot sends a little lit bulb over onto the train as a keepsake; then it beeps goodbye.
 */
export function MachineFarewell({ beat, arrived, onArrive }: SceneProps) {
  useAlreadyHere(onArrive);
  const key = arrived ? beat : -1;
  const step = useSteps(key, BYE_TIMES[beat] ?? []);
  useCues(key, BYE_CUES[beat]);
  const party = useTicker(arrived && (beat > 0 || step >= 1), 450);
  const gone = beat === 2 && step >= 1;
  return (
    <g>
      <Floor />
      <Belt paused={false} />
      <g transform={`translate(${LASER.x} ${LASER.y}) scale(0.5)`}>
        <LaserArt dir={1} color="white" />
      </g>
      <Beam d={`M${LASER.x + 24} ${M1.y} H${M1.x} V${M2.y} H548`} />
      <g transform={`translate(${M1.x} ${M1.y}) scale(0.5)`}>
        <MirrorArt startBack={false} spin={1} fixed={false} half={false} hint={false} />
      </g>
      <g transform={`translate(${M2.x} ${M2.y}) scale(0.5)`}>
        <MirrorArt startBack spin={0} fixed half={false} hint={false} />
      </g>
      {BULBS.map((x, i) => (
        <g key={x} transform={`translate(${x} ${M2.y - 2}) scale(0.55)`}>
          <BulbArt need={party ? PARTY[(party + i) % 3] : 'any'} lit />
        </g>
      ))}
      <Platform x={28} w={210} />
      <Rail a={[-100, TRACK_Y]} b={[660, TRACK_Y]} tint="#C9CFDB" />
      <RideTrain path={[[-90, TRACK_Y], [170, TRACK_Y], [720, TRACK_Y]]} start={1} at={gone ? 2 : 1} ms={[2300, 2600]} />
      <Pop x={78} y={192} s={0.75}>
        <g className={beat === 2 ? 'ss-hop' : undefined} style={{ animationIterationCount: 'infinite' }}>
          <RobotArt mood="happy" />
        </g>
      </Pop>
      {beat === 1 && (
        <Gift from={[78, 140]} to={[176, 250]}>
          <g transform="scale(0.5)">
            <BulbArt need="any" lit />
          </g>
        </Gift>
      )}
      {beat === 1 && step >= 2 && <Sparkle x={176} y={248} />}
      {beat === 0 && step >= 1 && BULBS.map((x, i) => <Sparkle key={x} x={x} y={M2.y - 20} delay={i * 150} />)}
      {beat === 2 && <Bye x={78} y={128} color="#4FB0FF" text="삐빅 안녕!" />}
      <Confetti count={16} />
    </g>
  );
}
