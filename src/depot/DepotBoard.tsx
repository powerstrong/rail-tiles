import { type CSSProperties, type PointerEvent as ReactPointerEvent, memo, useRef, useState } from 'react';
import type { Dir } from '../engine/dir';
import type { TrainLook } from '../ui/look';
import { BarrierArt, BlockArt, ButtonArt, DP, FloorTile, GateArt, LineRails, LocoArt, WagonArt, gateColor, secondLook } from './DepotArt';
import { type DepotStage, GONE, type Move, type Vehicle, cellOf } from './model';
import { type DepotState, barriersOpen, occupancy, reach } from './slide';

export const DEPOT_CELL = 100;
const PAD = 40;
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** Floor, rails along every wagon's line, blocks and the wall: never changes while a stage is open. */
const Ground = memo(function Ground({ stage }: { stage: DepotStage }) {
  const w = stage.width * DEPOT_CELL;
  const h = stage.height * DEPOT_CELL;
  const lines = [...new Set(stage.vehicles.map((v) => `${v.horizontal ? 'h' : 'v'}${v.line}`))];
  return (
    <g>
      <rect x={-PAD + 3} y={-PAD + 9} width={w + PAD * 2} height={h + PAD * 2} rx={26} fill={DP.frameDark} />
      <rect x={-PAD} y={-PAD} width={w + PAD * 2} height={h + PAD * 2} rx={26} fill={DP.frame} />
      {/* Brick courses on the wall. */}
      <g stroke={DP.mortar} strokeWidth={2} opacity={0.35}>
        {Array.from({ length: Math.floor((h + PAD * 2) / 20) }, (_, k) => (
          <path key={k} d={`M${-PAD + 6} ${-PAD + 14 + k * 20} H${w + PAD - 6}`} />
        ))}
      </g>
      <rect x={-8} y={-8} width={w + 16} height={h + 16} rx={14} fill={DP.frameDark} />
      {stage.tiles.map((_, i) => (
        <g key={i} transform={`translate(${((i % stage.width) + 0.5) * DEPOT_CELL} ${(Math.floor(i / stage.width) + 0.5) * DEPOT_CELL})`}>
          <FloorTile seed={hash(i)} />
        </g>
      ))}
      {lines.map((key) => {
        const horizontal = key[0] === 'h';
        const line = Number(key.slice(1));
        return (
          <g key={key} transform={horizontal ? `translate(0 ${(line + 0.5) * DEPOT_CELL})` : `translate(${(line + 0.5) * DEPOT_CELL} 0)`}>
            <LineRails horizontal={horizontal} length={horizontal ? stage.width : stage.height} />
          </g>
        );
      })}
      {stage.tiles.map((tile, i) =>
        tile.t === 'block' ? (
          <g key={`b${i}`} transform={`translate(${((i % stage.width) + 0.5) * DEPOT_CELL} ${(Math.floor(i / stage.width) + 0.5) * DEPOT_CELL})`}>
            <BlockArt deco={tile.deco} />
          </g>
        ) : null,
      )}
    </g>
  );
});

/** Where a vehicle is drawn (CSS transform in board units) at an offset along its line. */
export function placeVehicle(v: Vehicle, off: number): string {
  const x = v.horizontal ? off * DEPOT_CELL : v.line * DEPOT_CELL;
  const y = v.horizontal ? v.line * DEPOT_CELL : off * DEPOT_CELL;
  const L = v.len * DEPOT_CELL;
  // Locomotives face their gate; wagons only need to lie along their line.
  if (v.kind === 'loco' && v.exit === 3) return `translate(${x + L}px, ${y + DEPOT_CELL}px) rotate(180deg)`;
  if (v.kind === 'loco' && v.exit === 0) return `translate(${x}px, ${y + L}px) rotate(-90deg)`;
  return v.horizontal ? `translate(${x}px, ${y}px)` : `translate(${x + DEPOT_CELL}px, ${y}px) rotate(90deg)`;
}

/** Off-board offset a departed locomotive drives to (just past its gate). */
export function goneOffset(stage: DepotStage, v: Vehicle): number {
  const size = v.horizontal ? stage.width : stage.height;
  return v.exit === 1 || v.exit === 2 ? size + 0.6 : -v.len - 0.6;
}

const centre = (v: Vehicle, off: number) => ({
  x: (v.horizontal ? off + v.len / 2 : v.line + 0.5) * DEPOT_CELL,
  y: (v.horizontal ? v.line + 0.5 : off + v.len / 2) * DEPOT_CELL,
});

/** The direction a move pushes a vehicle. */
export function moveDir(stage: DepotStage, s: DepotState, m: Move): Dir {
  const v = stage.vehicles[m.vehicle];
  const up = m.to === GONE ? v.exit === 1 || v.exit === 2 : m.to > s[m.vehicle];
  return v.horizontal ? (up ? 1 : 3) : up ? 2 : 0;
}

export type Blocked = 'barrier' | 'stuck';

interface Props {
  stage: DepotStage;
  state: DepotState;
  look: TrainLook;
  selected: number;
  won: boolean;
  hint: Move | null;
  /** First-stage coaching: a finger dragging this move. */
  guide?: Move | null;
  locked: boolean;
  onMove: (m: Move) => void;
  onSelect: (vehicle: number) => void;
  /** A tap on an empty cell (moves the selected vehicle there when it can). */
  onTapCell: (cell: number) => void;
  /** A drag that pushed against something: a closed barrier or the end of the way. */
  onBlocked: (why: Blocked) => void;
}

export function DepotBoard({ stage, state, look, selected, won, hint, guide, locked, onMove, onSelect, onTapCell, onBlocked }: Props) {
  const w = stage.width * DEPOT_CELL;
  const h = stage.height * DEPOT_CELL;
  const svgRef = useRef<SVGSVGElement>(null);
  const press = useRef<{ id: number; v: number; x: number; y: number; cell: number; moved: boolean } | null>(null);
  const [drag, setDrag] = useState<{ v: number; delta: number } | null>(null);
  const occ = occupancy(stage, state);
  const open = barriersOpen(stage, occ, -1);
  const looks = [look, secondLook(look)];

  const toBoard = (e: ReactPointerEvent) => {
    const ctm = svgRef.current?.getScreenCTM();
    return ctm ? new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse()) : null;
  };
  const cellAt = (e: ReactPointerEvent) => {
    const p = toBoard(e);
    if (!p) return -1;
    const x = Math.floor(p.x / DEPOT_CELL);
    const y = Math.floor(p.y / DEPOT_CELL);
    return x < 0 || y < 0 || x >= stage.width || y >= stage.height ? -1 : y * stage.width + x;
  };
  /** How far (in cells) a drag may take vehicle `v`, past the gate by a little when it can leave. */
  const limits = (v: number) => {
    const r = reach(stage, state, v, occ);
    const veh = stage.vehicles[v];
    const high = veh.exit === 1 || veh.exit === 2;
    return { r, lo: r.min - state[v] - (r.canLeave && !high ? 1.4 : 0), hi: r.max - state[v] + (r.canLeave && high ? 1.4 : 0), high };
  };

  const down = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (locked || press.current) return;
    const cell = cellAt(e);
    const v = cell >= 0 ? occ[cell] : -1;
    press.current = { id: e.pointerId, v, x: e.clientX, y: e.clientY, cell, moved: false };
    try {
      svgRef.current?.setPointerCapture(e.pointerId);
    } catch {
      // Capture only keeps a drag that leaves the board.
    }
  };
  /** Pointer travel since press `p`, along vehicle `v`'s line, in cells. */
  const along = (e: ReactPointerEvent, p: { x: number; y: number }, v: number) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const px = rect.width / (w + PAD * 2);
    const d = stage.vehicles[v].horizontal ? e.clientX - p.x : e.clientY - p.y;
    return d / px / DEPOT_CELL;
  };
  const move = (e: ReactPointerEvent<SVGSVGElement>) => {
    const p = press.current;
    if (!p || p.id !== e.pointerId || p.v < 0 || locked) return;
    const raw = along(e, p, p.v);
    if (!p.moved && Math.abs(raw) < 0.15) return;
    p.moved = true;
    const { lo, hi } = limits(p.v);
    setDrag({ v: p.v, delta: Math.max(lo, Math.min(hi, raw)) });
  };
  const up = (e: ReactPointerEvent<SVGSVGElement>) => {
    const p = press.current;
    if (!p || p.id !== e.pointerId) return;
    press.current = null;
    setDrag(null);
    if (locked) return;
    // A quick flick may lift off before any move event: judge it by where it ended.
    if (!p.moved && p.v >= 0 && Math.abs(along(e, p, p.v)) >= 0.3) p.moved = true;
    if (!p.moved) {
      if (p.v >= 0) onSelect(p.v);
      else if (p.cell >= 0) onTapCell(p.cell);
      return;
    }
    const v = p.v;
    const raw = along(e, p, v);
    const { r, lo, hi, high } = limits(v);
    const delta = Math.max(lo, Math.min(hi, raw));
    const at = state[v];
    if (r.canLeave && (high ? at + delta > r.max + 0.5 : at + delta < r.min - 0.5)) {
      onMove({ vehicle: v, to: GONE });
      return;
    }
    const to = Math.max(r.min, Math.min(r.max, Math.round(at + delta)));
    if (to !== at) onMove({ vehicle: v, to });
    // Pushed hard against the end of the way: say why it will not go.
    if (raw > hi + 0.35 || raw < lo - 0.35) {
      const veh = stage.vehicles[v];
      const ahead = raw > hi ? r.max + veh.len : r.min - 1;
      const size = veh.horizontal ? stage.width : stage.height;
      const cell = ahead >= 0 && ahead < size ? cellOf(stage, veh, ahead, 0) : -1;
      onBlocked(cell >= 0 && stage.tiles[cell].t === 'barrier' && occ[cell] < 0 ? 'barrier' : 'stuck');
    }
  };

  const hintAt = hint && state[hint.vehicle] !== GONE ? stage.vehicles[hint.vehicle] : null;
  const guideAt = guide && state[guide.vehicle] !== GONE ? stage.vehicles[guide.vehicle] : null;

  return (
    <svg
      ref={svgRef}
      className="board depot-board"
      viewBox={`${-PAD} ${-PAD} ${w + PAD * 2} ${h + PAD * 2 + 10}`}
      role="grid"
      aria-label={`${stage.width}×${stage.height} 기차 차고지`}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={() => {
        press.current = null;
        setDrag(null);
      }}
    >
      <Ground stage={stage} />

      {stage.vehicles.map((v, i) =>
        v.kind === 'loco' ? (
          <g
            key={`g${i}`}
            transform={`translate(${v.horizontal ? (v.exit === 1 ? w + 6 : -6) : (v.line + 0.5) * DEPOT_CELL} ${v.horizontal ? (v.line + 0.5) * DEPOT_CELL : v.exit === 2 ? h + 6 : -6})`}
          >
            <GateArt dir={v.exit!} color={gateColor(looks[v.color])} />
          </g>
        ) : null,
      )}

      {stage.buttons.map((c) => (
        <g key={`k${c}`} transform={`translate(${((c % stage.width) + 0.5) * DEPOT_CELL} ${(Math.floor(c / stage.width) + 0.5) * DEPOT_CELL})`}>
          <ButtonArt pressed={occ[c] >= 0} />
        </g>
      ))}
      {stage.barriers.map((c) => {
        const onRow = stage.vehicles.some((v) => v.kind === 'loco' && v.horizontal && v.line === Math.floor(c / stage.width));
        return (
          <g key={`d${c}`} transform={`translate(${((c % stage.width) + 0.5) * DEPOT_CELL} ${(Math.floor(c / stage.width) + 0.5) * DEPOT_CELL})`}>
            <BarrierArt open={open || occ[c] >= 0} armVertical={onRow} />
          </g>
        );
      })}

      {hintAt && (
        <g pointerEvents="none" className="depot-hint">
          {hint!.to !== GONE && (
            <rect
              x={(hintAt.horizontal ? hint!.to : hintAt.line) * DEPOT_CELL + 8}
              y={(hintAt.horizontal ? hintAt.line : hint!.to) * DEPOT_CELL + 8}
              width={(hintAt.horizontal ? hintAt.len : 1) * DEPOT_CELL - 16}
              height={(hintAt.horizontal ? 1 : hintAt.len) * DEPOT_CELL - 16}
              rx={18}
              fill="rgba(246, 196, 67, 0.25)"
              stroke="#F6C443"
              strokeWidth={6}
              strokeDasharray="14 10"
            />
          )}
        </g>
      )}

      {stage.vehicles.map((v, i) => {
        const gone = state[i] === GONE;
        const off = gone ? goneOffset(stage, v) : state[i] + (drag?.v === i ? drag.delta : 0);
        return (
          <g
            key={`v${i}`}
            className={`depot-car ${drag?.v === i ? 'dragging' : ''} ${gone ? 'gone' : ''}`}
            style={{ transform: placeVehicle(v, off) } as CSSProperties}
            pointerEvents="none"
          >
            {v.kind === 'loco' ? <LocoArt look={looks[v.color]} selected={i === selected && !won && !gone} /> : <WagonArt v={v} selected={i === selected && !won} />}
          </g>
        );
      })}

      {hintAt && (
        <g transform={`translate(${centre(hintAt, state[hint!.vehicle]).x} ${centre(hintAt, state[hint!.vehicle]).y}) rotate(${moveDir(stage, state, hint!) * 90})`} pointerEvents="none" className="depot-hint">
          <path d="M0 -70 L24 -40 H10 V-18 H-10 V-40 H-24 Z" fill="#F6C443" stroke="#fff" strokeWidth={5} strokeLinejoin="round" />
        </g>
      )}

      {guideAt && (
        <g transform={`translate(${centre(guideAt, state[guide!.vehicle]).x} ${centre(guideAt, state[guide!.vehicle]).y}) rotate(${moveDir(stage, state, guide!) * 90})`} pointerEvents="none">
          <g className="swipe-guide">
            <path d="M0 -20 V-130" stroke="#fff" strokeWidth={10} strokeLinecap="round" strokeDasharray="2 20" opacity={0.9} />
            <path d="M-16 -112 L0 -136 L16 -112" stroke="#fff" strokeWidth={10} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <g className="swipe-finger">
              <circle r={22} fill="#F6C443" stroke="#fff" strokeWidth={5} opacity={0.95} />
              <circle r={8} fill="#fff" />
            </g>
          </g>
        </g>
      )}
    </svg>
  );
}
