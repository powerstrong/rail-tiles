import { type RefObject, memo, useMemo, useState } from 'react';
import { ALL_DIRS, type Dir, DX, DY } from '../engine/dir';
import { type Placements, autoOrient, placeBlock } from '../engine/editor';
import type { Pose } from '../engine/geometry';
import type { Failure } from '../engine/simulate';
import { type Stage, cellAt, cellKey } from '../engine/stage';
import { C } from './art/palette';
import { DecorationArt, GroundDetail, PassengerArt, StationArt, StationLabel, TileBase, cellHash } from './art/SceneryArt';
import { CELL, RailPieceArt } from './art/TrackArt';
import { TrainArt } from './art/TrainArt';
import { poseTransform } from './trainRunner';

export type Tool = 'straight' | 'curve' | 'eraser';

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
  restPose: Pose;
  trainRef: RefObject<SVGGElement>;
  smokeRef: RefObject<SVGGElement>;
  onCellClick: (x: number, y: number) => void;
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
      const variant = cell.type === 'fixed' ? 'stone' : cell.type === 'start' || cell.type === 'goal' ? 'paved' : 'grass';
      const t = `translate(${centre(x)} ${centre(y)})`;
      tiles.push(
        <g key={cellKey(x, y)} transform={t}>
          <TileBase variant={variant} alt={(x + y) % 2 === 1} />
          {cell.type === 'empty' && <GroundDetail seed={seed} />}
        </g>,
      );
      if (cell.type === 'obstacle') {
        const joins: Dir[] =
          cell.deco === 'water'
            ? ALL_DIRS.filter((d) => {
                const n = cellAt(stage, x + DX[d], y + DY[d]);
                return n?.type === 'obstacle' && n.deco === 'water';
              })
            : [];
        scenery.push(
          <g key={cellKey(x, y)} transform={t}>
            <DecorationArt deco={cell.deco} seed={seed} joins={joins} />
          </g>,
        );
      } else if (cell.type === 'fixed') {
        scenery.push(
          <g key={cellKey(x, y)} transform={`${t} rotate(${cell.rail.rot * 90})`}>
            <RailPieceArt kind={cell.rail.kind} tint="#E2D3B3" />
          </g>,
        );
      }
    }
  }
  return (
    <g>
      <rect x={-BOARD_PAD + 4} y={-BOARD_PAD + 10} width={w + BOARD_PAD * 2} height={h + BOARD_PAD * 2} rx={30} fill={C.shadow} />
      <rect x={-BOARD_PAD} y={-BOARD_PAD + 6} width={w + BOARD_PAD * 2} height={h + BOARD_PAD * 2} rx={30} fill={C.boardWoodDark} />
      <rect x={-BOARD_PAD} y={-BOARD_PAD} width={w + BOARD_PAD * 2} height={h + BOARD_PAD * 2} rx={30} fill={C.boardWood} />
      <rect x={-BOARD_PAD + 6} y={-BOARD_PAD + 5} width={w + BOARD_PAD * 2 - 12} height={10} rx={5} fill={C.boardWoodHi} opacity={0.6} />
      <rect x={-6} y={-6} width={w + 12} height={h + 12} rx={18} fill={C.boardWoodDark} opacity={0.55} />
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

function PlacedRails({ placed, eraseHover }: { placed: Placements; eraseHover: string | null }) {
  return (
    <g>
      {Object.entries(placed).map(([key, rail]) => {
        const [x, y] = key.split(',').map(Number);
        return (
          <g key={key} transform={`translate(${centre(x)} ${centre(y)})`}>
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

function FailMarker({ failure }: { failure: Failure }) {
  const at = failure.edge === undefined ? failure.cell : failure.from;
  const ex = failure.edge === undefined ? 0 : DX[failure.edge] * 0.5;
  const ey = failure.edge === undefined ? 0 : DY[failure.edge] * 0.5;
  return (
    <g pointerEvents="none">
      {failure.missedWaypoints?.map((p) => (
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
  const { stage, placed, editable, tool, showGhost, failure, arrived, flash, restPose, trainRef, smokeRef, onCellClick } = props;
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const w = stage.width * CELL;
  const h = stage.height * CELL;
  const hoverKey = hover ? cellKey(hover.x, hover.y) : null;

  const preview = useMemo(() => {
    if (!editable || !hover || tool === 'eraser') return null;
    if (placeBlock(stage, placed, hover.x, hover.y, tool)) return null;
    return { ...hover, rot: autoOrient(stage, placed, hover.x, hover.y, tool), kind: tool };
  }, [editable, hover, tool, stage, placed]);

  const ghosts = showGhost ? stage.solution.filter((p) => !placed[cellKey(p.x, p.y)]) : [];

  return (
    <svg
      className="board"
      viewBox={`${-BOARD_PAD} ${-BOARD_PAD} ${w + BOARD_PAD * 2} ${h + BOARD_PAD * 2 + 10}`}
      role="grid"
      aria-label={`${stage.width}×${stage.height} 게임판`}
      onPointerLeave={() => setHover(null)}
    >
      <StaticLayer stage={stage} />

      {stage.waypoints.map((p) => (
        <g key={cellKey(p.x, p.y)} transform={`translate(${centre(p.x)} ${centre(p.y)})`}>
          <PassengerArt visited={false} />
        </g>
      ))}

      {ghosts.map((p, i) => (
        <g key={cellKey(p.x, p.y)} transform={`translate(${centre(p.x)} ${centre(p.y)}) rotate(${p.rail.rot * 90})`} pointerEvents="none">
          <g className="ghost" style={{ animationDelay: `${i * 0.18}s` }}>
            <RailPieceArt kind={p.rail.kind} />
          </g>
        </g>
      ))}

      <PlacedRails placed={placed} eraseHover={editable && tool === 'eraser' && hoverKey && placed[hoverKey] ? hoverKey : null} />

      {preview && (
        <g transform={`translate(${centre(preview.x)} ${centre(preview.y)}) rotate(${preview.rot * 90})`} opacity={0.5} pointerEvents="none">
          <RailPieceArt kind={preview.kind} />
        </g>
      )}

      {(['start', 'goal'] as const).map((kind) => (
        <g key={kind} transform={`translate(${centre(stage[kind].x)} ${centre(stage[kind].y)})`}>
          <StationLabel dir={stage[kind].dir} kind={kind} />
          {kind === 'goal' && arrived && <circle className="celebrate-ring" r={40} fill="none" stroke={C.gold} strokeWidth={6} />}
        </g>
      ))}

      <g ref={smokeRef} pointerEvents="none" />
      <g ref={trainRef} transform={poseTransform(restPose, CELL)} pointerEvents="none">
        <g className={failure && !arrived ? 'train-crash' : undefined}>
          <TrainArt />
        </g>
      </g>

      {failure && <FailMarker failure={failure} />}

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
              onClick={() => onCellClick(x, y)}
              onPointerEnter={(e) => {
                if (e.pointerType === 'mouse') setHover({ x, y });
              }}
            />
          )),
        )}
      </g>
    </svg>
  );
}
