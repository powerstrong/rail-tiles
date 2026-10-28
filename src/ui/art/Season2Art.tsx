import type { ReactNode } from 'react';
import type { Dir } from '../../engine/dir';
import { C } from './palette';
import { BridgeArt, Water } from './SceneryArt';

/** Signal colours 1..3 (buttons, levers, gates, drawbridges). */
export const SIGNAL = ['', '#E5584F', '#3A9AD9', '#E3AE1F'] as const;
export const SIGNAL_DARK = ['', '#B83E37', '#2A74A8', '#B58515'] as const;
export const SIGNAL_NAME = ['', '빨강', '파랑', '노랑'] as const;

/** Round sticker in the tile corner (like passengers), so the rail through the tile stays visible. */
function Sticker({ ring, children, pulse }: { ring: string; children: ReactNode; pulse?: boolean }) {
  return (
    <g transform="translate(-26 -26)">
      {pulse && <circle className="passenger-halo" r={21} fill="none" stroke={ring} strokeWidth={4} />}
      <circle r={21} fill={C.cream} stroke={ring} strokeWidth={3.5} />
      {children}
    </g>
  );
}

/** Floor button: pressed flat once the train has rolled over it. */
export function ButtonArt({ color, pressed }: { color: number; pressed: boolean }) {
  return (
    <Sticker ring={SIGNAL[color]} pulse={!pressed}>
      <ellipse cy={5} rx={13} ry={7} fill={C.steel} />
      <g className="button-cap" style={{ transform: `translateY(${pressed ? 4 : 0}px)` }}>
        <ellipse cy={pressed ? 1 : -2} rx={11} ry={pressed ? 5 : 7} fill={SIGNAL[color]} />
        <ellipse cy={pressed ? 0 : -4} rx={6} ry={pressed ? 2 : 3} fill="#fff" opacity={0.45} />
      </g>
    </Sticker>
  );
}

/** Lever: leans left while its colour is closed, right while open. */
export function LeverArt({ color, on }: { color: number; on: boolean }) {
  return (
    <Sticker ring={SIGNAL[color]}>
      <rect x={-12} y={6} width={24} height={7} rx={3} fill={C.steel} />
      <g className="lever-arm" style={{ transform: `rotate(${on ? 35 : -35}deg)` }}>
        <rect x={-2.5} y={-14} width={5} height={22} rx={2.5} fill={C.inkSoft} />
        <circle cy={-14} r={6} fill={SIGNAL[color]} stroke="#fff" strokeWidth={2} />
      </g>
    </Sticker>
  );
}

/**
 * Level-crossing barrier across the tile. `across` is the arm's direction (perpendicular to
 * the track). Open, it swings up beside its post.
 */
export function GateArt({ color, open, across }: { color: number; open: boolean; across: 0 | 1 }) {
  return (
    <g transform={`rotate(${across * 90})`}>
      {/* Post on the left end; the arm runs to the right across the track. */}
      <g transform="translate(-40 0)">
        <g className="gate-arm" style={{ transform: `rotate(${open ? -82 : 0}deg)` }}>
          <rect x={0} y={-6} width={82} height={12} rx={6} fill="#fff" stroke={C.inkSoft} strokeWidth={2} />
          {[10, 32, 54].map((x) => (
            <rect key={x} x={x} y={-6} width={11} height={12} fill={SIGNAL[color]} />
          ))}
          <circle cx={78} r={4} fill={SIGNAL[color]} />
        </g>
        <circle r={9} fill={C.inkSoft} />
        <circle r={5.5} fill={open ? '#7CF29A' : SIGNAL[color]} className={open ? undefined : 'signal-blink'} />
      </g>
    </g>
  );
}

/** Drawbridge over water: down it is an ordinary bridge; up, both halves tilt back to the banks. */
export function DrawbridgeArt({ rot, joins, down, color }: { rot: number; joins: Dir[]; down: boolean; color: number }) {
  return (
    <g>
      <g className="drawbridge-deck" style={{ opacity: down ? 1 : 0 }}>
        <BridgeArt rot={rot} joins={joins} />
      </g>
      {!down && (
        <g>
          <Water joins={joins} />
          <g transform={`rotate(${rot * 90})`}>
            {[-1, 1].map((s) => (
              <g key={s} transform={`translate(0 ${s * 38})`}>
                <rect x={-31} y={-12} width={62} height={24} rx={3} fill={C.deckDark} />
                <rect x={-31} y={s > 0 ? -12 : -2} width={62} height={14} rx={3} fill={C.deck} />
                <path d={`M-28 ${s > 0 ? -12 : 12} V${s > 0 ? -26 : 26} M28 ${s > 0 ? -12 : 12} V${s > 0 ? -26 : 26}`} stroke={C.inkSoft} strokeWidth={3} />
              </g>
            ))}
          </g>
        </g>
      )}
      <g transform="translate(30 -30)">
        <circle r={11} fill={SIGNAL[color]} stroke="#fff" strokeWidth={3} />
        <path d={down ? 'M-5 -1 L-1 3 L5 -4' : 'M-4 2 L0 -3 L4 2'} stroke="#fff" strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </g>
  );
}

/** Water tower beside the track; a splash shows when the train fills up. */
export function TowerArt({ filled }: { filled: boolean }) {
  return (
    <Sticker ring="#3A9AD9" pulse={!filled}>
      <path d="M-9 13 L-6 0 M9 13 L6 0 M-7 7 H7" stroke={C.tieDark} strokeWidth={2.5} strokeLinecap="round" />
      <rect x={-11} y={-14} width={22} height={15} rx={4} fill="#5DB2E3" stroke="#2A74A8" strokeWidth={2} />
      <path d="M-11 -14 Q0 -21 11 -14" fill="#2A74A8" />
      <rect x={-8} y={-10} width={6} height={3} rx={1.5} fill="#fff" opacity={0.6} />
      {filled && (
        <g className="badge-in" transform="translate(14 14)">
          <circle r={10} fill="#3A9AD9" stroke={C.cream} strokeWidth={3} />
          <path d="M0 -6 Q5 1 0 5 Q-5 1 0 -6 Z" fill="#fff" />
        </g>
      )}
    </Sticker>
  );
}

/** Turntable pit with a deck; the arrow shows which way it sends the train. */
export function TurntableArt({ turn }: { turn: 1 | 3 }) {
  const right = turn === 1;
  return (
    <g>
      <circle r={46} fill={C.stoneSide} />
      <circle r={42} fill={C.stone} />
      <circle r={42} fill="none" stroke={C.bolt} strokeWidth={3} strokeDasharray="5 7" />
      <g transform={right ? undefined : 'scale(-1 1)'}>
        <path d="M-22 -10 A 24 24 0 1 1 -10 22" stroke={C.trainRed} strokeWidth={7} fill="none" strokeLinecap="round" opacity={0.9} />
        <path d="M-22 12 L-8 26 L-2 8 Z" fill={C.trainRed} />
      </g>
      <circle r={9} fill={C.inkSoft} />
      <circle r={4} fill={C.brass} />
    </g>
  );
}

/** A freight wagon waiting beside the track; a check once it is coupled on. */
export function WagonStopArt({ coupled }: { coupled: boolean }) {
  return (
    <Sticker ring={C.amber} pulse={!coupled}>
      {coupled ? (
        <g className="badge-in">
          <circle r={14} fill={C.teal} />
          <path d="M-6 0.5 L-1.5 5 L6.5 -4.5" stroke={C.cream} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>
      ) : (
        <g transform="scale(0.62)">
          <WagonCarArt />
        </g>
      )}
    </Sticker>
  );
}

/** A box wagon facing +x (drawn behind the train while it runs). */
export function WagonCarArt() {
  return (
    <g>
      <rect x={-24} y={-15} width={48} height={33} rx={7} fill={C.shadow} transform="translate(1 3)" />
      {[-18, 10].map((x) => (
        <g key={x} fill={C.ink}>
          <rect x={x} y={-18} width={9} height={6} rx={2.5} />
          <rect x={x} y={12} width={9} height={6} rx={2.5} />
        </g>
      ))}
      <rect x={-24} y={-15} width={48} height={30} rx={6} fill={C.tieDark} />
      <rect x={-21} y={-12} width={42} height={24} rx={4} fill={C.amber} />
      <path d="M-7 -12 V12 M7 -12 V12" stroke={C.tieDark} strokeWidth={2} opacity={0.5} />
      <rect x={-17} y={-9} width={8} height={5} rx={1.5} fill="#fff" opacity={0.5} />
      <rect x={24} y={-3} width={6} height={6} rx={2} fill={C.inkSoft} />
    </g>
  );
}

