import { GiftBox, Ribbon, SLOT, WagonArt } from '../../cargo/CargoArt';
import type { Kind } from '../../cargo/model';
import { type SceneProps, Bye, Confetti, Gift, Mark, Platform, Pop, Rail, RideTrain, SCENE_H, SCENE_W, Sparkle, Tag, useAlreadyHere, useCues, useSteps } from './kit';

const LINE_Y = 250;
const STOP_X = 300;
/** The yard picture: three wagons on a siding above the line. */
const YARD_X = 330;
const YARD_Y = 150;
const S = 0.42;

/** 보따, the yard's raccoon, standing on 0,0 (about 70 tall). */
function Raccoon({ cheer }: { cheer: boolean }) {
  return (
    <g>
      {/* Striped tail. */}
      <g transform="translate(16 -18) rotate(-30)">
        <ellipse rx={9} ry={22} fill="#8D8A92" />
        {[-12, -2, 8].map((y) => (
          <rect key={y} x={-9} y={y} width={18} height={5} rx={2} fill="#4A4652" />
        ))}
      </g>
      <ellipse cx={0} cy={-20} rx={15} ry={18} fill="#9D9AA3" />
      <ellipse cx={0} cy={-15} rx={9} ry={11} fill="#E9E4DC" />
      {/* Arms up when cheering. */}
      {cheer ? (
        <path d="M-12 -28 L-22 -46 M12 -28 L22 -46" stroke="#9D9AA3" strokeWidth={7} strokeLinecap="round" />
      ) : (
        <path d="M-13 -26 L-18 -10 M13 -26 L18 -10" stroke="#9D9AA3" strokeWidth={7} strokeLinecap="round" />
      )}
      <g transform="translate(0 -50)">
        <path d="M-16 -8 L-14 -22 L-5 -13 Z M16 -8 L14 -22 L5 -13 Z" fill="#7C7884" />
        <ellipse rx={18} ry={15} fill="#B4B0BA" />
        <path d="M-17 -2 Q-9 -9 0 -2 Q9 -9 17 -2 Q12 6 0 3 Q-12 6 -17 -2 Z" fill="#3E3A46" />
        <circle cx={-7} cy={-2} r={2.6} fill="#FFFFFF" />
        <circle cx={7} cy={-2} r={2.6} fill="#FFFFFF" />
        <ellipse cx={0} cy={6} rx={7} ry={5} fill="#F1ECE4" />
        <circle cx={0} cy={4} r={2.4} fill="#2A2630" />
        {/* Station cap. */}
        <path d="M-12 -12 Q0 -22 12 -12 Z" fill="#C2477A" />
        <rect x={-14} y={-13} width={28} height={4} rx={2} fill="#8E2F58" />
      </g>
    </g>
  );
}

/** A side-view wagon in the yard picture, its floor at 0. */
function YardWagon({ ks, tied }: { ks: Kind[]; tied?: boolean }) {
  return (
    <g>
      <WagonArt size={3} />
      {tied && <Ribbon size={3} part="band" />}
      {ks.map((k, i) => (
        <g key={i} transform={`translate(0 ${-(i + 0.5) * SLOT + 1})`}>
          <GiftBox kind={k} />
        </g>
      ))}
      {tied && <Ribbon size={3} part="bow" />}
    </g>
  );
}

/** Bunting across the top of the scene. */
function Bunting() {
  const colours = ['#E5584F', '#F6C443', '#4A9BE8', '#5DBB5A', '#8E6CE0', '#F07AA8'];
  return (
    <g>
      <path d="M0 18 Q140 44 280 18 Q420 44 560 18" stroke="#8A6A4C" strokeWidth={2} fill="none" />
      {Array.from({ length: 14 }, (_, i) => {
        const x = 20 + i * 40;
        const y = 22 + Math.sin(((x % 280) / 280) * Math.PI) * 12;
        return <path key={i} d={`M${x - 10} ${y} L${x + 10} ${y} L${x} ${y + 16} Z`} fill={colours[i % colours.length]} />;
      })}
    </g>
  );
}

function Station() {
  return (
    <g>
      <rect width={SCENE_W} height={SCENE_H} rx={24} fill="#FBE9CC" />
      <rect y={196} width={SCENE_W} height={104} fill="#E7D4B2" />
      <Bunting />
      {/* The crane over the yard. */}
      <rect x={YARD_X - 70} y={54} width={250} height={10} rx={5} fill="#E3AE1F" stroke="#B58515" strokeWidth={2} />
      <rect x={YARD_X - 74} y={54} width={10} height={100} rx={3} fill="#E3AE1F" stroke="#B58515" strokeWidth={2} />
      <rect x={YARD_X + 172} y={54} width={10} height={100} rx={3} fill="#E3AE1F" stroke="#B58515" strokeWidth={2} />
      <Rail a={[-100, LINE_Y]} b={[660, LINE_Y]} />
      <Platform x={40} w={210} y={LINE_Y - 64} />
      {/* A sign: 선물 화물역. */}
      <g transform="translate(146 118)">
        <rect x={-3} y={0} width={6} height={60} fill="#8A6A4C" />
        <rect x={-50} y={-24} width={100} height={30} rx={8} fill="#FFFBF2" stroke="#C2477A" strokeWidth={3} />
        <text y={-4} textAnchor="middle" fontSize={15} fontWeight={800} fill="#8E2F58">
          선물 화물역
        </text>
      </g>
    </g>
  );
}

const MIXED: Kind[][] = [
  [1, 0, 0],
  [0, 1, 2],
  [2, 2, 1],
];
const SORTED: Kind[][] = [
  [0, 0, 0],
  [1, 1, 1],
  [2, 2],
];

const TIMES = [[300], [300], [200, 900, 1700]];
const CUES = [[[300, 'thanks']], [[300, 'bump']], [[200, 'pickup'], [900, 'place'], [1700, 'depart']]] as const;

/**
 * 선물 화물역: our train pulls into a station hung with bunting, where 보따 the raccoon waves.
 * The wagons on the siding are a jumble of gifts ("?"). Then the crane sorts them: the front
 * wagon fills with fish, a ribbon ties it up and it rolls off with a sparkle.
 */
export function CargoScene({ beat, arrived, hurry, onArrive }: SceneProps) {
  const key = arrived ? beat : -1;
  const step = useSteps(key, TIMES[beat] ?? []);
  useCues(key, CUES[beat]);
  const sorted = beat === 2 && step >= 2;
  const gone = beat === 2 && step >= 3;
  const wagons = sorted ? SORTED : MIXED;
  return (
    <g>
      <Station />
      <g transform={`translate(${YARD_X} ${YARD_Y}) scale(${S})`}>
        {wagons.map((ks, i) =>
          i === 0 && gone ? null : (
            <g key={i} transform={`translate(${i * 100} 0)`}>
              <YardWagon ks={ks} tied={sorted && i === 0} />
            </g>
          ),
        )}
      </g>
      {gone && <Sparkle x={YARD_X - 20} y={YARD_Y - 40} />}
      {beat === 1 && arrived && <Mark x={YARD_X + 42} y={YARD_Y - 92} text="?" color="#C2477A" />}
      {beat === 2 && step === 1 && <Tag x={YARD_X} y={YARD_Y - 100} text="영차!" color="#B58515" />}
      <RideTrain
        path={[
          [-90, LINE_Y],
          [STOP_X, LINE_Y],
        ]}
        at={1}
        scale={1.25}
        hurry={hurry}
        onReach={(i) => i === 1 && onArrive()}
      />
      {arrived && (
        <Pop x={92} y={LINE_Y - 70} s={1}>
          <Raccoon cheer={beat !== 1} />
        </Pop>
      )}
    </g>
  );
}

const BYE_TIMES = [[200, 700, 1200], [200, 1400], [200, 700]];
const BYE_CUES = [[[200, 'pop'], [700, 'pop'], [1200, 'pop']], [[200, 'pickup'], [1400, 'place']], [[200, 'thanks'], [700, 'depart']]] as const;
/** Gifts sent to the friends of the other worlds, popping up as hearts. */
const SENT: { x: number; y: number; kind: Kind }[] = [
  { x: 360, y: 90, kind: 0 },
  { x: 420, y: 70, kind: 1 },
  { x: 480, y: 92, kind: 3 },
];

/**
 * 선물 화물역 farewell: the siding is empty and tidy. Hearts pop up with the gifts the friends
 * of the other worlds got. 보따 loads a gift box with a ribbon onto our train, and everyone waves
 * as it pulls away.
 */
export function CargoFarewell({ beat, arrived, onArrive }: SceneProps) {
  useAlreadyHere(onArrive);
  const key = arrived ? beat : -1;
  const step = useSteps(key, BYE_TIMES[beat] ?? []);
  useCues(key, BYE_CUES[beat]);
  const gone = beat === 2 && step >= 2;
  return (
    <g>
      <Station />
      {beat === 0 &&
        SENT.slice(0, step).map((s) => (
          <Pop key={s.kind} x={s.x} y={s.y} s={0.55}>
            <GiftBox kind={s.kind} />
            <path d="M0 -44 C-8 -54 -20 -46 -12 -36 L0 -26 L12 -36 C20 -46 8 -54 0 -44 Z" fill="#F07AA8" />
          </Pop>
        ))}
      {beat === 1 && step >= 1 && (
        <Gift from={[92, LINE_Y - 110]} to={[STOP_X - 10, LINE_Y - 10]}>
          <g transform="scale(0.5)">
            <GiftBox kind={1} />
            <g transform="translate(0 30)">
              <Ribbon size={1} part="bow" />
            </g>
          </g>
        </Gift>
      )}
      <RideTrain path={[[-90, LINE_Y], [STOP_X, LINE_Y], [660, LINE_Y]]} start={1} at={gone ? 2 : 1} ms={[2300, 2300]} scale={1.25} />
      <Pop x={92} y={LINE_Y - 70} s={1}>
        <Raccoon cheer />
      </Pop>
      {beat === 2 && <Bye x={92} y={LINE_Y - 150} color="#C2477A" />}
      <Confetti count={16} />
    </g>
  );
}
