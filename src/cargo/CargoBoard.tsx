import type { CSSProperties } from 'react';
import { BOX, CraneHook, GiftBox, LOCO_W, LocoSide, PITCH, Ribbon, SLOT, TOP, UNDER, WAGON_W, WagonArt } from './CargoArt';
import { KINDS, type Move } from './model';
import { boxes, tiedUp, topRun, whyNot } from './yard';

/** What the board shows: the wagons in line order, each with a stable id (so the line can slide). */
export interface LineView {
  w: string[];
  sizes: number[];
  ids: number[];
  left: string;
}

/** Boxes the crane just put down: they fly in from their old place. */
export interface Drop {
  to: number;
  n: number;
  /** Where they came from, relative to where they land (board units). */
  dx: number;
  dy: number;
  /** Changes with every move, so the animation plays again. */
  key: number;
}

/** A wagon being pulled away by the locomotive. */
export interface Leaving {
  id: number;
  w: string;
  size: number;
  key: number;
}

interface Props {
  /** A tied-up wagon the player tried to unload: it flashes. */
  flash: { wagon: number; n: number } | null;
  view: LineView;
  /** Tallest wagon of the stage, so the board never changes size. */
  tallest: number;
  selected: number | null;
  hint: Move | null;
  drop: Drop | null;
  leaving: Leaving | null;
  /** Departures so far, so the locomotive's return plays after each one. */
  trips: number;
  /** The front wagon is tied up with the wrong kind for the board. */
  blocked: boolean;
  won: boolean;
  locked: boolean;
  onTap: (wagon: number) => void;
}

export const wagonX = (i: number) => LOCO_W + PITCH / 2 + i * PITCH;
export const boardWidth = (n: number) => LOCO_W + n * PITCH + 14;

/** Board y of the middle of slot `k` (0 = bottom) above the floor. */
const slotY = (k: number) => -(k + 0.5) * SLOT + 1;

export function CargoBoard({ flash, view, tallest, selected, hint, drop, leaving, trips, blocked, won, locked, onTap }: Props) {
  const n = view.w.length;
  const floor = TOP + tallest * SLOT + 6;
  const W = boardWidth(n);
  const H = floor + UNDER;
  const lift = selected !== null ? topRun(view.w[selected]) : 0;
  const targets = selected === null ? [] : view.w.map((_, i) => i !== selected && !whyNot({ ...view, chain: 0 }, [selected, i]));
  /** What a wagon holds, for screen readers: bottom to top. */
  const says = (i: number) => {
    const s = view.w[i];
    const what = s.length ? `아래부터 ${boxes(s).map((k) => KINDS[k].name).join(', ')}` : '비었음';
    return `${i + 1}번 화차, ${view.sizes[i]}칸, ${what}${tiedUp(s, view.sizes[i]) ? ', 리본으로 묶임' : ''}${i === selected ? ', 크레인이 들고 있음' : ''}`;
  };

  const wagon = (s: string, size: number, i: number | null) => {
    const tied = tiedUp(s, size);
    const ks = boxes(s);
    return (
      <>
        <WagonArt size={size} front={i === 0} />
        {tied && <Ribbon size={size} part="band" />}
        {ks.map((k, slot) => {
          const lifted = i !== null && i === selected && slot >= ks.length - lift;
          const dropping = i !== null && drop && drop.to === i && slot >= ks.length - drop.n;
          const style = dropping ? ({ '--dx': `${drop.dx}px`, '--dy': `${drop.dy}px` } as CSSProperties) : undefined;
          return (
            <g key={`${slot}-${dropping ? drop.key : 0}`} transform={`translate(0 ${slotY(slot)})`}>
              <g className={`cargo-box${lifted ? ' lifted' : ''}${dropping ? ' dropping' : ''}`} style={style}>
                <GiftBox kind={k} />
              </g>
            </g>
          );
        })}
        {tied && <Ribbon size={size} part="bow" />}
      </>
    );
  };

  return (
    <svg className={`board cargo-board${won ? ' won' : ''}`} viewBox={`0 0 ${W} ${H}`} role="group" aria-label={`화물역, 화차 ${n}대${hint ? `. 힌트: ${hint[0] + 1}번에서 ${hint[1] + 1}번으로` : ''}`}>
      <defs>
        <linearGradient id="cargo-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFF3DC" />
          <stop offset="1" stopColor="#FBE3BF" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} rx={22} fill="url(#cargo-sky)" />
      {/* Crane gantry across the top. */}
      <rect x={10} y={10} width={W - 20} height={12} rx={6} fill="#E3AE1F" stroke="#B58515" strokeWidth={2} />
      {Array.from({ length: Math.floor((W - 40) / 28) }, (_, k) => (
        <path key={k} d={`M${24 + k * 28} 12 L${38 + k * 28} 20`} stroke="#B58515" strokeWidth={2} />
      ))}
      {/* Platform and rails. */}
      <rect x={0} y={floor + 28} width={W} height={UNDER - 28} fill="#D9C7A5" />
      <rect x={0} y={floor + 30} width={W} height={5} fill="#8A8F9C" />
      {Array.from({ length: Math.ceil(W / 34) }, (_, k) => (
        <rect key={k} x={k * 34 + 6} y={floor + 35} width={18} height={6} rx={2} fill="#B58B60" />
      ))}

      {/* The locomotive at the front, and the train it is pulling away. */}
      <g transform={`translate(${wagonX(0) - WAGON_W / 2 - 8} ${floor})`}>
        {leaving ? (
          <g key={leaving.key} className="cargo-leave">
            <g transform="translate(0 5) scale(0.84)">
              <LocoSide />
            </g>
            <g transform={`translate(${WAGON_W / 2 + 8} 0)`}>{wagon(leaving.w, leaving.size, null)}</g>
          </g>
        ) : (
          <g key={trips} className={trips ? 'cargo-loco-in' : undefined}>
            <g transform="translate(0 5) scale(0.84)">
              <LocoSide />
            </g>
          </g>
        )}
      </g>

      {/* The line. Wagons keep their id, so they slide up when the front one leaves. */}
      {view.ids.map((id, i) => (
        <g key={id} className="cargo-slot" style={{ transform: `translate(${wagonX(i)}px, ${floor}px)` } as CSSProperties}>
          <g key={flash?.wagon === i ? `f${flash.n}` : 'w'} className={`cargo-wagon${flash?.wagon === i ? ' flash' : ''}${i === selected ? ' selected' : ''}${targets[i] ? ' target' : ''}${selected !== null && !targets[i] && i !== selected ? ' dim' : ''}${i === 0 && blocked ? ' blocked' : ''}`}>
            {wagon(view.w[i], view.sizes[i], i)}
            {tiedUp(view.w[i], view.sizes[i]) && i > 0 && !won && (
              <g transform={`translate(${WAGON_W / 2 - 6} ${-view.sizes[i] * SLOT - 14})`} className="cargo-wait">
                <circle r={11} fill="#FFFBF2" stroke="#C27C2C" strokeWidth={2} />
                <path d="M-4 -6 H4 M-4 6 H4 M-3 -6 C-3 -2 0 -1 0 0 C0 1 -3 2 -3 6 M3 -6 C3 -2 0 -1 0 0 C0 1 3 2 3 6" stroke="#C27C2C" strokeWidth={1.6} fill="none" strokeLinecap="round" />
              </g>
            )}
          </g>
          {i === 0 && blocked && (
            <g transform={`translate(0 ${-view.sizes[0] * SLOT - 30})`} className="cargo-blocked-mark">
              <circle r={13} fill="#E5584F" />
              <path d="M0 -6 V2 M0 6.5 V7" stroke="#FFFFFF" strokeWidth={3.5} strokeLinecap="round" />
            </g>
          )}
          <text y={56} textAnchor="middle" className="cargo-num">
            {i + 1}
          </text>
        </g>
      ))}

      {/* Crane hook over the picked wagon. */}
      {selected !== null && (
        <g transform={`translate(${wagonX(selected)} ${TOP})`}>
          <CraneHook y={floor + slotY(view.w[selected].length - 1) - 10 - BOX / 2 - 4 - TOP} />
        </g>
      )}

      {/* Hint: an arrow from wagon to wagon. */}
      {hint && <HintArrow from={hint[0]} to={hint[1]} view={view} floor={floor} />}

      {/* Tap areas, one per wagon. */}
      <g className={`hit-layer${locked ? ' locked' : ''}`}>
        {view.w.map((_, i) => (
          <rect
            key={i}
            x={wagonX(i) - PITCH / 2}
            y={0}
            width={PITCH}
            height={H}
            fill="transparent"
            role="button"
            tabIndex={locked ? -1 : 0}
            aria-label={says(i)}
            aria-pressed={i === selected}
            onClick={() => !locked && onTap(i)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' && e.key !== ' ') return;
              e.preventDefault();
              if (!locked) onTap(i);
            }}
          />
        ))}
      </g>
    </svg>
  );
}

function HintArrow({ from, to, view, floor }: { from: number; to: number; view: LineView; floor: number }) {
  const ax = wagonX(from);
  const bx = wagonX(to);
  const top = (i: number) => floor + slotY(Math.max(0, view.w[i].length - 1)) - BOX / 2 - 8;
  const ay = top(from);
  const by = floor + slotY(view.w[to].length) - BOX / 2 + 4;
  const peak = Math.min(ay, by) - 46;
  const d = `M${ax} ${ay} C${ax} ${peak} ${bx} ${peak} ${bx} ${by}`;
  return (
    <g className="cargo-hint" pointerEvents="none">
      <path d={d} fill="none" stroke="#FFFFFF" strokeWidth={10} strokeLinecap="round" />
      <path d={d} fill="none" stroke="#E3AE1F" strokeWidth={5} strokeLinecap="round" strokeDasharray="10 9" />
      <path d={`M${bx - 10} ${by - 14} L${bx} ${by} L${bx + 10} ${by - 14}`} fill="none" stroke="#E3AE1F" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={ax} cy={ay} r={7} fill="#E3AE1F" />
    </g>
  );
}
