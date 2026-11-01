import { DecorationArt } from '../art/SceneryArt';
import { type SceneProps, Mark, Platform, PersonArt, Pop, Rail, RideTrain, Rider, SCENE_H, SCENE_W, Sparkle, TRACK_Y, useCues, useSteps } from './kit';

const FLOWERS: [number, number, string][] = [
  [28, 150, '#F7B9A8'],
  [96, 140, '#FFF6E2'],
  [188, 34, '#F4C24F'],
  [250, 120, '#F7B9A8'],
  [318, 150, '#FFF6E2'],
  [352, 28, '#F7B9A8'],
  [282, 74, '#B9A8F7'],
  [440, 150, '#F4C24F'],
  [540, 150, '#B9A8F7'],
  [20, 40, '#FFF6E2'],
  [400, 128, '#F7B9A8'],
];

/** A little wildflower, swaying in the breeze. */
function Flower({ x, y, color, delay }: { x: number; y: number; color: string; delay: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className="ss-sway" style={{ animationDelay: `${delay}ms` }}>
        <path d="M0 10 Q-1 4 0 0" stroke="#6FA845" strokeWidth={2.5} fill="none" />
        {[0, 72, 144, 216, 288].map((a) => (
          <circle key={a} cx={0} cy={-6} r={4.2} fill={color} transform={`rotate(${a})`} />
        ))}
        <circle r={3.2} fill="#F4C24F" />
      </g>
    </g>
  );
}

const TIMES = [[], [], [250, 700, 1150, 3300]];
const CUES = [undefined, [[100, 'swish'], [380, 'swish']], [[250, 'place'], [700, 'place'], [1100, 'depart'], [3300, 'thanks']]] as const;

/**
 * 들꽃 기차 마을: the train pulls into a flowery village; past the station the line just stops,
 * and the passengers on the far side wonder how they will ever get a train. Two rails drop into
 * the gap, the train rolls across, and they cheer.
 */
export function TrainScene({ beat, arrived, hurry, onArrive }: SceneProps) {
  const key = arrived ? beat : -1;
  const step = useSteps(key, TIMES[beat] ?? []);
  useCues(key, CUES[beat]);
  const placed = beat < 2 ? 0 : Math.min(2, step);
  const across = beat === 2 && step >= 3;
  const cheer = beat === 2 && step >= 4;
  return (
    <g>
      <rect width={SCENE_W} height={SCENE_H} rx={24} fill="#C8E4A6" />
      <path d="M0 196 H560" stroke="#BEDD9B" strokeWidth={6} opacity={0.6} />
      {FLOWERS.map(([x, y, c], i) => (
        <Flower key={i} x={x} y={y} color={c} delay={i * 170} />
      ))}
      <g transform="translate(52 78) scale(1.8)">
        <DecorationArt deco="tree" seed={0.15} joins={[]} />
      </g>
      <g transform="translate(150 66) scale(1.1)">
        <DecorationArt deco="house" seed={0.4} joins={[]} />
      </g>
      <g transform="translate(436 70) scale(1.05)">
        <DecorationArt deco="house" seed={0.8} joins={[]} />
      </g>
      <g transform="translate(528 58) scale(1.5)">
        <DecorationArt deco="tree" seed={0.55} joins={[]} />
      </g>

      <Platform x={60} w={210} />
      <Platform x={466} w={92} />
      <Rail a={[-100, TRACK_Y]} b={[300, TRACK_Y]} />
      <Rail a={[460, TRACK_Y]} b={[660, TRACK_Y]} />
      {beat >= 1 && placed < 2 && <rect x={304} y={236} width={152} height={44} rx={10} fill="none" stroke="#8C6B4A" strokeWidth={3} strokeDasharray="9 7" className="ss-blink" />}
      {placed >= 1 && (
        <g className="ss-drop">
          <Rail a={[300, TRACK_Y]} b={[380, TRACK_Y]} />
        </g>
      )}
      {placed >= 2 && (
        <g className="ss-drop">
          <Rail a={[380, TRACK_Y]} b={[460, TRACK_Y]} />
        </g>
      )}

      <g transform="translate(492 196) scale(0.95)">
        <g className={cheer ? 'ss-hop' : undefined}>
          <Rider shirt="#E5584F" />
        </g>
      </g>
      <g transform="translate(532 198) scale(0.85)">
        <g className={cheer ? 'ss-hop' : undefined} style={{ animationDelay: '120ms' }}>
          <Rider shirt="#3F8BD9" hair="#8C5E3C" />
        </g>
      </g>
      {beat === 1 && (
        <>
          <Mark x={488} y={148} text="?" color="#E5584F" />
          <Mark x={530} y={154} text="?" color="#3F8BD9" delay={280} />
        </>
      )}
      {cheer && (
        <>
          <Mark x={488} y={148} text="♥" color="#E5584F" />
          <Mark x={530} y={154} text="♥" color="#EC6A8E" delay={150} />
          <Sparkle x={380} y={240} />
        </>
      )}

      <RideTrain path={[[-90, TRACK_Y], [190, TRACK_Y], [508, TRACK_Y]]} at={across ? 2 : 1} ms={[2300, 2000]} hurry={hurry} onReach={(i) => i === 1 && onArrive()} />
      {arrived && (
        <Pop x={244} y={190} s={0.8}>
          <PersonArt shirt="#2F5D8A" hat="conductor" hatColor="#2F5D8A" cheer={beat !== 1} />
        </Pop>
      )}
    </g>
  );
}
