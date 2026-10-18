import { useEffect, useRef } from 'react';
import { E, N, S, W } from '../engine/dir';
import { buildPath, poseAt, tileSegment } from '../engine/geometry';
import { C } from './art/palette';
import { TileBase } from './art/SceneryArt';
import { CELL, SegmentArt } from './art/TrackArt';
import { TrainArt } from './art/TrainArt';
import { poseTransform } from './trainRunner';

/** A closed 4×2 loop the title train circles forever. */
const LOOP = buildPath([
  tileSegment(0.5, 0.5, S, E),
  tileSegment(1.5, 0.5, W, E),
  tileSegment(2.5, 0.5, W, E),
  tileSegment(3.5, 0.5, W, S),
  tileSegment(3.5, 1.5, N, W),
  tileSegment(2.5, 1.5, E, W),
  tileSegment(1.5, 1.5, E, W),
  tileSegment(0.5, 1.5, E, N),
]);

function TitleLoop() {
  const trainRef = useRef<SVGGElement>(null);
  useEffect(() => {
    let frame = 0;
    const t0 = performance.now();
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const tick = (now: number) => {
      const d = reduced ? 1.2 : (((now - t0) / 1000) * 1.1) % LOOP.length;
      trainRef.current?.setAttribute('transform', poseTransform(poseAt(LOOP, d), CELL));
      if (!reduced) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <svg className="title-loop" viewBox="-20 -20 440 240" aria-hidden>
      <rect x={-16} y={-10} width={432} height={232} rx={28} fill={C.boardWoodDark} />
      <rect x={-16} y={-16} width={432} height={232} rx={28} fill={C.boardWood} />
      {Array.from({ length: 8 }, (_, i) => (
        <g key={i} transform={`translate(${(i % 4) * CELL + 50} ${Math.floor(i / 4) * CELL + 50})`}>
          <TileBase variant="grass" alt={(i + Math.floor(i / 4)) % 2 === 1} />
        </g>
      ))}
      {LOOP.segments.map((seg, i) => (
        <SegmentArt key={i} seg={seg} />
      ))}
      <g ref={trainRef}>
        <TrainArt />
      </g>
    </svg>
  );
}

export function TitleScreen({ onPlay }: { onPlay: () => void }) {
  return (
    <main className="title">
      <div className="title-inner">
        <p className="title-kicker">기찻길 퍼즐</p>
        <h1 className="logo">
          Rail<span>Tiles</span>
        </h1>
        <TitleLoop />
        <p className="title-copy">레일을 이어 작은 기차를 도착역까지 데려다주세요.</p>
        <button className="primary big" onClick={onPlay} autoFocus>
          시작하기
        </button>
      </div>
    </main>
  );
}
