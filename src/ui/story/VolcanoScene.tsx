import { CraterArt, EggArt, HouseArt, StoneArt, VO } from '../../volcano/VolcanoArt';
import { type SceneProps, Bye, Confetti, Gift, Mark, Platform, PersonArt, Pop, Rail, RideTrain, SCENE_H, SCENE_W, Sparkle, TRACK_Y, useAlreadyHere, useCues, useSteps } from './kit';

const CRATER = { x: 432, y: 96 };
const LAVA = 'M424 66 Q402 98 380 136 Q360 162 316 166';
const FRONT = { x: 316, y: 166 };
const HOUSES = [
  { x: 262, y: 170 },
  { x: 206, y: 150 },
];
const STONES = [
  { x: 292, y: 168 },
  { x: 300, y: 138 },
];

/** A palm tree swaying by the shore. */
function Palm({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cy={36} rx={22} ry={6} fill={VO.shadow} />
      <path d="M0 36 Q-4 10 6 -14" stroke="#9C6B43" strokeWidth={8} fill="none" strokeLinecap="round" />
      <g className="ss-sway" style={{ animationDuration: '3s' }}>
        <g transform="translate(6 -16)">
          {[-150, -100, -40, 10, 60].map((a) => (
            <path key={a} d="M0 0 Q14 -12 32 -2 Q16 -4 0 0 Z" fill="#4FA35A" transform={`rotate(${a})`} stroke="#3B8247" strokeWidth={1.5} />
          ))}
          <circle cx={-3} cy={4} r={4} fill="#8C5E3C" />
          <circle cx={4} cy={5} r={4} fill="#8C5E3C" />
        </g>
      </g>
    </g>
  );
}

/** The sea all round, with little waves. */
function Sea() {
  return (
    <g>
      <rect width={SCENE_W} height={SCENE_H} rx={24} fill={VO.sea} />
      {[
        [40, 26],
        [120, 14],
        [500, 20],
        [470, 40],
      ].map(([x, y], i) => (
        <path key={i} d={`M${x} ${y} q8 -6 16 0 q8 6 16 0`} stroke={VO.seaHi} strokeWidth={3} fill="none" strokeLinecap="round" className="ss-wave-sea" style={{ animationDelay: `${i * 400}ms` }} />
      ))}
    </g>
  );
}

/** The island: a sandy shore, the grass and two palms. */
function Land() {
  return (
    <g>
      <path d="M12 290 L12 150 C12 70 64 40 150 40 C230 40 280 22 360 24 C450 26 548 52 548 130 L548 290 Z" fill="#F1E1B0" />
      <path d="M20 290 L20 152 C20 80 70 50 152 50 C232 50 282 32 360 34 C446 36 540 60 540 132 L540 290 Z" fill={VO.grass} />
      <Palm x={58} y={96} s={0.9} />
      <Palm x={520} y={140} s={0.75} />
    </g>
  );
}

/** The volcano, puffing smoke. */
function Volcano({ erupting }: { erupting: boolean }) {
  return (
    <g>
      {/* The volcano, puffing. */}
      <g transform={`translate(${CRATER.x} ${CRATER.y}) scale(1.6)`}>
        <CraterArt volume={null} erupting={erupting} />
      </g>
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={CRATER.x - 4 + i * 6} cy={CRATER.y - 44} r={9 + i * 2} fill="#B8B0AE" className="ss-smoke" style={{ animationDelay: `${i * 700}ms` }} />
      ))}
    </g>
  );
}

const TIMES = [[300, 1100], [200, 1900], [300, 650, 1100, 1450]];
const CUES = [
  [[300, 'bump'], [1100, 'bump']],
  [[200, 'splash'], [1900, 'deny']],
  [[300, 'place'], [650, 'place'], [1100, 'erase'], [1450, 'thanks']],
] as const;

/**
 * 화산 섬: an island in a bright sea, palms swaying. The volcano rumbles (the whole island
 * shakes) and smokes; then lava pours down the slope towards the village houses; then two
 * stones drop in its way, the lava front cools to rock and the houses are safe.
 */
export function VolcanoScene({ beat, arrived, hurry, onArrive }: SceneProps) {
  const key = arrived ? beat : -1;
  const step = useSteps(key, TIMES[beat] ?? []);
  useCues(key, CUES[beat]);
  const flowing = beat >= 1 && (beat > 1 || step >= 1);
  const stones = beat === 2 ? Math.min(2, step) : 0;
  const cooled = beat === 2 && step >= 3;
  const safe = beat === 2 && step >= 4;
  const rumble = beat === 0 && step >= 1 ? `r${step}` : 'still';

  return (
    <g>
      <Sea />
      <g key={rumble} className={rumble === 'still' ? undefined : 'ss-shake'}>
        <Land />

        <Volcano erupting={beat === 0 ? step >= 1 : beat === 1} />

        {flowing && (
          <g>
            <path d={LAVA} stroke={VO.lavaDark} strokeWidth={22} strokeLinecap="round" fill="none" pathLength={1} className="ss-lava" />
            <path d={LAVA} stroke={VO.lava} strokeWidth={15} strokeLinecap="round" fill="none" pathLength={1} className="ss-lava" />
            <path d={LAVA} stroke={VO.lavaHot} strokeWidth={4} strokeLinecap="round" fill="none" pathLength={1} className="ss-lava" />
          </g>
        )}
        {cooled && (
          <g transform={`translate(${FRONT.x} ${FRONT.y})`}>
            <circle r={13} fill="#7A5A4E" className="ss-drop" />
            <path d="M-6 -3 L0 2 L6 -4" stroke="#5A403A" strokeWidth={2.5} fill="none" />
          </g>
        )}
        {HOUSES.map((h, i) => (
          <g key={i} transform={`translate(${h.x} ${h.y}) scale(0.5)`}>
            <HouseArt burned={false} />
          </g>
        ))}
        {STONES.slice(0, stones).map((st, i) => (
          <g key={i} transform={`translate(${st.x} ${st.y}) scale(0.4)`}>
            <StoneArt />
          </g>
        ))}
        {beat === 1 && step >= 2 && HOUSES.map((h, i) => <Mark key={i} x={h.x} y={h.y - 34} text="!" color={VO.lavaDark} delay={i * 200} />)}
        {safe && HOUSES.map((h, i) => <Sparkle key={i} x={h.x} y={h.y - 16} delay={i * 150} />)}

        <Platform x={28} w={210} />
        <Rail a={[-100, TRACK_Y]} b={[660, TRACK_Y]} tint="#F1E1B0" />
        <RideTrain path={[[-90, TRACK_Y], [172, TRACK_Y]]} at={1} hurry={hurry} onReach={(i) => i === 1 && onArrive()} />
        {arrived && (
          <Pop x={82} y={190} s={0.78}>
            <PersonArt shirt="#F28C5B" hat="straw" hatColor="#F3D58A" cheer={safe || beat === 0} />
          </Pop>
        )}
      </g>
    </g>
  );
}

/** A basket of island fruit. */
function FruitBasket() {
  return (
    <g transform="scale(0.85)">
      <circle cx={-8} cy={-6} r={7} fill="#E5584F" />
      <circle cx={6} cy={-8} r={7} fill="#F4C24F" />
      <circle cx={-1} cy={-14} r={6} fill="#F0692E" />
      <path d="M-1 -20 q3 -5 7 -4" stroke="#4FA35A" strokeWidth={3} fill="none" strokeLinecap="round" />
      <path d="M-16 -4 H16 L12 12 H-12 Z" fill="#C98D52" stroke="#9C6A3A" strokeWidth={2} />
      <path d="M-14 2 H14 M-12 7 H12" stroke="#9C6A3A" strokeWidth={1.5} />
    </g>
  );
}

const DRAGON = { x: 150, y: 150 };
const BYE_TIMES = [[300], [150, 900, 2100], [300]];
const BYE_CUES = [[[300, 'thanks']], [[150, 'pop'], [900, 'swish'], [2100, 'pickup']], [[300, 'depart'], [700, 'thanks']]] as const;

/**
 * 화산 섬 farewell: the lava has set into a rocky trail and the village is safe. A baby dragon
 * cracks out of its egg; the farmer sends a basket of island fruit onto the train; as it leaves
 * the volcano puffs a heart and the little dragon hops goodbye.
 */
export function VolcanoFarewell({ beat, arrived, onArrive }: SceneProps) {
  useAlreadyHere(onArrive);
  const key = arrived ? beat : -1;
  const step = useSteps(key, BYE_TIMES[beat] ?? []);
  useCues(key, BYE_CUES[beat]);
  const hatched = beat === 2 || (beat === 1 && step >= 1);
  const gone = beat === 2 && step >= 1;
  return (
    <g>
      <Sea />
      <Land />
      <Volcano erupting={false} />
      {beat === 2 && (
        <g transform={`translate(${CRATER.x} ${CRATER.y - 50})`}>
          <path d="M0 8 C-14 -4 -12 -18 -4 -18 C0 -18 0 -14 0 -12 C0 -14 0 -18 4 -18 C12 -18 14 -4 0 8 Z" fill="#F59AA8" className="ss-smoke" style={{ animationDuration: '2.4s' }} />
        </g>
      )}
      <path d={LAVA} stroke="#6E5148" strokeWidth={20} strokeLinecap="round" fill="none" />
      <path d={LAVA} stroke="#8A6658" strokeWidth={12} strokeLinecap="round" fill="none" />
      {HOUSES.map((h, i) => (
        <g key={i} transform={`translate(${h.x} ${h.y}) scale(0.5)`}>
          <HouseArt burned={false} />
        </g>
      ))}
      {STONES.map((st, i) => (
        <g key={i} transform={`translate(${st.x} ${st.y}) scale(0.4)`}>
          <StoneArt />
        </g>
      ))}
      <g transform={`translate(${DRAGON.x} ${DRAGON.y}) scale(0.55)`}>
        <g key={hatched ? 'out' : 'egg'} className={beat === 2 ? 'ss-hop' : undefined} style={{ animationIterationCount: 'infinite' }}>
          <EggArt hatched={hatched} />
        </g>
      </g>
      {beat === 1 && step >= 1 && <Sparkle x={DRAGON.x} y={DRAGON.y - 10} color="#6CC36A" />}
      <Platform x={28} w={210} />
      <Rail a={[-100, TRACK_Y]} b={[660, TRACK_Y]} tint="#F1E1B0" />
      <RideTrain path={[[-90, TRACK_Y], [172, TRACK_Y], [720, TRACK_Y]]} start={1} at={gone ? 2 : 1} ms={[2300, 2600]} />
      <Pop x={82} y={190} s={0.78}>
        <PersonArt shirt="#F28C5B" hat="straw" hatColor="#F3D58A" cheer />
      </Pop>
      {beat === 0 && HOUSES.map((h, i) => <Mark key={i} x={h.x} y={h.y - 34} text="♥" color={VO.roof} delay={i * 200} />)}
      {beat === 1 && step >= 2 && (
        <Gift from={[110, 176]} to={[178, 250]}>
          <FruitBasket />
        </Gift>
      )}
      {beat === 1 && step >= 3 && <Sparkle x={178} y={248} color="#F0692E" />}
      {beat === 2 && (
        <>
          <Bye x={82} y={130} color="#F28C5B" />
          <Bye x={DRAGON.x + 6} y={DRAGON.y - 46} color="#459A47" delay={250} />
        </>
      )}
      <Confetti count={16} />
    </g>
  );
}
