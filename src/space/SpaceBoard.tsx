import { type CSSProperties, type PointerEvent as ReactPointerEvent, memo, useRef } from 'react';
import type { Dir } from '../engine/dir';
import type { SpaceStage } from './model';
import { CapsuleArt, DockArt, FloorTile, HoleArt, PadArt, SP, StarField, WallArt } from './SpaceArt';

export const SPACE_CELL = 100;
const PAD = 36;
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const at = (stage: SpaceStage, cell: number) => `translate(${((cell % stage.width) + 0.5) * SPACE_CELL} ${(Math.floor(cell / stage.width) + 0.5) * SPACE_CELL})`;

/** Hull, floor, walls, boosters and wormholes: never changes while a stage is open. */
const Ground = memo(function Ground({ stage }: { stage: SpaceStage }) {
  const w = stage.width * SPACE_CELL;
  const h = stage.height * SPACE_CELL;
  return (
    <g>
      <clipPath id={`space-sky-${stage.id}`}>
        <rect x={-PAD - 20} y={-PAD - 20} width={w + PAD * 2 + 40} height={h + PAD * 2 + 50} rx={34} />
      </clipPath>
      <g clipPath={`url(#space-sky-${stage.id})`}>
        <rect x={-PAD - 20} y={-PAD - 20} width={w + PAD * 2 + 40} height={h + PAD * 2 + 50} fill={SP.space} />
        <g transform={`translate(${-PAD - 20} ${-PAD - 20})`}>
          <StarField width={w + PAD * 2 + 40} height={h + PAD * 2 + 50} />
        </g>
      </g>
      <rect x={-PAD + 3} y={-PAD + 9} width={w + PAD * 2} height={h + PAD * 2} rx={30} fill={SP.frameDark} />
      <rect x={-PAD} y={-PAD} width={w + PAD * 2} height={h + PAD * 2} rx={30} fill={SP.frame} />
      {/* Hull lights along the frame. */}
      {Array.from({ length: stage.width }, (_, k) => (
        <g key={k}>
          <circle cx={(k + 0.5) * SPACE_CELL} cy={-PAD / 2} r={4} fill={k % 2 ? '#7BE0A5' : SP.frameHi} />
          <circle cx={(k + 0.5) * SPACE_CELL} cy={h + PAD / 2} r={4} fill={k % 2 ? SP.frameHi : '#7BE0A5'} />
        </g>
      ))}
      <rect x={-8} y={-8} width={w + 16} height={h + 16} rx={16} fill={SP.ink} />
      {stage.tiles.map((_, i) => (
        <g key={i} transform={at(stage, i)}>
          <FloorTile seed={hash(i)} />
        </g>
      ))}
      {stage.tiles.map((t, i) =>
        t.t === 'wall' ? (
          <g key={`w${i}`} transform={at(stage, i)}>
            <WallArt deco={t.deco} />
          </g>
        ) : t.t === 'pad' ? (
          <g key={`p${i}`} transform={at(stage, i)}>
            <PadArt dir={t.dir} />
          </g>
        ) : t.t === 'hole' ? (
          <g key={`h${i}`} transform={at(stage, i)}>
            <HoleArt pair={t.pair} />
          </g>
        ) : null,
      )}
    </g>
  );
});

interface Props {
  stage: SpaceStage;
  /** Where each capsule is drawn right now (it glides between frames). */
  shown: number[];
  /** Bumps per capsule each time it comes out of a wormhole, to replay the pop. */
  warps: number[];
  won: boolean;
  /** The press a hint suggests. */
  hint: Dir | null;
  /** First-stage coaching: a finger swiping this way. */
  guide?: Dir | null;
  locked: boolean;
  onPress: (d: Dir) => void;
}

const ARROW = 'M0 -60 L34 -18 H14 V40 H-14 V-18 H-34 Z';

export function SpaceBoard({ stage, shown, warps, won, hint, guide, locked, onPress }: Props) {
  const w = stage.width * SPACE_CELL;
  const h = stage.height * SPACE_CELL;
  const svgRef = useRef<SVGSVGElement>(null);
  const press = useRef<{ id: number; x: number; y: number; done: boolean } | null>(null);

  const toBoard = (e: ReactPointerEvent) => {
    const ctm = svgRef.current?.getScreenCTM();
    return ctm ? new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse()) : null;
  };
  /** A swipe of a third of a cell or more, anywhere on the board, is a press that way. */
  const swipe = (e: ReactPointerEvent) => {
    const p = press.current;
    const q = toBoard(e);
    if (!p || p.done || !q) return;
    const dx = q.x - p.x;
    const dy = q.y - p.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SPACE_CELL * 0.35) return;
    p.done = true;
    onPress((Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0) as Dir);
  };

  return (
    <svg
      ref={svgRef}
      className="board space-board"
      viewBox={`${-PAD - 20} ${-PAD - 20} ${w + PAD * 2 + 40} ${h + PAD * 2 + 50}`}
      role="img"
      aria-label={`${stage.width}×${stage.height} 우주 정거장, 캡슐 ${stage.capsules.length}대`}
      onPointerDown={(e) => {
        if (locked || press.current) return;
        const q = toBoard(e);
        if (!q) return;
        press.current = { id: e.pointerId, x: q.x, y: q.y, done: false };
        try {
          svgRef.current?.setPointerCapture(e.pointerId);
        } catch {
          // Capture only keeps a swipe that leaves the board.
        }
      }}
      onPointerMove={(e) => {
        if (press.current?.id === e.pointerId && !locked) swipe(e);
      }}
      onPointerUp={(e) => {
        if (press.current?.id !== e.pointerId) return;
        if (!locked) swipe(e);
        press.current = null;
      }}
      onPointerCancel={() => {
        press.current = null;
      }}
    >
      <Ground stage={stage} />

      {stage.docks.map((c, k) => (
        <g key={`d${k}`} transform={at(stage, c)}>
          <DockArt capsule={stage.capsules[k]} lit={shown[k] === c} />
        </g>
      ))}

      {stage.capsules.map((cap, k) => (
        <g
          key={`c${k}-${warps[k]}`}
          className={`space-capsule ${warps[k] ? 'warped' : ''} ${won ? 'won' : ''}`}
          style={{ transform: `translate(${((shown[k] % stage.width) + 0.5) * SPACE_CELL}px, ${(Math.floor(shown[k] / stage.width) + 0.5) * SPACE_CELL}px)` } as CSSProperties}
          pointerEvents="none"
        >
          <g className="space-capsule-body">
            <CapsuleArt capsule={cap} docked={shown[k] === stage.docks[k]} />
          </g>
        </g>
      ))}

      {hint !== null && (
        <g transform={`translate(${w / 2} ${h / 2}) rotate(${hint * 90})`} pointerEvents="none" className="space-hint">
          <path d={ARROW} fill="#F6C443" stroke="#fff" strokeWidth={6} strokeLinejoin="round" opacity={0.9} />
        </g>
      )}

      {guide != null && (
        <g transform={`translate(${w / 2} ${h / 2 + 60}) rotate(${guide * 90})`} pointerEvents="none">
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
