import { type PointerEvent as ReactPointerEvent, type RefObject, memo, useMemo, useRef, useState } from 'react';
import { ALL_DIRS, type Dir, DX, DY } from '../engine/dir';
import { type CellPos, type Placements, autoOrient, placeBlock, remaining } from '../engine/editor';
import type { Pose } from '../engine/geometry';
import type { Failure } from '../engine/simulate';
import { type Placement, type Stage, cellAt, cellKey } from '../engine/stage';
import type { RiderProgress, SwitchStates } from '../engine/step';
import { C, RIDER_COLORS } from './art/palette';
import { BridgeArt, DecorationArt, GroundDetail, HomeArt, TunnelArt, TunnelBadge, PassengerArt, StationArt, StationLabel, StopPad, TileBase, cellHash } from './art/SceneryArt';
import { CELL, RailPieceArt, SwitchArt } from './art/TrackArt';
import { AlightFx, BoardingFx, Ceremony } from './art/Ceremony';
import { TrainArt } from './art/TrainArt';
import { poseTransform } from './trainRunner';

export type Tool = 'straight' | 'curve' | 'cross' | 'eraser';

export const BOARD_PAD = 26;

export interface Flash {
  x: number;
  y: number;
  n: number;
}

interface BoardProps {
  stage: Stage;
  placed: Placements;
  editable: boolean;
  tool: Tool;
  showGhost: boolean;
  failure: Failure | null;
  arrived: boolean;
  flash: Flash | null;
  /** Passenger stops the train has already passed through on this run. */
  picked: ReadonlySet<string>;
  /** Delivery passengers: waiting, aboard or home (changes while the train runs). */
  riders: RiderProgress;
  /** Hint: one solution tile to show as a pulsing ghost. */
  hint: Placement | null;
  /** Current branch of every switch (changes while the train runs). */
  switchStates: SwitchStates;
  restPose: Pose;
  trainRef: RefObject<SVGGElement>;
  smokeRef: RefObject<SVGGElement>;
  onCellClick: (x: number, y: number) => void;
  /**
   * Press-and-drag across cells: called with the whole path (adjacent cells, drag order)
   * each time it grows, then once with `done` when the finger lifts.
   * A press that never leaves its cell is a plain tap and goes to onCellClick instead.
   */
  onDrag: (path: readonly CellPos[], done: boolean) => void;
}

interface Stroke {
  pointerId: number;
  path: CellPos[];
  dragging: boolean;
}

/** Cells stepped through going from `a` to `b` (exclusive of a), one axis at a time so the path stays adjacent. */
function walk(a: CellPos, b: CellPos): CellPos[] {
  const out: CellPos[] = [];
  let { x, y } = a;
  while (x !== b.x || y !== b.y) {
    if (Math.abs(b.x - x) >= Math.abs(b.y - y)) x += Math.sign(b.x - x);
    else y += Math.sign(b.y - y);
    out.push({ x, y });
  }
  return out;
}

const centre = (v: number) => v * CELL + CELL / 2;

/** Everything that never changes while a stage is open: board frame, tiles, scenery, stations, fixed rails. */
const StaticLayer = memo(function StaticLayer({ stage }: { stage: Stage }) {
  const w = stage.width * CELL;
  const h = stage.height * CELL;
  const tiles = [];
  const scenery = [];
  for (let y = 0; y < stage.height; y++) {
    for (let x = 0; x < stage.width; x++) {
      const cell = cellAt(stage, x, y)!;
      const seed = cellHash(x, y, stage.number);
      const variant = (cell.type === 'fixed' && !cell.bridge) || cell.type === 'switch' ? 'stone' : cell.type === 'start' || cell.type === 'goal' ? 'paved' : 'grass';
      const t = `translate(${centre(x)} ${centre(y)})`;
      tiles.push(
        <g key={cellKey(x, y)} transform={t}>
          <TileBase variant={variant} alt={(x + y) % 2 === 1} />
          {cell.type === 'empty' && (cell.waypoint ? <StopPad /> : cell.rider ? <StopPad color={RIDER_COLORS[cell.rider.id]} /> : <GroundDetail seed={seed} />)}
        </g>,
      );
      // Water joins neighbouring water and bridges, so rivers read as one body.
      const waterJoins = (): Dir[] =>
        ALL_DIRS.filter((d) => {
          const n = cellAt(stage, x + DX[d], y + DY[d]);
          return (n?.type === 'obstacle' && n.deco === 'water') || (n?.type === 'fixed' && n.bridge);
        });
      if (cell.type === 'obstacle') {
        const joins = cell.deco === 'water' ? waterJoins() : [];
        scenery.push(
          <g key={cellKey(x, y)} transform={t}>
            <DecorationArt deco={cell.deco} seed={seed} joins={joins} />
          </g>,
        );
      } else if (cell.type === 'tunnel') {
        scenery.push(
          <g key={cellKey(x, y)} transform={t}>
            <TunnelArt dir={cell.dir} label={cell.label} />
            <TunnelBadge dir={cell.dir} label={cell.label} />
          </g>,
        );
      } else if (cell.type === 'fixed' && cell.bridge) {
        scenery.push(
          <g key={cellKey(x, y)} transform={t}>
            <BridgeArt rot={cell.rail.rot % 2} joins={waterJoins()} />
          </g>,
        );
      } else if (cell.type === 'fixed') {
        scenery.push(
          <g key={cellKey(x, y)} transform={`${t} rotate(${cell.rail.rot * 90})`}>
            <RailPieceArt kind={cell.rail.kind} tint={C.ballastFixed} />
          </g>,
        );
      }
    }
  }
  return (
    <g>
      <rect x={-BOARD_PAD + 3} y={-BOARD_PAD + 9} width={w + BOARD_PAD * 2} height={h + BOARD_PAD * 2} rx={30} fill={C.shadow} />
      <rect x={-BOARD_PAD} y={-BOARD_PAD + 6} width={w + BOARD_PAD * 2} height={h + BOARD_PAD * 2} rx={30} fill={C.boardWoodDark} />
      <rect x={-BOARD_PAD} y={-BOARD_PAD} width={w + BOARD_PAD * 2} height={h + BOARD_PAD * 2} rx={30} fill={C.boardWoodHi} />
      <rect x={-BOARD_PAD + 3} y={-BOARD_PAD + 4} width={w + BOARD_PAD * 2 - 6} height={h + BOARD_PAD * 2 - 5} rx={27} fill={C.boardWood} />
      <rect x={-BOARD_PAD + 9} y={-BOARD_PAD + 6} width={w + BOARD_PAD * 2 - 18} height={4} rx={2} fill={C.boardWoodHi} opacity={0.7} />
      <rect x={-8} y={-8} width={w + 16} height={h + 16} rx={19} fill={C.boardWoodDark} />
      <rect x={-6} y={-4} width={w + 12} height={h + 10} rx={17} fill={C.boardInset} />
      {tiles}
      {scenery}
      {(['start', 'goal'] as const).map((kind) => {
        const st = stage[kind];
        return (
          <g key={kind} transform={`translate(${centre(st.x)} ${centre(st.y)})`}>
            <StationArt dir={st.dir} kind={kind} />
          </g>
        );
      })}
    </g>
  );
});

function PlacedRails({ placed, eraseHover, swapHover }: { placed: Placements; eraseHover: string | null; swapHover: string | null }) {
  return (
    <g>
      {Object.entries(placed).map(([key, rail]) => {
        const [x, y] = key.split(',').map(Number);
        // Keyed by kind too, so a swapped piece remounts and plays its pop-in.
        return (
          <g key={`${key}:${rail.kind}`} transform={`translate(${centre(x)} ${centre(y)})`} opacity={swapHover === key ? 0.25 : 1}>
            <g className="rail-spin" style={{ transform: `rotate(${rail.spin * 90}deg)` }}>
              <g className="rail-pop">
                <RailPieceArt kind={rail.kind} />
              </g>
            </g>
            {eraseHover === key && <rect x={-46} y={-46} width={92} height={92} rx={12} fill={C.danger} opacity={0.22} />}
          </g>
        );
      })}
    </g>
  );
}

function FailMarker({ failure, stage, riders }: { failure: Failure; stage: Stage; riders: RiderProgress }) {
  // Undelivered passengers: ring the pickup if they never boarded, else their house.
  const missedRiders = (failure.undelivered ?? []).flatMap((id) => {
    const r = stage.riders.find((rr) => rr.id === id);
    return r ? [(riders[id] ?? 0) === 0 ? r.pickup : r.drop] : [];
  });
  const at = failure.edge === undefined ? failure.cell : failure.from;
  const ex = failure.edge === undefined ? 0 : DX[failure.edge] * 0.5;
  const ey = failure.edge === undefined ? 0 : DY[failure.edge] * 0.5;
  return (
    <g pointerEvents="none">
      {[...(failure.missedWaypoints ?? []), ...missedRiders].map((p) => (
        <circle key={cellKey(p.x, p.y)} className="pulse-ring" cx={centre(p.x) - 30} cy={centre(p.y) - 30} r={22} fill="none" stroke={C.danger} strokeWidth={5} />
      ))}
      <g transform={`translate(${(at.x + 0.5 + ex) * CELL} ${(at.y + 0.5 + ey) * CELL})`}>
        <circle className="pulse-ring" r={20} fill="none" stroke={C.danger} strokeWidth={5} />
        <g className="pop-in">
          <circle r={17} fill={C.danger} stroke="#fff" strokeWidth={4} />
          <path d="M-6 -6 L6 6 M6 -6 L-6 6" stroke="#fff" strokeWidth={4.5} strokeLinecap="round" />
        </g>
      </g>
    </g>
  );
}

export function Board(props: BoardProps) {
  const { stage, placed, editable, tool, showGhost, failure, arrived, flash, picked, riders, hint, switchStates, restPose, trainRef, smokeRef, onCellClick, onDrag } = props;
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const stroke = useRef<Stroke | null>(null);

  const cellFromEvent = (e: ReactPointerEvent): CellPos | null => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    const x = Math.floor(pt.x / CELL);
    const y = Math.floor(pt.y / CELL);
    return x >= 0 && y >= 0 && x < stage.width && y < stage.height ? { x, y } : null;
  };

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!editable || stroke.current || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const cell = cellFromEvent(e);
    if (!cell) return;
    stroke.current = { pointerId: e.pointerId, path: [cell], dragging: false };
    try {
      svgRef.current?.setPointerCapture(e.pointerId);
    } catch {
      // Capture is a nicety (keeps the drag when the finger slides off the board); carry on without it.
    }
  };

  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const s = stroke.current;
    const cell = cellFromEvent(e);
    if (e.pointerType === 'mouse') setHover((h) => (h?.x === cell?.x && h?.y === cell?.y ? h : cell));
    if (!s || s.pointerId !== e.pointerId || !cell) return;
    const last = s.path[s.path.length - 1];
    if (last.x === cell.x && last.y === cell.y) return;
    s.path.push(...walk(last, cell));
    s.dragging = true;
    onDrag([...s.path], false);
  };

  const endStroke = (e: ReactPointerEvent<SVGSVGElement>, cancelled: boolean) => {
    const s = stroke.current;
    if (!s || s.pointerId !== e.pointerId) return;
    stroke.current = null;
    if (s.dragging) onDrag(s.path, true);
    else if (!cancelled) onCellClick(s.path[0].x, s.path[0].y);
  };
  const w = stage.width * CELL;
  const h = stage.height * CELL;
  const hoverKey = hover ? cellKey(hover.x, hover.y) : null;

  const preview = useMemo(() => {
    if (!editable || !hover || tool === 'eraser') return null;
    const key = cellKey(hover.x, hover.y);
    const existing = placed[key];
    // Hovering a rail of the other kind previews the swap; the same kind just rotates on click.
    if (existing) {
      if (existing.kind === tool || remaining(stage, placed)[tool] <= 0) return null;
      const without = { ...placed };
      delete without[key];
      return { ...hover, rot: autoOrient(stage, without, hover.x, hover.y, tool), kind: tool, swap: true };
    }
    if (placeBlock(stage, placed, hover.x, hover.y, tool)) return null;
    return { ...hover, rot: autoOrient(stage, placed, hover.x, hover.y, tool), kind: tool, swap: false };
  }, [editable, hover, tool, stage, placed]);

  const ghosts = showGhost ? stage.solution.filter((p) => !placed[cellKey(p.x, p.y)]) : [];

  return (
    <svg
      className="board"
      viewBox={`${-BOARD_PAD} ${-BOARD_PAD} ${w + BOARD_PAD * 2} ${h + BOARD_PAD * 2 + 10}`}
      ref={svgRef}
      role="grid"
      aria-label={`${stage.width}×${stage.height} 게임판`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => endStroke(e, false)}
      onPointerCancel={(e) => endStroke(e, true)}
      onPointerLeave={() => setHover(null)}
    >
      <StaticLayer stage={stage} />

      {ghosts.map((p, i) => (
        <g key={cellKey(p.x, p.y)} transform={`translate(${centre(p.x)} ${centre(p.y)}) rotate(${p.rail.rot * 90})`} pointerEvents="none">
          <g className="ghost" style={{ animationDelay: `${i * 0.18}s` }}>
            <RailPieceArt kind={p.rail.kind} />
          </g>
        </g>
      ))}

      {stage.switches.map((key) => {
        const [x, y] = key.split(',').map(Number);
        const cell = cellAt(stage, x, y);
        if (cell?.type !== 'switch') return null;
        return (
          <g key={key} transform={`translate(${centre(x)} ${centre(y)})`} pointerEvents="none">
            <SwitchArt trunk={cell.trunk} turn={cell.turn} state={switchStates[key] ?? cell.initial} />
          </g>
        );
      })}

      <PlacedRails
        placed={placed}
        eraseHover={editable && tool === 'eraser' && hoverKey && placed[hoverKey] ? hoverKey : null}
        swapHover={preview?.swap ? cellKey(preview.x, preview.y) : null}
      />

      {hint && (
        <g transform={`translate(${centre(hint.x)} ${centre(hint.y)})`} pointerEvents="none">
          <rect className="hint-ring" x={-47} y={-47} width={94} height={94} rx={13} fill="none" stroke={C.gold} strokeWidth={5} />
          <g transform={`rotate(${hint.rail.rot * 90})`}>
            <g className="ghost hint-ghost">
              <RailPieceArt kind={hint.rail.kind} />
            </g>
          </g>
        </g>
      )}

      {preview && (
        <g transform={`translate(${centre(preview.x)} ${centre(preview.y)}) rotate(${preview.rot * 90})`} opacity={preview.swap ? 0.75 : 0.5} pointerEvents="none">
          <RailPieceArt kind={preview.kind} />
        </g>
      )}

      {stage.waypoints.map((p) => {
        const key = cellKey(p.x, p.y);
        return (
          <g key={key} transform={`translate(${centre(p.x)} ${centre(p.y)})`} pointerEvents="none">
            <PassengerArt picked={picked.has(key)} seed={cellHash(p.x, p.y, 11)} />
          </g>
        );
      })}

      {stage.riders.map((r) => {
        const color = RIDER_COLORS[r.id];
        const state = riders[r.id] ?? 0;
        return (
          <g key={r.id} pointerEvents="none">
            <g transform={`translate(${centre(r.pickup.x)} ${centre(r.pickup.y)})`}>
              <PassengerArt picked={state > 0} seed={cellHash(r.pickup.x, r.pickup.y, 11)} color={color} />
            </g>
            <g transform={`translate(${centre(r.drop.x)} ${centre(r.drop.y)})`}>
              <HomeArt color={color} delivered={state === 2} />
            </g>
          </g>
        );
      })}


      <g ref={smokeRef} pointerEvents="none" />
      <g ref={trainRef} transform={poseTransform(restPose, CELL)} opacity={restPose.alpha} pointerEvents="none">
        <g className={arrived ? 'train-cheer' : failure ? 'train-crash' : undefined}>
          <TrainArt />
        </g>
      </g>

      {/* Boarding greetings sit above the train that is waiting on the passenger's tile. */}
      {stage.waypoints.map((p) => {
        const key = cellKey(p.x, p.y);
        if (!picked.has(key)) return null;
        return (
          <g key={key} transform={`translate(${centre(p.x)} ${centre(p.y)})`}>
            <BoardingFx seed={cellHash(p.x, p.y, 11)} bubbleBelow={p.y === 0} />
          </g>
        );
      })}

      {stage.riders.map((r) => {
        const state = riders[r.id] ?? 0;
        const color = RIDER_COLORS[r.id];
        return (
          <g key={`fx-${r.id}`}>
            {state >= 1 && (
              <g transform={`translate(${centre(r.pickup.x)} ${centre(r.pickup.y)})`}>
                <BoardingFx seed={cellHash(r.pickup.x, r.pickup.y, 11)} bubbleBelow={r.pickup.y === 0} color={color} />
              </g>
            )}
            {state === 2 && (
              <g transform={`translate(${centre(r.drop.x)} ${centre(r.drop.y)})`}>
                <AlightFx seed={cellHash(r.drop.x, r.drop.y, 5)} color={color} bubbleBelow={r.drop.y === 0} />
              </g>
            )}
          </g>
        );
      })}

      {/* Station signs sit above the train so they stay readable while it waits in the station. */}
      {(['start', 'goal'] as const).map((kind) => (
        <g key={kind} transform={`translate(${centre(stage[kind].x)} ${centre(stage[kind].y)})`}>
          <StationLabel dir={stage[kind].dir} kind={kind} />
        </g>
      ))}

      {failure && <FailMarker failure={failure} stage={stage} riders={riders} />}

      {arrived && (
        <Ceremony
          cx={centre(stage.goal.x)}
          cy={centre(stage.goal.y)}
          bubbleBelow={stage.goal.y < stage.height / 2}
          passengers={picked.size}
          seed={stage.number}
        />
      )}

      {flash && (
        <rect
          key={flash.n}
          className="flash-bad"
          x={flash.x * CELL + 4}
          y={flash.y * CELL + 4}
          width={CELL - 8}
          height={CELL - 8}
          rx={12}
          fill={C.danger}
          pointerEvents="none"
        />
      )}

      <g className={editable ? 'hit-layer' : 'hit-layer locked'}>
        {Array.from({ length: stage.height }, (_, y) =>
          Array.from({ length: stage.width }, (_, x) => (
            <rect
              key={cellKey(x, y)}
              x={x * CELL}
              y={y * CELL}
              width={CELL}
              height={CELL}
              fill="transparent"
            />
          )),
        )}
      </g>
    </svg>
  );
}
