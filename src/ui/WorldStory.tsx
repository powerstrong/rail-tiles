import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { E, W } from '../engine/dir';
import { tileSegment } from '../engine/geometry';
import { StarField } from '../space/SpaceArt';
import { C } from './art/palette';
import { CELL, SegmentArt } from './art/TrackArt';
import { CHIMNEY, TrainArt } from './art/TrainArt';
import { makePuff, useLook } from './look';
import { play } from './sound';
import type { Story } from './stories';
import { Emblem, type WorldCard } from './WorldSelect';

interface Props {
  /** The world's name, color and emblem. */
  place: string;
  color: string;
  emblem: WorldCard['emblem'];
  story: Story;
  /** The very first world: "첫 정거장" instead of "다음 정거장". */
  first: boolean;
  onDone: () => void;
}

// The scene, in SVG units: the track runs along the bottom, the platform and friend sit on it.
const SCENE_W = 560;
const SCENE_H = 300;
const TRACK_Y = 2.32;
const FROM = -90;
const STOP = 236;
const RIDE_MS = 2300;
const FRIEND = { x: 336, y: 120 };
/** Where the world's three things stand, top left (the landmark is top right). */
const DECOR = [
  { x: 52, y: 74, s: 0.62 },
  { x: 150, y: 48, s: 0.52 },
  { x: 236, y: 92, s: 0.5 },
];
const TRACK = Array.from({ length: 7 }, (_, i) => tileSegment(i - 0.5, TRACK_Y, W, E));

/**
 * The train pulls into a new world's station, the friend who lives there pops out and says
 * what is wrong, then off we go. Tapping the scene fast-forwards the ride; "건너뛰기" skips it all.
 */
export function WorldStory({ place, color, emblem, story, first, onDone }: Props) {
  const { smoke } = useLook();
  const [reduced] = useState(() => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const [arrived, setArrived] = useState(reduced);
  const [line, setLine] = useState(0);
  const trainRef = useRef<SVGGElement>(null);
  const smokeRef = useRef<SVGGElement>(null);
  const hurry = useRef(false);
  const last = line === story.lines.length - 1;

  useEffect(() => {
    if (reduced) return;
    play('depart');
    let frame = 0;
    let next = 0;
    let puffs = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const k = hurry.current ? 1 : Math.min(1, (now - t0) / RIDE_MS);
      // Rolls in fast and brakes gently to a stop at the platform.
      const x = FROM + (STOP - FROM) * (1 - (1 - k) ** 3);
      trainRef.current?.setAttribute('transform', `translate(${x.toFixed(1)} ${TRACK_Y * CELL})`);
      if (k < 1 && now >= next && smokeRef.current) {
        next = now + 200 + 380 * k;
        smokeRef.current.appendChild(makePuff(smoke, x + CHIMNEY.x, TRACK_Y * CELL + CHIMNEY.y, puffs++));
        if (puffs % 2) play('chuff');
      }
      if (k < 1) {
        frame = requestAnimationFrame(tick);
        return;
      }
      setArrived(true);
      play('thanks');
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduced, smoke]);

  const advance = () => {
    if (last) {
      play('depart');
      onDone();
      return;
    }
    setLine((n) => n + 1);
    play('swish');
  };

  return (
    <main className="story" style={{ '--world': color } as CSSProperties}>
      <button className="secondary story-skip" onClick={onDone}>
        건너뛰기
      </button>
      <p className="story-caption">칙칙폭폭… {first ? '첫' : '다음'} 정거장은</p>
      <h1 className={`story-place ${arrived ? 'shown' : ''}`} aria-hidden={!arrived}>
        {place}!
      </h1>

      <svg
        className="story-scene"
        viewBox={`0 0 ${SCENE_W} ${SCENE_H}`}
        role="img"
        aria-label={`기차가 ${place}에 도착해요`}
        onClick={() => (hurry.current = true)}
      >
        <rect width={SCENE_W} height={SCENE_H} rx={24} fill={story.ground} />
        {story.night && <StarField width={SCENE_W} height={SCENE_H} />}
        <circle cx={468} cy={86} r={74} fill="#fff" opacity={story.night ? 0.12 : 0.4} />
        <svg x={406} y={24} width={124} height={124} viewBox="0 0 48 48" overflow="visible">
          <Emblem kind={emblem} />
        </svg>
        {story.decor.map((d, i) => (
          <g key={i} transform={`translate(${DECOR[i].x} ${DECOR[i].y}) scale(${DECOR[i].s})`}>
            {d}
          </g>
        ))}
        <rect x={168} y={160} width={236} height={32} rx={8} fill={C.platformEdge} />
        <rect x={168} y={154} width={236} height={32} rx={8} fill={C.platform} />
        <rect x={178} y={163} width={216} height={4} rx={2} fill={C.stopTint} />
        {TRACK.map((seg, i) => (
          <SegmentArt key={i} seg={seg} />
        ))}
        <g ref={smokeRef} />
        <g ref={trainRef} transform={`translate(${arrived ? STOP : FROM} ${TRACK_Y * CELL})`}>
          <TrainArt />
        </g>
        {arrived && (
          <g transform={`translate(${FRIEND.x} ${FRIEND.y})`}>
            <g className="story-friend">
              <g className="story-bob">{story.art(last)}</g>
            </g>
          </g>
        )}
      </svg>

      <div className={`story-bubble ${arrived ? 'shown' : ''}`} aria-live="polite">
        {arrived && (
          <>
            <span className="story-name">{story.friend}</span>
            <p key={line} className="story-line">
              {story.lines[line]}
            </p>
            <div className="story-actions">
              <span className="story-dots" aria-hidden>
                {story.lines.map((_, i) => (
                  <i key={i} className={i <= line ? 'on' : ''} />
                ))}
              </span>
              <button className={last ? 'primary' : 'secondary'} onClick={advance} autoFocus key={last ? 'go' : 'next'}>
                {last ? '출발!' : '다음 ▶'}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
