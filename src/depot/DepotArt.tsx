import type { Dir } from '../engine/dir';
import { TrainArt } from '../ui/art/TrainArt';
import { type TrainLook, itemById } from '../ui/look';
import type { Vehicle } from './model';

/** Depot world palette: concrete yard, brick walls, brass and a deep teal accent. */
export const DP = {
  floor: '#ECE7DD',
  floorAlt: '#E4DED2',
  floorEdge: '#D2CABB',
  bolt: '#C9C0AE',
  rail: '#A7ADB6',
  railHi: '#C9CED6',
  tie: '#CDB89B',
  frame: '#B8673F',
  frameDark: '#8E4A2B',
  frameHi: '#D98E62',
  mortar: '#9C5434',
  teal: '#2E6F8E',
  brass: '#E0B145',
  brassDark: '#B88A26',
  ink: '#2E3445',
  shadow: 'rgba(40, 40, 50, 0.18)',
  window: '#CDEFF5',
  windowHi: '#F4FCFF',
  barrierRed: '#E5584F',
  button: '#F2C43E',
  buttonDark: '#C99A1F',
  tower: '#4E8FB0',
  towerDark: '#356F8E',
  wood: '#C98D52',
  woodDark: '#9C6A3A',
} as const;

/** Coach colours (two-cell wagons) and freight colours (three-cell wagons). */
/** Green first and blue last, so coaches rarely share a colour with the locomotives (red, blue). */
export const COACH_COLORS = [
  { main: '#4CAF6A', dark: '#378A50', roof: '#BFE6C9' },
  { main: '#F2C13A', dark: '#C99A1F', roof: '#FCE8A8' },
  { main: '#8E6BD1', dark: '#6A4BAD', roof: '#D8CAF4' },
  { main: '#2FA3B8', dark: '#217F91', roof: '#B5E3EC' },
  { main: '#EC6A8E', dark: '#C64C70', roof: '#F8C6D4' },
  { main: '#4C9BE0', dark: '#3478B5', roof: '#B9DBF6' },
];
export const FREIGHT_COLORS = [
  { main: '#A8693F', dark: '#7E4C2A', roof: '#C99470' },
  { main: '#E0782E', dark: '#B25A1C', roof: '#F2B58A' },
  { main: '#7F8896', dark: '#5E6672', roof: '#B9BFC9' },
  { main: '#B5533F', dark: '#8A3B2B', roof: '#D99282' },
];

/** The second locomotive's look: a colour that stands apart from the player's own train. */
export function secondLook(main: TrainLook): TrainLook {
  const blueish = ['body-blue', 'body-night', 'body-jewel'].includes(main.body);
  return { body: blueish ? 'body-yellow' : 'body-blue', roof: blueish ? 'roof-orange' : 'roof-navy', smoke: 'smoke-cloud', deco: 'deco-none' };
}

/** Flag colour for a locomotive's gate: its body colour. */
export const gateColor = (look: TrainLook) => itemById(look.body)?.paint?.main ?? '#E5584F';

export function FloorTile({ seed }: { seed: number }) {
  return (
    <g>
      <rect x={-48} y={-48} width={96} height={96} rx={10} fill={seed > 0.5 ? DP.floor : DP.floorAlt} />
      <rect x={-48} y={42} width={96} height={6} rx={3} fill={DP.floorEdge} opacity={0.6} />
      <circle cx={-36} cy={-36} r={2.5} fill={DP.bolt} />
      <circle cx={36} cy={36} r={2.5} fill={DP.bolt} />
    </g>
  );
}

/** Faint rails along a whole line of the yard, so each wagon shows which way it can roll. */
export function LineRails({ horizontal, length }: { horizontal: boolean; length: number }) {
  const ties = Array.from({ length: length * 3 }, (_, k) => 100 / 6 + (k * 100) / 3);
  return (
    <g transform={horizontal ? undefined : 'rotate(90)'} opacity={0.75}>
      {ties.map((x) => (
        <rect key={x} x={x - 4} y={-26} width={8} height={52} rx={2} fill={DP.tie} />
      ))}
      <rect x={4} y={-20} width={length * 100 - 8} height={5} rx={2} fill={DP.rail} />
      <rect x={4} y={15} width={length * 100 - 8} height={5} rx={2} fill={DP.rail} />
    </g>
  );
}

export function BlockArt({ deco }: { deco: 'tower' | 'crates' }) {
  if (deco === 'tower') {
    return (
      <g>
        <ellipse cy={38} rx={34} ry={8} fill={DP.shadow} />
        <path d="M-24 34 L-16 -2 M24 34 L16 -2 M-20 18 H20 M-22 28 L18 6 M22 28 L-18 6" stroke={DP.woodDark} strokeWidth={5} strokeLinecap="round" />
        <rect x={-30} y={-30} width={60} height={34} rx={10} fill={DP.towerDark} />
        <rect x={-30} y={-32} width={60} height={30} rx={10} fill={DP.tower} />
        <path d="M-22 -24 H8" stroke="#8CC3DD" strokeWidth={5} strokeLinecap="round" />
        <path d="M-34 -32 L0 -46 L34 -32 Z" fill={DP.brass} stroke={DP.brassDark} strokeWidth={3} strokeLinejoin="round" />
        <path d="M30 -14 H40 V2" stroke={DP.brassDark} strokeWidth={5} fill="none" strokeLinecap="round" />
      </g>
    );
  }
  return (
    <g>
      <ellipse cy={38} rx={36} ry={8} fill={DP.shadow} />
      {[
        [-32, 2, 34],
        [0, 2, 34],
        [-17, -30, 34],
      ].map(([x, y, s], k) => (
        <g key={k}>
          <rect x={x} y={y} width={s} height={s} rx={4} fill={DP.woodDark} />
          <rect x={x + 2} y={y + 2} width={s - 4} height={s - 6} rx={3} fill={DP.wood} />
          <path d={`M${x + 4} ${y + 4} L${x + s - 4} ${y + s - 6} M${x + s - 4} ${y + 4} L${x + 4} ${y + s - 6}`} stroke={DP.woodDark} strokeWidth={2.5} opacity={0.7} />
        </g>
      ))}
    </g>
  );
}

/** A yellow pad that opens the barriers while a wagon stands on it. */
export function ButtonArt({ pressed }: { pressed: boolean }) {
  return (
    <g>
      <circle r={34} fill={pressed ? '#FFE9A0' : '#F6E3B0'} opacity={pressed ? 0.95 : 0.8} />
      <circle r={26} fill={DP.buttonDark} />
      <circle r={24} cy={pressed ? 0 : -3} fill={DP.button} />
      <path d="M-9 -6 L0 -14 L9 -6 M0 -14 V8" stroke="#fff" strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" transform={pressed ? undefined : 'translate(0 -3)'} />
    </g>
  );
}

/** A level-crossing barrier across the cell: down (closed) or up (open). */
export function BarrierArt({ open, armVertical }: { open: boolean; armVertical: boolean }) {
  // The arm lies across the locomotive's line it guards.
  return (
    <g transform={armVertical ? 'rotate(90)' : undefined}>
      <rect x={-46} y={-46} width={92} height={92} rx={10} fill="none" stroke={DP.button} strokeWidth={5} strokeDasharray="10 8" opacity={0.85} />
      <circle cx={-38} cy={0} r={9} fill={DP.ink} />
      <circle cx={-38} cy={0} r={5} fill={open ? '#4CC46A' : DP.barrierRed} />
      <g transform={`translate(-38 0) rotate(${open ? -80 : 0})`} className="barrier-arm">
        <rect x={0} y={-6} width={82} height={12} rx={6} fill="#fff" stroke={DP.ink} strokeWidth={2} />
        {[12, 36, 60].map((x) => (
          <rect key={x} x={x} y={-6} width={12} height={12} fill={DP.barrierRed} />
        ))}
      </g>
    </g>
  );
}

/** The arch a locomotive leaves through, on the outside of the yard wall, with a flag in its colour. */
export function GateArt({ dir, color }: { dir: Dir; color: string }) {
  return (
    <g transform={`rotate(${(dir - 1) * 90})`}>
      <rect x={-4} y={-46} width={28} height={92} rx={8} fill={DP.frameDark} />
      <rect x={-4} y={-30} width={28} height={60} rx={4} fill="#3B2A22" />
      <path d="M-4 -30 Q10 -44 24 -30" stroke={DP.frameHi} strokeWidth={4} fill="none" />
      <rect x={8} y={-62} width={4} height={30} rx={2} fill={DP.ink} />
      <path d="M12 -62 L34 -55 L12 -48 Z" fill={color} stroke="#fff" strokeWidth={2} strokeLinejoin="round" />
    </g>
  );
}

/** A wagon drawn from above, facing +x, `len` cells long and one cell wide, from (0,0). */
export function WagonArt({ v, selected }: { v: Vehicle; selected?: boolean }) {
  const L = v.len * 100;
  const c = v.kind === 'freight' ? FREIGHT_COLORS[v.color % FREIGHT_COLORS.length] : COACH_COLORS[v.color % COACH_COLORS.length];
  return (
    <g>
      <rect x={10} y={16} width={L - 20} height={76} rx={16} fill={DP.shadow} />
      {/* Couplers */}
      <rect x={2} y={44} width={12} height={12} rx={3} fill={DP.ink} />
      <rect x={L - 14} y={44} width={12} height={12} rx={3} fill={DP.ink} />
      <rect x={10} y={10} width={L - 20} height={80} rx={16} fill={c.dark} />
      <rect x={10} y={10} width={L - 20} height={74} rx={16} fill={c.main} />
      {v.kind === 'coach' ? (
        <>
          {Array.from({ length: v.len * 2 }, (_, k) => {
            const x = 26 + (k * (L - 52)) / (v.len * 2 - 1) - 8;
            return (
              <g key={k}>
                <rect x={x} y={16} width={16} height={11} rx={3} fill={DP.window} />
                <rect x={x} y={66} width={16} height={11} rx={3} fill={DP.window} />
              </g>
            );
          })}
          <rect x={24} y={33} width={L - 48} height={28} rx={12} fill={c.roof} />
          {Array.from({ length: v.len }, (_, k) => (
            <rect key={k} x={50 + k * 100 - 9} y={41} width={18} height={12} rx={4} fill={c.dark} opacity={0.5} />
          ))}
        </>
      ) : (
        <>
          {Array.from({ length: v.len * 3 - 1 }, (_, k) => (
            <rect key={k} x={10 + ((k + 1) * (L - 20)) / (v.len * 3) - 2} y={14} width={4} height={66} rx={2} fill={c.dark} opacity={0.45} />
          ))}
          <rect x={18} y={40} width={L - 36} height={14} rx={7} fill={c.roof} />
        </>
      )}
      {selected && <rect x={4} y={4} width={L - 8} height={92} rx={20} fill="none" stroke="#fff" strokeWidth={6} className="depot-pick" />}
    </g>
  );
}

/** A locomotive two cells long, facing +x from (0,0): the player's train, drawn big. */
export function LocoArt({ look, selected }: { look: TrainLook; selected?: boolean }) {
  return (
    <g>
      <rect x={10} y={16} width={180} height={76} rx={22} fill={DP.shadow} />
      <g transform="translate(102 50) scale(2.45)">
        <TrainArt look={look} />
      </g>
      {selected && <rect x={4} y={4} width={192} height={92} rx={24} fill="none" stroke="#fff" strokeWidth={6} className="depot-pick" />}
    </g>
  );
}
