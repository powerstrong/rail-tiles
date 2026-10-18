import { useEffect, useRef } from 'react';
import { ALL_DIRS, DX, DY, E, N, S, W } from '../engine/dir';
import { buildPath, poseAt, tileSegment } from '../engine/geometry';
import { C } from './art/palette';
import type { Decoration } from '../engine/stage';
import { DecorationArt, GroundDetail, TileBase, cellHash } from './art/SceneryArt';
import { CELL, SegmentArt } from './art/TrackArt';
import { TrainArt } from './art/TrainArt';
import { poseTransform } from './trainRunner';

/** A closed 4×2 loop (columns 1–4, rows 0–1) the title train circles forever. */
const LOOP = buildPath([
  tileSegment(1.5, 0.5, S, E),
  tileSegment(2.5, 0.5, W, E),
  tileSegment(3.5, 0.5, W, E),
  tileSegment(4.5, 0.5, W, S),
  tileSegment(4.5, 1.5, N, W),
  tileSegment(3.5, 1.5, E, W),
  tileSegment(2.5, 1.5, E, W),
  tileSegment(1.5, 1.5, E, N),
]);

const COLS = 6;
const ROWS = 3;
const PAD = 22;

/** Scenery around the loop, same glyphs as stage maps. `.` is plain grass. */
const SCENERY = ['M . . . . T', 'T . . . . R', 'W W . T H T'];
const DECOS: Record<string, Decoration> = { T: 'tree', R: 'rock', M: 'mountain', W: 'water', H: 'house' };

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

  const rows = SCENERY.map((r) => r.split(' '));
  const isWater = (x: number, y: number) => rows[y]?.[x] === 'W';
  const w = COLS * CELL;
  const h = ROWS * CELL;
  return (
    <svg className="title-loop" viewBox={`${-PAD} ${-PAD} ${w + PAD * 2} ${h + PAD * 2 + 8}`} aria-hidden>
      <rect x={-PAD + 3} y={-PAD + 9} width={w + PAD * 2} height={h + PAD * 2} rx={28} fill={C.shadow} />
      <rect x={-PAD} y={-PAD + 6} width={w + PAD * 2} height={h + PAD * 2} rx={28} fill={C.boardWoodDark} />
      <rect x={-PAD} y={-PAD} width={w + PAD * 2} height={h + PAD * 2} rx={28} fill={C.boardWoodHi} />
      <rect x={-PAD + 3} y={-PAD + 4} width={w + PAD * 2 - 6} height={h + PAD * 2 - 5} rx={25} fill={C.boardWood} />
      <rect x={-8} y={-8} width={w + 16} height={h + 16} rx={19} fill={C.boardWoodDark} />
      <rect x={-6} y={-4} width={w + 12} height={h + 10} rx={17} fill={C.boardInset} />
      {rows.flatMap((row, y) =>
        row.map((glyph, x) => (
          <g key={`${x},${y}`} transform={`translate(${x * CELL + 50} ${y * CELL + 50})`}>
            <TileBase variant="grass" alt={(x + y) % 2 === 1} />
            {glyph === '.' && y === 2 && <GroundDetail seed={cellHash(x, y, 7)} />}
          </g>
        )),
      )}
      {LOOP.segments.map((seg, i) => (
        <SegmentArt key={i} seg={seg} />
      ))}
      {rows.flatMap((row, y) =>
        row.map((glyph, x) =>
          DECOS[glyph] ? (
            <g key={`d${x},${y}`} transform={`translate(${x * CELL + 50} ${y * CELL + 50})`}>
              <DecorationArt
                deco={DECOS[glyph]}
                seed={cellHash(x, y, 3)}
                joins={glyph === 'W' ? ALL_DIRS.filter((d) => isWater(x + DX[d], y + DY[d])) : []}
              />
            </g>
          ) : null,
        ),
      )}
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
