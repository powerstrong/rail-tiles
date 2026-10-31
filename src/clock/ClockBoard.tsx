import { type CSSProperties, type PointerEvent as ReactPointerEvent, memo, useRef } from 'react';
import { type Action, type ClockStage, REST } from './model';
import { BlockArt, CK, ExitArt, FloorTile, HandArt, HubArt, LeverArt, MouseArt, WallArt } from './ClockArt';
import { blockUp } from './tick';

export const CLOCK_CELL = 100;
const PAD = 34;
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const centre = (stage: ClockStage, cell: number) => ({ x: ((cell % stage.width) + 0.5) * CLOCK_CELL, y: (Math.floor(cell / stage.width) + 0.5) * CLOCK_CELL });
const at = (stage: ClockStage, cell: number) => `translate(${centre(stage, cell).x} ${centre(stage, cell).y})`;

/** Tower frame, floorboards, walls and the door: never changes while a stage is open. */
const Ground = memo(function Ground({ stage }: { stage: ClockStage }) {
  const w = stage.width * CLOCK_CELL;
  const h = stage.height * CLOCK_CELL;
  return (
    <g>
      <rect x={-PAD - 16} y={-PAD - 16} width={w + PAD * 2 + 32} height={h + PAD * 2 + 42} rx={34} fill={CK.night} />
      <rect x={-PAD + 3} y={-PAD + 9} width={w + PAD * 2} height={h + PAD * 2} rx={26} fill={CK.frameDark} />
      <rect x={-PAD} y={-PAD} width={w + PAD * 2} height={h + PAD * 2} rx={26} fill={CK.frame} />
      {/* Brass rivets along the frame. */}
      {Array.from({ length: stage.width }, (_, k) => (
        <g key={k}>
          <circle cx={(k + 0.5) * CLOCK_CELL} cy={-PAD / 2} r={5} fill={CK.brass} />
          <circle cx={(k + 0.5) * CLOCK_CELL} cy={h + PAD / 2} r={5} fill={CK.brass} />
        </g>
      ))}
      <rect x={-6} y={-6} width={w + 12} height={h + 12} rx={12} fill={CK.frameDark} />
      {stage.tiles.map((_, i) => (
        <g key={i} transform={at(stage, i)}>
          <FloorTile seed={hash(i)} />
        </g>
      ))}
      {stage.tiles.map((t, i) =>
        t.t === 'wall' ? (
          <g key={`w${i}`} transform={at(stage, i)}>
            <WallArt />
          </g>
        ) : t.t === 'exit' ? (
          <g key={`e${i}`} transform={at(stage, i)}>
            <ExitArt />
          </g>
        ) : null,
      )}
    </g>
  );
});

interface Props {
  stage: ClockStage;
  cell: number;
  turn: number;
  reversed: boolean;
  /** Quarter turns the hands have made so far (counting back for reversed ticks), for smooth turning. */
  spin: number;
  /** The way the mouse faces (its last step). */
  facing: number;
  won: boolean;
  /** The action a hint suggests. */
  hint: Action | null;
  /** First-stage coaching: a finger swiping this way. */
  guide?: Action | null;
  locked: boolean;
  onAct: (a: Action) => void;
}

const ARROW = 'M0 -64 L28 -30 H12 V-14 H-12 V-30 H-28 Z';

export function ClockBoard({ stage, cell, turn, reversed, spin, facing, won, hint, guide, locked, onAct }: Props) {
  const w = stage.width * CLOCK_CELL;
  const h = stage.height * CLOCK_CELL;
  const svgRef = useRef<SVGSVGElement>(null);
  const press = useRef<{ id: number; x: number; y: number; done: boolean } | null>(null);
  const me = centre(stage, cell);

  const toBoard = (e: ReactPointerEvent) => {
    const ctm = svgRef.current?.getScreenCTM();
    return ctm ? new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse()) : null;
  };
  /** A swipe of a third of a cell or more is a step that way. */
  const swipe = (e: ReactPointerEvent, lifting: boolean) => {
    const p = press.current;
    const q = toBoard(e);
    if (!p || p.done || !q) return;
    const dx = q.x - p.x;
    const dy = q.y - p.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) >= CLOCK_CELL * 0.35) {
      p.done = true;
      onAct((Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0) as Action);
    } else if (lifting && Math.hypot(p.x - me.x, p.y - me.y) < CLOCK_CELL * 0.6) {
      // A tap on the mouse is a rest.
      p.done = true;
      onAct(REST);
    }
  };
  const step = reversed ? -1 : 1;

  return (
    <svg
      ref={svgRef}
      className="board clock-board"
      viewBox={`${-PAD - 16} ${-PAD - 16} ${w + PAD * 2 + 32} ${h + PAD * 2 + 42}`}
      role="img"
      aria-label={`${stage.width}×${stage.height} 시계탑`}
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
        if (press.current?.id === e.pointerId && !locked) swipe(e, false);
      }}
      onPointerUp={(e) => {
        if (press.current?.id !== e.pointerId) return;
        if (!locked) swipe(e, true);
        press.current = null;
      }}
      onPointerCancel={() => {
        press.current = null;
      }}
    >
      <Ground stage={stage} />

      {stage.tiles.map((t, i) =>
        t.t === 'block' ? (
          <g key={`b${i}`} transform={at(stage, i)}>
            <BlockArt color={t.color} up={blockUp(t.color, turn)} />
          </g>
        ) : t.t === 'lever' ? (
          <g key={`l${i}`} transform={at(stage, i)}>
            <LeverArt reversed={reversed} />
          </g>
        ) : null,
      )}

      <clipPath id={`clock-frame-${stage.id}`}>
        <rect x={-PAD + 6} y={-PAD + 6} width={w + PAD * 2 - 12} height={h + PAD * 2 - 12} rx={22} />
      </clipPath>

      {/* Where each hand will be after the next tick, faintly. */}
      <g clipPath={`url(#clock-frame-${stage.id})`}>
      {!won &&
        stage.hands.map((hd, k) => (
          <g key={`n${k}`} transform={at(stage, hd.hub)} pointerEvents="none">
            <g transform={`rotate(${(hd.start + spin + step) * 90})`}>
              <HandArt len={hd.len} ghost />
            </g>
          </g>
        ))}
      </g>

      <g className="clock-mouse" style={{ transform: `translate(${me.x}px, ${me.y}px)` } as CSSProperties} pointerEvents="none">
        <g className={`clock-mouse-body ${won ? 'won' : ''}`} style={{ transform: `rotate(${facing * 90}deg)` } as CSSProperties}>
          <MouseArt happy={won} />
        </g>
      </g>

      <g clipPath={`url(#clock-frame-${stage.id})`}>
        {stage.hands.map((hd, k) => (
          <g key={`h${k}`} transform={at(stage, hd.hub)} pointerEvents="none">
            <g className="clock-hand" style={{ transform: `rotate(${(hd.start + spin) * 90}deg)` } as CSSProperties}>
              <HandArt len={hd.len} />
            </g>
          </g>
        ))}
      </g>
      {stage.hands.map((hd, k) => (
        <g key={`c${k}`} transform={at(stage, hd.hub)} pointerEvents="none">
          <HubArt />
        </g>
      ))}

      {hint !== null && (
        <g transform={`translate(${me.x} ${me.y})`} pointerEvents="none" className="clock-hint">
          {hint === REST ? (
            <g transform="translate(0 -62)">
              <circle r={26} fill="#F6C443" stroke="#fff" strokeWidth={5} />
              <path d="M-9 -12 H9 L0 0 L9 12 H-9 L0 0 Z" fill="#fff" />
            </g>
          ) : (
            <path d={ARROW} transform={`rotate(${hint * 90})`} fill="#F6C443" stroke="#fff" strokeWidth={5} strokeLinejoin="round" />
          )}
        </g>
      )}

      {guide != null && guide !== REST && (
        <g transform={`translate(${me.x} ${me.y}) rotate(${guide * 90})`} pointerEvents="none">
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
