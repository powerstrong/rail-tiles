import { DP, WagonArt } from '../../depot/DepotArt';
import type { Vehicle } from '../../depot/model';
import { type SceneProps, Mark, Platform, PersonArt, Pop, Rail, RideTrain, SCENE_H, SCENE_W, Sparkle, useCues, useSteps } from './kit';

/** The yard: 5 × 4 cells of 48, the train's line is row 1. */
const YX = 250;
const YY = 70;
const CELL = 48;
const LINE_Y = YY + CELL * 1.5;

interface Car {
  v: Vehicle;
  col: number;
  row: number;
}
const car = (kind: Vehicle['kind'], horizontal: boolean, col: number, row: number, color: number): Car => ({
  v: { glyph: '', kind, horizontal, line: horizontal ? row : col, len: 2, color },
  col,
  row,
});
const BLOCKER = car('coach', false, 3, 1, 1);
const PARKED = [car('coach', true, 1, 0, 0), car('coach', true, 0, 2, 4), car('freight', true, 0, 3, 2), car('freight', false, 4, 2, 1)];

/** A wagon parked in the yard, in its cells (`shift` slides it down by that many cells). */
function Parked({ c, shift = 0, className }: { c: Car; shift?: number; className?: string }) {
  const x = YX + c.col * CELL;
  const y = YY + c.row * CELL;
  const place = c.v.horizontal ? `translate(${x} ${y}) scale(${CELL / 100})` : `translate(${x + CELL} ${y}) rotate(90) scale(${CELL / 100})`;
  return (
    <g className="ss-car" style={{ transform: `translateY(${shift * CELL}px)` }}>
      <g className={className}>
        <g transform={place}>
          <WagonArt v={c.v} />
        </g>
      </g>
    </g>
  );
}

/** The depot shed behind the yard, with its arched doors. */
function Shed() {
  return (
    <g>
      <rect x={258} y={10} width={226} height={50} rx={8} fill="#E9E1D2" />
      <path d="M248 18 L371 0 L494 18" stroke={DP.teal} strokeWidth={10} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {[300, 371, 442].map((x) => (
        <g key={x}>
          <path d={`M${x - 22} 60 V36 Q${x} 18 ${x + 22} 36 V60 Z`} fill="#2E4A5C" />
          <path d={`M${x - 16} 60 V38 Q${x} 26 ${x + 16} 38 V60 Z`} fill="#38586C" />
        </g>
      ))}
      <rect x={359} y={4} width={24} height={14} rx={4} fill={DP.brass} />
    </g>
  );
}

const TIMES = [[300], [250, 750], [200, 900, 3200]];
const CUES = [
  [[300, 'depart']],
  [[250, 'bump'], [750, 'bump']],
  [[200, 'slide'], [850, 'depart'], [3200, 'thanks']],
] as const;

/**
 * 기차 차고지: the foreman blows the whistle and our train pulls into a packed yard. It tries
 * for the exit gate and clunks into a coach parked across its line, twice. Then that coach
 * rolls aside, and the train slips out through the gate.
 */
export function DepotScene({ beat, arrived, hurry, onArrive }: SceneProps) {
  const key = arrived ? beat : -1;
  const step = useSteps(key, TIMES[beat] ?? []);
  useCues(key, CUES[beat]);
  const stuck = beat === 1 && step >= 1;
  const moved = beat === 2 && step >= 1;
  const out = beat === 2 && step >= 2;
  const done = beat === 2 && step >= 3;

  return (
    <g>
      <rect width={SCENE_W} height={SCENE_H} rx={24} fill="#E6DDCC" />
      {Array.from({ length: 40 }, (_, i) => (
        <circle key={i} cx={(i * 97) % 560} cy={(i * 53) % 300} r={2 + (i % 3)} fill="#D6CAB3" />
      ))}
      <Shed />

      {/* The yard floor, its fence, and the gates on the train's line. */}
      <rect x={YX - 8} y={YY - 8} width={CELL * 5 + 16} height={CELL * 4 + 16} rx={14} fill={DP.frame} />
      <rect x={YX - 2} y={YY - 2} width={CELL * 5 + 4} height={CELL * 4 + 4} rx={10} fill={DP.floorEdge} />
      {Array.from({ length: 20 }, (_, i) => (
        <rect key={i} x={YX + (i % 5) * CELL + 1} y={YY + Math.floor(i / 5) * CELL + 1} width={CELL - 2} height={CELL - 2} rx={6} fill={(i + Math.floor(i / 5)) % 2 ? DP.floorAlt : DP.floor} />
      ))}
      {[YX - 8, YX + CELL * 5].map((x) => (
        <rect key={x} x={x} y={LINE_Y - CELL / 2} width={8} height={CELL} fill={DP.floorEdge} />
      ))}
      <Rail a={[-100, LINE_Y]} b={[660, LINE_Y]} tint="#DCD1BC" />
      {[LINE_Y - CELL / 2 - 6, LINE_Y + CELL / 2 + 6].map((y) => (
        <g key={y}>
          <rect x={YX + CELL * 5 - 2} y={y - 6} width={12} height={12} rx={3} fill="#2E3445" />
          <rect x={YX + CELL * 5} y={y - 4} width={8} height={8} rx={2} fill={DP.brass} />
        </g>
      ))}
      <path d={`M${YX + CELL * 5 + 20} ${LINE_Y - 34} l10 8 l-10 8`} stroke={DP.brass} strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" />

      {PARKED.map((c, i) => (
        <Parked key={i} c={c} />
      ))}
      <Parked c={BLOCKER} shift={moved ? 1 : 0} className={stuck ? `ss-shake s${step}` : undefined} key={stuck ? `b${step}` : 'b'} />

      <Platform x={30} w={196} y={YY - 2} />
      {/* Same element throughout (the train keeps its place); the class flips to replay the nudge. */}
      <g className={stuck ? (step % 2 ? 'ss-nudge' : 'ss-nudge-again') : undefined}>
        <RideTrain
          path={[[-90, LINE_Y], [YX + CELL - 2, LINE_Y], [620, LINE_Y]]}
          at={out ? 2 : 1}
          ms={[2300, 1900]}
          scale={1.25}
          hurry={hurry}
          onReach={(i) => i === 1 && onArrive()}
        />
      </g>
      {beat === 1 && step >= 1 && <Mark x={YX + CELL} y={LINE_Y - 44} text="!" color="#E5584F" />}
      {done && <Sparkle x={YX + CELL * 5 + 24} y={LINE_Y} />}
      {arrived && (
        <Pop x={130} y={YY - 12} s={0.74}>
          <PersonArt shirt="#E0782E" hat="helmet" hatColor="#F4C24F" cheer={beat !== 1} />
          {beat === 0 && (
            <g transform="translate(-28 -14)">
              <rect x={-12} y={-5} width={14} height={10} rx={4} fill="#B9BFC9" stroke="#7F8896" strokeWidth={2} />
              <path d="M-18 -14 l-8 -6 M-20 -2 l-10 0 M-18 10 l-8 6" stroke="#7F8896" strokeWidth={3} strokeLinecap="round" className="ss-blink" />
            </g>
          )}
        </Pop>
      )}
      {/* Lower left: spare rails and a lamp. */}
      <g transform="translate(70 230)">
        <rect x={-40} y={-6} width={80} height={8} rx={3} fill="#A7ADB6" />
        <rect x={-34} y={6} width={80} height={8} rx={3} fill="#A7ADB6" />
        <rect x={-30} y={18} width={80} height={8} rx={3} fill="#C9CED6" />
      </g>
      <g transform="translate(176 214)">
        <rect x={-3} y={-30} width={6} height={56} rx={2} fill="#5D6271" />
        <circle cy={-34} r={9} fill="#FFE38A" stroke="#5D6271" strokeWidth={3} />
      </g>
    </g>
  );
}
