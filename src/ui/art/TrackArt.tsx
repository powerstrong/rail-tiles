import { memo } from 'react';
import { DX, DY, type Dir, E, N, S, W, opposite } from '../../engine/dir';
import { type Segment, pointAt, segmentPath, tangentAt, tileSegment } from '../../engine/geometry';
import type { RailKind } from '../../engine/rail';
import { C } from './palette';

/** Cell size in SVG units. All art is drawn around a tile centre at (0, 0). */
export const CELL = 100;

const BALLAST = 46;
const BALLAST_EDGE = 50;
const GAUGE = 0.14; // rail offset from centreline, in cells
const TIE_LEN = 39;
const TIE_W = 6;

function Ties({ seg, count }: { seg: Segment; count: number }) {
  const ties = [];
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const p = pointAt(seg, t);
    const tg = tangentAt(seg, t);
    const angle = (Math.atan2(tg.y, tg.x) * 180) / Math.PI;
    ties.push(
      <g key={i} transform={`translate(${p.x * CELL} ${p.y * CELL}) rotate(${angle})`}>
        <rect x={-TIE_W / 2} y={-TIE_LEN / 2 + 1} width={TIE_W} height={TIE_LEN} rx={1.5} fill={C.tieDark} />
        <rect x={-TIE_W / 2} y={-TIE_LEN / 2} width={TIE_W} height={TIE_LEN} rx={1.5} fill={C.tie} />
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
          <path d={d} stroke={C.steel} strokeWidth={5} fill="none" />
          <path d={d} stroke={C.steelHi} strokeWidth={1.7} fill="none" />
        </g>
      ))}
    </g>
  );
}

/** Rails and sleepers only (no ballast), so two tracks can share one ballast bed. */
function RailsOnly({ seg, ties }: { seg: Segment; ties: number[] }) {
  return (
    <g>
      {ties.map((t) => {
        const p = pointAt(seg, t);
        const tg = tangentAt(seg, t);
        const angle = (Math.atan2(tg.y, tg.x) * 180) / Math.PI;
        return (
          <g key={t} transform={`translate(${p.x * CELL} ${p.y * CELL}) rotate(${angle})`}>
            <rect x={-TIE_W / 2} y={-TIE_LEN / 2 + 1} width={TIE_W} height={TIE_LEN} rx={1.5} fill={C.tieDark} />
            <rect x={-TIE_W / 2} y={-TIE_LEN / 2} width={TIE_W} height={TIE_LEN} rx={1.5} fill={C.tie} />
          </g>
        );
      })}
      {[segmentPath(seg, -GAUGE, CELL), segmentPath(seg, GAUGE, CELL)].map((d) => (
        <g key={d}>
          <path d={d} stroke={C.steel} strokeWidth={5} fill="none" />
          <path d={d} stroke={C.steelHi} strokeWidth={1.7} fill="none" />
        </g>
      ))}
    </g>
  );
}

function Ballast({ seg, tint }: { seg: Segment; tint?: string }) {
  const d = segmentPath(seg, 0, CELL);
  return (
    <g>
      <path d={d} stroke={C.ballastEdge} strokeWidth={BALLAST_EDGE} fill="none" />
      <path d={d} stroke={tint ?? C.ballast} strokeWidth={BALLAST} fill="none" />
    </g>
  );
}

/** Diamond crossing: two straight tracks over one bed, with a steel frog plate where they meet. */
function CrossArt({ tint }: { tint?: string }) {
  const v = tileSegment(0, 0, N, S);
  const h = tileSegment(0, 0, W, E);
  const ends = [0.1, 0.9];
  return (
    <g>
      <Ballast seg={v} tint={tint} />
      <Ballast seg={h} tint={tint} />
      <rect x={-22} y={-22} width={44} height={44} rx={6} fill={C.steelPlate} />
      <rect x={-22} y={-22} width={44} height={44} rx={6} fill="none" stroke={C.steel} strokeWidth={1.5} opacity={0.5} />
      <RailsOnly seg={v} ties={ends} />
      <RailsOnly seg={h} ties={ends} />
    </g>
  );
}

/** A rail piece in its rotation-0 orientation (straight N–S, curve N–E). Rotate the parent to orient it. */
export const RailPieceArt = memo(function RailPieceArt({ kind, tint }: { kind: RailKind; tint?: string }) {
  if (kind === 'cross') return <CrossArt tint={tint} />;
  const seg = tileSegment(0, 0, N, kind === 'straight' ? S : E);
  return <SegmentArt seg={seg} tint={tint} />;
});

/**
 * A switch drawn in place (no parent rotation): both branches share the trunk; the set
 * branch is solid and the other is faded. A lamp on the trunk side points at the set branch.
 */
export function SwitchArt({ trunk, turn, state }: { trunk: Dir; turn: Dir; state: 0 | 1 }) {
  const straight = tileSegment(0, 0, trunk, opposite(trunk));
  const curved = tileSegment(0, 0, trunk, turn);
  const [active, idle] = state === 0 ? [straight, curved] : [curved, straight];
  const out = state === 0 ? opposite(trunk) : turn;
  // Lamp: on the trunk half, on the side away from the turn.
  const lx = (DX[trunk] * 0.3 - DX[turn] * 0.33) * CELL;
  const ly = (DY[trunk] * 0.3 - DY[turn] * 0.33) * CELL;
  const arrow = (out * 90 - 90) % 360;
  return (
    <g>
      <Ballast seg={straight} />
      <Ballast seg={curved} />
      <g className="switch-idle">
        <RailsOnly seg={idle} ties={[]} />
      </g>
      <RailsOnly seg={active} ties={[0.2, 0.5, 0.8]} />
      <g transform={`translate(${lx} ${ly})`}>
        <circle r={11} fill={C.ink} />
        <circle r={8.5} fill={state === 0 ? C.teal : C.amber} />
        <path d="M-3.5 -4.5 L4.5 0 L-3.5 4.5 Z" fill={C.cream} transform={`rotate(${arrow})`} />
      </g>
    </g>
  );
}
