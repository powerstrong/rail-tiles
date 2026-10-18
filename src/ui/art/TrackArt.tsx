import { memo } from 'react';
import { E, N, S } from '../../engine/dir';
import { type Segment, pointAt, segmentPath, tangentAt, tileSegment } from '../../engine/geometry';
import type { RailKind } from '../../engine/rail';
import { C } from './palette';

/** Cell size in SVG units. All art is drawn around a tile centre at (0, 0). */
export const CELL = 100;

const BALLAST = 50;
const BALLAST_EDGE = 56;
const GAUGE = 0.14; // rail offset from centreline, in cells
const TIE_LEN = 44;
const TIE_W = 8;

function Ties({ seg, count }: { seg: Segment; count: number }) {
  const ties = [];
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const p = pointAt(seg, t);
    const tg = tangentAt(seg, t);
    const angle = (Math.atan2(tg.y, tg.x) * 180) / Math.PI;
    ties.push(
      <g key={i} transform={`translate(${p.x * CELL} ${p.y * CELL}) rotate(${angle})`}>
        <rect x={-TIE_W / 2} y={-TIE_LEN / 2 + 1.5} width={TIE_W} height={TIE_LEN} rx={2} fill={C.tieDark} />
        <rect x={-TIE_W / 2} y={-TIE_LEN / 2} width={TIE_W} height={TIE_LEN} rx={2} fill={C.tie} />
      </g>,
    );
  }
  return <>{ties}</>;
}

/** Ballast bed, sleepers and two steel rails following one track segment. */
export function SegmentArt({ seg, tint }: { seg: Segment; tint?: string }) {
  const center = segmentPath(seg, 0, CELL);
  const left = segmentPath(seg, -GAUGE, CELL);
  const right = segmentPath(seg, GAUGE, CELL);
  const ties = Math.max(2, Math.round(seg.length * 4));
  return (
    <g>
      <path d={center} stroke={C.ballastEdge} strokeWidth={BALLAST_EDGE} fill="none" />
      <path d={center} stroke={tint ?? C.ballast} strokeWidth={BALLAST} fill="none" />
      <Ties seg={seg} count={ties} />
      {[left, right].map((d) => (
        <g key={d}>
          <path d={d} stroke={C.steel} strokeWidth={6} fill="none" />
          <path d={d} stroke={C.steelHi} strokeWidth={2} fill="none" transform="translate(-0.6 -0.8)" />
        </g>
      ))}
    </g>
  );
}

/** A rail piece in its rotation-0 orientation (straight N–S, curve N–E). Rotate the parent to orient it. */
export const RailPieceArt = memo(function RailPieceArt({ kind, tint }: { kind: RailKind; tint?: string }) {
  const seg = tileSegment(0, 0, N, kind === 'straight' ? S : E);
  return <SegmentArt seg={seg} tint={tint} />;
});
