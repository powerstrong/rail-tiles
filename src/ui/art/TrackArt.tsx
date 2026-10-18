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

/** Four small frogs leave the ballast visible between the two continuous rail pairs. */
function CrossArt({ tint }: { tint?: string }) {
  const v = tileSegment(0, 0, N, S);
  const h = tileSegment(0, 0, W, E);
  const ends = [0.08, 0.28, 0.72, 0.92];
  return (
    <g>
      <Ballast seg={v} tint={tint} />
      <Ballast seg={h} tint={tint} />
      {[-1, 1].flatMap((x) => [-1, 1].map((y) => (
        <rect key={`${x},${y}`} x={x * GAUGE * CELL - 5} y={y * GAUGE * CELL - 5} width={10} height={10} rx={2} fill={C.steelPlate} stroke={C.steel} strokeWidth={1.5} />
      )))}
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
 * branch has a coloured route ribbon. The other rails stay visible; the signal's
 * circular arrows identify the automatic flip without needing an idle animation.
 */
export function SwitchArt({ trunk, turn, state }: { trunk: Dir; turn: Dir; state: 0 | 1 }) {
  const straight = tileSegment(0, 0, trunk, opposite(trunk));
  const curved = tileSegment(0, 0, trunk, turn);
  const [active, idle] = state === 0 ? [straight, curved] : [curved, straight];
  const out = state === 0 ? opposite(trunk) : turn;
  const accent = state === 0 ? C.teal : C.amberDark;
  const route = segmentPath(active, 0, CELL);
  const pointer = pointAt(active, 0.68);
  const tangent = tangentAt(active, 0.68);
  const heading = (Math.atan2(tangent.y, tangent.x) * 180) / Math.PI;
  // Lamp: on the trunk half, on the side away from the turn.
  const lx = (DX[trunk] * 0.3 - DX[turn] * 0.3) * CELL;
  const ly = (DY[trunk] * 0.3 - DY[turn] * 0.3) * CELL;
  const arrow = (out * 90 - 90) % 360;
  return (
    <g>
      <Ballast seg={straight} />
      <Ballast seg={curved} />
      <path d={route} stroke={state === 0 ? C.switchBed : C.brassHi} strokeWidth={40} fill="none" />
      <g className="switch-idle">
        <RailsOnly seg={idle} ties={[]} />
      </g>
      <RailsOnly seg={active} ties={[0.2, 0.5, 0.8]} />
      <path d={route} pathLength={100} stroke={accent} strokeWidth={8} strokeDasharray="76 24" strokeDashoffset={-12} strokeLinecap="round" fill="none" />
      <g transform={`translate(${pointer.x * CELL} ${pointer.y * CELL}) rotate(${heading})`}>
        <path d="M-5 -7 L3 0 L-5 7" fill="none" stroke={C.cream} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <g transform={`translate(${lx} ${ly})`}>
        <circle cy={2} r={18} fill={C.shadow} />
        <circle r={18} fill={C.cream} />
        <circle r={12.5} fill={accent} />
        <g fill="none" stroke={C.inkSoft} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
          <path d="M-14 -5 A15 15 0 0 1 11 -10 L7 -10 M11 -10 L11 -14" />
          <path d="M14 5 A15 15 0 0 1 -11 10 L-7 10 M-11 10 L-11 14" />
        </g>
        <path d="M-6 -3 H0 V-7 L7 0 L0 7 V3 H-6Z" fill={C.cream} transform={`rotate(${arrow})`} />
      </g>
    </g>
  );
}
