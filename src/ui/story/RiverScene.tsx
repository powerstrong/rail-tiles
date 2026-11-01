import { BlockArt as TowerArt } from '../../depot/DepotArt';
import { DecorationArt } from '../art/SceneryArt';
import { type SceneProps, Platform, PersonArt, Pop, Rail, RideTrain, SCENE_H, SCENE_W, Sparkle, TRACK_Y, Tag, useCues, useSteps } from './kit';

const RIVER = { x: 250, w: 80 };
const BARRIER = { x: 404, y: 222 };
const TOWER = { x: 498, y: 176 };

/** A windmill on the far bank, its sails turning in the river wind. */
function Windmill({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cy={44} rx={22} ry={6} fill="rgba(0,0,0,0.14)" />
      <path d="M-14 44 L-9 0 H9 L14 44 Z" fill="#F3E6CF" stroke="#C9B48E" strokeWidth={2} />
      <path d="M-12 2 L0 -10 L12 2 Z" fill="#C2433C" />
      <rect x={-4} y={30} width={8} height={14} rx={3} fill="#8C5E3C" />
      <g transform="translate(0 -4)">
        <g className="ss-spin">
          {[0, 90, 180, 270].map((a) => (
            <g key={a} transform={`rotate(${a})`}>
              <rect x={-3} y={-38} width={6} height={36} rx={2} fill="#8C5E3C" />
              <rect x={3} y={-36} width={12} height={26} rx={2} fill="#FFF8EA" stroke="#C9B48E" strokeWidth={1.5} />
            </g>
          ))}
          <circle r={5} fill="#5A3E33" />
        </g>
      </g>
    </g>
  );
}

/** One leaf of the drawbridge: raised it is a short stub, lowered it spans half the river. */
function Leaf({ x, from, lowered }: { x: number; from: 'left' | 'right'; lowered: boolean }) {
  return (
    <g transform={`translate(${x} ${TRACK_Y - 26})`}>
      <g className="ss-leaf" style={{ transformOrigin: from === 'left' ? '0% 50%' : '100% 50%', transform: `scaleX(${lowered ? 1 : 0.3})` }}>
        <rect width={40} height={52} rx={4} fill="#8C5E3C" />
        {[6, 16, 26, 36].map((px) => (
          <rect key={px} x={px - 2} y={4} width={4} height={44} rx={1.5} fill="#A87449" />
        ))}
        <rect y={10} width={40} height={4} fill="#5D6271" />
        <rect y={38} width={40} height={4} fill="#5D6271" />
        {!lowered && <rect x={from === 'left' ? 32 : 0} width={8} height={52} fill="#E5584F" />}
      </g>
    </g>
  );
}

const TIMES = [[], [100, 700, 1300], [200, 700, 1350, 3700]];
const CUES = [undefined, [[100, 'pop'], [700, 'pop'], [1300, 'pop']], [[200, 'swish'], [700, 'rotate'], [1300, 'depart'], [3700, 'thanks']]] as const;

/**
 * 강바람 철도: wind gusts down the river, the trees lean and a windmill turns. The gadgets of
 * the line are pointed out one by one (crossing barrier, drawbridge, water tower); then the
 * barrier lifts, the bridge comes down and the train rolls across to the far village.
 */
export function RiverScene({ beat, arrived, hurry, onArrive }: SceneProps) {
  const key = arrived ? beat : -1;
  const step = useSteps(key, TIMES[beat] ?? []);
  useCues(key, CUES[beat]);
  const open = beat === 2 && step >= 1;
  const lowered = beat === 2 && step >= 2;
  const across = beat === 2 && step >= 3;
  const there = beat === 2 && step >= 4;

  return (
    <g>
      <rect width={SCENE_W} height={SCENE_H} rx={24} fill="#BFE3D2" />
      {/* The river, flowing down the middle. */}
      <rect x={RIVER.x - 6} width={RIVER.w + 12} height={SCENE_H} fill="#E8DDB8" />
      <rect x={RIVER.x} width={RIVER.w} height={SCENE_H} fill="#6FC0E6" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <path key={i} d={`M${RIVER.x + 18 + (i % 3) * 22} ${i * 50} v18`} stroke="#D6F0FA" strokeWidth={4} strokeLinecap="round" className="ss-flow" style={{ animationDelay: `${-i * 300}ms` }} />
      ))}

      <g transform="translate(56 74) scale(1.7)">
        <g className="ss-gust">
          <DecorationArt deco="tree" seed={0.3} joins={[]} />
        </g>
      </g>
      <g transform="translate(150 44) scale(1.4)">
        <g className="ss-gust" style={{ animationDelay: '300ms' }}>
          <DecorationArt deco="tree" seed={0.7} joins={[]} />
        </g>
      </g>
      <Windmill x={392} y={60} />
      <g transform="translate(476 56) scale(1.05)">
        <DecorationArt deco="house" seed={0.2} joins={[]} />
      </g>
      <g transform="translate(530 104) scale(0.95)">
        <DecorationArt deco="house" seed={0.6} joins={[]} />
      </g>
      {there && <Sparkle x={500} y={70} />}

      {/* Gusts of wind. */}
      {[40, 118, 176].map((y, i) => (
        <path key={y} d={`M0 ${y} q30 -12 60 0 t60 0`} stroke="#fff" strokeWidth={3.5} fill="none" strokeLinecap="round" opacity={0.75} className="ss-wind" style={{ animationDelay: `${i * 900}ms` }} />
      ))}

      <Platform x={28} w={212} />
      <Rail a={[-100, TRACK_Y]} b={[RIVER.x, TRACK_Y]} />
      <Rail a={[RIVER.x + RIVER.w, TRACK_Y]} b={[660, TRACK_Y]} />
      <Leaf x={RIVER.x} from="left" lowered={lowered} />
      <Leaf x={RIVER.x + 40} from="right" lowered={lowered} />

      <g transform={`translate(${TOWER.x} ${TOWER.y}) scale(0.62)`}>
        <g key={beat === 1 && step >= 3 ? 'hi' : 'lo'} className={beat === 1 && step >= 3 ? 'ss-shake' : undefined}>
          <TowerArt deco="tower" />
        </g>
      </g>
      <g transform={`translate(${BARRIER.x} ${BARRIER.y})`}>
        <circle r={7} fill="#5D6271" />
        <g className="ss-arm" style={{ transform: `rotate(${open ? -90 : 0}deg)` }}>
          <rect x={-4} y={2} width={8} height={70} rx={3} fill="#fff" stroke="#C9CDD6" strokeWidth={1} />
          {[10, 30, 50].map((y) => (
            <rect key={y} x={-4} y={y} width={8} height={10} fill="#E5584F" />
          ))}
        </g>
      </g>

      {beat === 1 && step >= 1 && <Tag x={BARRIER.x + 4} y={BARRIER.y - 26} text="차단기" color="#E5584F" />}
      {beat === 1 && step >= 2 && <Tag x={RIVER.x + 40} y={TRACK_Y - 46} text="도개교" color="#8C5E3C" />}
      {beat === 1 && step >= 3 && <Tag x={TOWER.x} y={TOWER.y - 52} text="급수탑" color="#2E6F8E" />}

      <RideTrain path={[[-90, TRACK_Y], [150, TRACK_Y], [520, TRACK_Y]]} at={across ? 2 : 1} ms={[2300, 2300]} hurry={hurry} onReach={(i) => i === 1 && onArrive()} />
      {arrived && (
        <Pop x={206} y={190} s={0.78}>
          <PersonArt shirt="#2FA38C" hat="conductor" hatColor="#E5584F" cheer={beat !== 1} />
        </Pop>
      )}
    </g>
  );
}
