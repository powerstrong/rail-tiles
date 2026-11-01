import { useEffect, useState } from 'react';
import { BlockArt, CK, ExitArt, MouseArt } from '../../clock/ClockArt';
import { type SceneProps, Mark, Platform, Rail, RideTrain, SCENE_H, SCENE_W, Sparkle, TRACK_Y, useCues, useSteps } from './kit';

const FACE = { x: 480, y: 76 };
const DOOR = { x: 480, y: 140 };
const HOLE = { x: 452, y: 204 };
const ROW_Y = 196;
const BLOCKS = [
  { x: 236, color: 0 as const },
  { x: 296, color: 1 as const },
  { x: 356, color: 0 as const },
];
/** The mouse's stops in the last beat: start, each block, the foot of the tower, the hole. */
const HOPS = [180, 236, 296, 356, 412, HOLE.x];
const BEAT_MS = 700;

/** Counts beats of the tower's tick-tock while `on`. */
function useTick(on: boolean) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!on) return;
    const t = window.setInterval(() => setN((k) => k + 1), BEAT_MS);
    return () => clearInterval(t);
  }, [on]);
  return n;
}

/** The clock tower: roof, face with turning hands, the little door the mouse lives behind. */
function Tower({ chimed, open }: { chimed: boolean; open: boolean }) {
  return (
    <g>
      <rect x={424} y={30} width={112} height={206} rx={6} fill={CK.wall} />
      <rect x={424} y={30} width={22} height={206} fill={CK.wallDark} opacity={0.5} />
      <path d="M412 36 L480 -8 L548 36 Z" fill={CK.frameDark} />
      <path d="M418 34 L480 -2 L542 34" stroke={CK.frameHi} strokeWidth={3} fill="none" />
      <g transform={`translate(${FACE.x} ${FACE.y})`}>
        <circle r={36} fill={CK.brassDark} />
        <circle r={31} fill="#FFF8E8" />
        {Array.from({ length: 12 }, (_, k) => (
          <rect key={k} x={-1.5} y={-27} width={3} height={k % 3 ? 4 : 7} rx={1.5} fill={CK.ink} transform={`rotate(${k * 30})`} />
        ))}
        <g className="story-hand" style={{ transform: `rotate(${chimed ? 360 : 140}deg)` }}>
          <path d="M0 2 V-22" stroke={CK.ink} strokeWidth={3.5} strokeLinecap="round" />
        </g>
        <g className="story-hand" style={{ transform: `rotate(${chimed ? 360 : 250}deg)` }}>
          <path d="M0 2 V-14" stroke={CK.red} strokeWidth={4.5} strokeLinecap="round" />
        </g>
        <circle r={4} fill={CK.brass} />
      </g>
      {/* The cuckoo door. */}
      <g transform={`translate(${DOOR.x} ${DOOR.y})`}>
        <path d="M-21 22 V-6 A21 21 0 0 1 21 -6 V22 Z" fill={CK.frameDark} />
        <path d="M-16 22 V-5 A16 16 0 0 1 16 -5 V22 Z" fill="#2A1E1A" />
        <rect x={-16} y={-18} width={16} height={40} fill={CK.frameHi} className="ss-door" style={{ transformOrigin: '0% 50%', transform: `scaleX(${open ? 0.15 : 1})` }} />
        <rect x={0} y={-18} width={16} height={40} fill={CK.frameHi} className="ss-door" style={{ transformOrigin: '100% 50%', transform: `scaleX(${open ? 0.15 : 1})` }} />
      </g>
      <g transform={`translate(${HOLE.x} ${HOLE.y}) scale(0.5)`}>
        <ExitArt />
      </g>
    </g>
  );
}

const TIMES = [[300, 1100, 1400], [200, 900], [300, 1000, 1700, 2400, 3100, 3500]];
const CUES = [
  [[300, 'arrive'], [1100, 'swish']],
  [[200, 'swish'], [900, 'pop'], [1600, 'rotate'], [2300, 'rotate'], [3000, 'rotate']],
  [[300, 'place'], [1000, 'place'], [1700, 'place'], [2400, 'place'], [3100, 'pickup'], [3500, 'thanks']],
] as const;

/**
 * 시계탑: at dusk the train pulls up by the clock tower. The hands sweep to twelve and the bell
 * rings out ("댕~"), the little door opens and the mouse pops out. It hops down to a row of
 * blocks rising and falling to the tick-tock, then hops along them in time, into the cheese.
 */
export function ClockScene({ beat, arrived, hurry, onArrive }: SceneProps) {
  const key = arrived ? beat : -1;
  const step = useSteps(key, TIMES[beat] ?? []);
  useCues(key, CUES[beat]);
  const chimed = arrived && (beat > 0 || step >= 1);
  const open = beat > 0 || step >= 2;
  const out = beat > 0 || step >= 3;
  const blocks = beat === 2 || (beat === 1 && step >= 2);
  const tick = useTick(blocks);

  // Where the mouse is: at the door, at the start of the row, then hop by hop to the cheese.
  let mx = DOOR.x;
  let my = DOOR.y + 4;
  let hop = 0;
  if (beat === 1 && step >= 1) {
    mx = HOPS[0];
    my = ROW_Y;
    hop = 1;
  } else if (beat === 2) {
    hop = Math.min(step, HOPS.length - 1) + 1;
    mx = HOPS[Math.min(step, HOPS.length - 1)];
    my = ROW_Y;
  }
  const home = beat === 2 && step >= 5;

  return (
    <g>
      <defs>
        <linearGradient id="ss-dusk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F9DDB0" />
          <stop offset="1" stopColor="#F0AE86" />
        </linearGradient>
      </defs>
      <rect width={SCENE_W} height={SCENE_H} rx={24} fill="url(#ss-dusk)" />
      <circle cx={110} cy={120} r={46} fill="#FFE7B8" opacity={0.8} />
      {[
        [70, 40, 1],
        [250, 60, 0.8],
        [340, 26, 0.6],
      ].map(([x, y, s], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
          <g className="ss-cloud" style={{ animationDelay: `${i * -2000}ms` }}>
            <path d="M-30 10 Q-30 -6 -14 -6 Q-10 -20 6 -18 Q22 -22 26 -6 Q40 -4 38 10 Z" fill="#FFF4E2" opacity={0.85} />
          </g>
        </g>
      ))}
      {/* Rooftops of the town on the horizon. */}
      <path d="M0 164 V138 H30 L48 118 L66 138 H96 V126 H128 L146 106 L164 126 V138 H214 L236 120 L258 138 H300 V128 L322 112 L344 128 V138 H400 V164 Z" fill="#E59E7C" opacity={0.55} />
      {[52, 150, 236, 324].map((x) => (
        <rect key={x} x={x - 4} y={140} width={8} height={9} rx={2} fill="#FFE7B8" opacity={0.9} />
      ))}
      <rect y={164} width={SCENE_W} height={SCENE_H - 164} fill={CK.floor} />
      {Array.from({ length: 10 }, (_, i) => (
        <path key={i} d={`M${i * 60} 164 V240`} stroke={CK.plank} strokeWidth={2} />
      ))}
      <path d="M0 164 H560" stroke={CK.floorEdge} strokeWidth={4} />

      <Tower chimed={chimed} open={open} />
      {chimed && beat === 0 && (
        <g transform={`translate(${FACE.x} ${FACE.y})`}>
          {[0, 1].map((i) => (
            <circle key={i} r={36} fill="none" stroke={CK.brass} strokeWidth={4} className="ss-ring" style={{ animationDelay: `${i * 450}ms` }} />
          ))}
        </g>
      )}

      {blocks &&
        BLOCKS.map((b, i) => (
          <g key={i} transform={`translate(${b.x} ${ROW_Y}) scale(0.48)`}>
            <g className="ss-drop" style={{ animationDelay: `${i * 120}ms` }}>
              <BlockArt color={b.color} up={(tick + b.color) % 2 === 0} />
            </g>
          </g>
        ))}

      {out && (
        <g className="ss-mouse" style={{ transform: `translate(${mx}px, ${my}px)`, opacity: home ? 0 : 1 }}>
          <g className="story-friend">
            <g className={hop % 2 ? 'ss-jump' : 'ss-jump-again'}>
              <g transform="scale(0.5)">
                <MouseArt happy={beat !== 1} />
              </g>
            </g>
          </g>
        </g>
      )}
      {beat === 1 && step >= 2 && <Mark x={HOPS[0]} y={ROW_Y - 44} text="?" color={CK.red} />}
      {home && (
        <>
          <Sparkle x={HOLE.x} y={HOLE.y} color={CK.cheese} />
          <Mark x={HOLE.x} y={HOLE.y - 40} text="♥" color={CK.red} delay={200} />
        </>
      )}

      <Platform x={20} w={150} />
      <Rail a={[-100, TRACK_Y]} b={[660, TRACK_Y]} />
      <RideTrain path={[[-90, TRACK_Y], [100, TRACK_Y]]} at={1} hurry={hurry} onReach={(i) => i === 1 && onArrive()} />
    </g>
  );
}
