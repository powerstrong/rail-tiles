import { type PointerEvent as ReactPointerEvent, type RefObject, memo, useRef } from 'react';
import type { Dir } from '../engine/dir';
import { CrackArt, CurrentArt, FishArt, HoleArt, ICE, IGLOO_COLORS, IceTile, IglooArt, PenguinArt, PENGUIN_COLORS, RockArt, SnowArt, WaterArt } from './IceArt';
import type { PenguinStage, Push } from './model';

export const ICE_CELL = 100;
const PAD = 22;

const cx = (stage: PenguinStage, cell: number) => ((cell % stage.width) + 0.5) * ICE_CELL;
const cy = (stage: PenguinStage, cell: number) => (Math.floor(cell / stage.width) + 0.5) * ICE_CELL;
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** Ground layer: never changes while a stage is open. */
const IceGround = memo(function IceGround({ stage }: { stage: PenguinStage }) {
  const w = stage.width * ICE_CELL;
  const h = stage.height * ICE_CELL;
  return (
    <g>
      <rect x={-PAD + 2} y={-PAD + 8} width={w + PAD * 2} height={h + PAD * 2} rx={28} fill={ICE.frameDark} />
      <rect x={-PAD} y={-PAD} width={w + PAD * 2} height={h + PAD * 2} rx={28} fill={ICE.frame} />
      <rect x={-PAD + 8} y={-PAD + 5} width={w + PAD * 2 - 16} height={5} rx={2.5} fill={ICE.frameHi} />
      {stage.tiles.map((tile, i) => {
        const x = cx(stage, i);
        const y = cy(stage, i);
        return (
          <g key={i} transform={`translate(${x} ${y})`}>
            {tile.t === 'water' ? <WaterArt /> : <IceTile seed={hash(i)} />}
            {tile.t === 'crack' && <CrackArt />}
            {tile.t === 'current' && <CurrentArt dir={tile.dir} />}
          </g>
        );
      })}
    </g>
  );
});

interface Props {
  stage: PenguinStage;
  /** Penguin positions to draw when not animating. */
  pos: number[];
  fish: number;
  broken: number;
  selected: number;
  won: boolean;
  hint: Push | null;
  penguinRefs: RefObject<(SVGGElement | null)[]>;
  /** A tap on a cell, or a swipe that started on `from` heading `dir`. */
  onTap: (cell: number) => void;
  onSwipe: (from: number, dir: Dir) => void;
  locked: boolean;
}

export function IceBoard({ stage, pos, fish, broken, selected, won, hint, penguinRefs, onTap, onSwipe, locked }: Props) {
  const w = stage.width * ICE_CELL;
  const h = stage.height * ICE_CELL;
  const svgRef = useRef<SVGSVGElement>(null);
  const press = useRef<{ id: number; x: number; y: number; cell: number } | null>(null);

  const cellAt = (e: ReactPointerEvent) => {
    const ctm = svgRef.current?.getScreenCTM();
    if (!ctm) return -1;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    const x = Math.floor(p.x / ICE_CELL);
    const y = Math.floor(p.y / ICE_CELL);
    return x < 0 || y < 0 || x >= stage.width || y >= stage.height ? -1 : y * stage.width + x;
  };

  const down = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (locked || press.current) return;
    press.current = { id: e.pointerId, x: e.clientX, y: e.clientY, cell: cellAt(e) };
    try {
      svgRef.current?.setPointerCapture(e.pointerId);
    } catch {
      // Capture only keeps a swipe that leaves the board.
    }
  };
  const up = (e: ReactPointerEvent<SVGSVGElement>) => {
    const p = press.current;
    if (!p || p.id !== e.pointerId) return;
    press.current = null;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    const rect = svgRef.current!.getBoundingClientRect();
    const threshold = Math.max(18, (rect.width / stage.width) * 0.3);
    if (Math.hypot(dx, dy) >= threshold) {
      const dir: Dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0;
      onSwipe(p.cell, dir);
    } else if (p.cell >= 0) onTap(p.cell);
  };

  return (
    <svg
      ref={svgRef}
      className="board ice-board"
      viewBox={`${-PAD} ${-PAD} ${w + PAD * 2} ${h + PAD * 2 + 8}`}
      role="grid"
      aria-label={`${stage.width}×${stage.height} 얼음판`}
      onPointerDown={down}
      onPointerUp={up}
      onPointerCancel={() => (press.current = null)}
    >
      <IceGround stage={stage} />

      {/* Broken cracked ice opens into water. */}
      {stage.tiles.map((tile, i) =>
        tile.t === 'crack' && broken & (1 << tile.index) ? (
          <g key={`b${i}`} transform={`translate(${cx(stage, i)} ${cy(stage, i)})`} className="pop-in">
            <WaterArt hole />
          </g>
        ) : null,
      )}

      {stage.homes.map((cell, k) => (
        <g key={`h${k}`} transform={`translate(${cx(stage, cell)} ${cy(stage, cell)})`}>
          <HoleArt color={PENGUIN_COLORS[k]} done={pos[k] === cell} />
        </g>
      ))}

      {stage.tiles.map((tile, i) => (
        <g key={`o${i}`} transform={`translate(${cx(stage, i)} ${cy(stage, i)})`} pointerEvents="none">
          {tile.t === 'rock' && <RockArt snowman={tile.deco === 'snowman'} />}
          {tile.t === 'snow' && <SnowArt />}
          {tile.t === 'igloo' && <IglooArt door={tile.door} label={tile.label} color={IGLOO_COLORS[(Number(tile.label) - 1) % IGLOO_COLORS.length]} />}
        </g>
      ))}

      {stage.fish.map((cell, f) =>
        fish & (1 << f) ? null : (
          <g key={`f${f}`} transform={`translate(${cx(stage, cell)} ${cy(stage, cell)})`}>
            <FishArt />
          </g>
        ),
      )}

      {hint && (
        <g transform={`translate(${cx(stage, pos[hint.penguin])} ${cy(stage, pos[hint.penguin])}) rotate(${hint.dir * 90})`} pointerEvents="none" className="ice-hint">
          <path d="M0 -92 L22 -62 H9 V-46 H-9 V-62 H-22 Z" fill="#F6C443" stroke="#fff" strokeWidth={4} strokeLinejoin="round" />
        </g>
      )}

      {pos.map((cell, k) => (
        <g key={`p${k}`} ref={(el) => (penguinRefs.current![k] = el)} transform={`translate(${cx(stage, cell)} ${cy(stage, cell)})`} pointerEvents="none">
          {k === selected && pos.length > 1 && !won && <ellipse cy={34} rx={36} ry={11} fill="none" stroke={PENGUIN_COLORS[k]} strokeWidth={5} className="penguin-pick" />}
          <PenguinArt color={PENGUIN_COLORS[k]} cheer={won} />
        </g>
      ))}
    </svg>
  );
}
