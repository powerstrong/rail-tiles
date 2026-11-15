import { useEffect } from 'react';
import type { PiecesStage, Cell } from './model';
import type { SceneProps } from '../ui/story/kit';
export const COLORS = ['#f4ba57', '#69bcbc', '#ed9182', '#a69bce', '#9bc47c', '#91b8dc', '#dca6c3'];
export const MARKS = ['●', '▲', '◆', '✚', '★', '■', '♥'];
export function Tiles({ cells, index, unit = 40, ghost = false, anchor = false }: { cells: Cell[]; index: number; unit?: number; ghost?: boolean; anchor?: boolean }) {
  return <g pointerEvents="none">{cells.map(([x, y], at) => <g key={`${x},${y}`}><rect x={x * unit + 1} y={y * unit + 1} width={unit - 2} height={unit - 2} rx={unit * .12} fill={COLORS[index]} stroke="#354f55" strokeWidth={ghost ? 2 : 1.1} strokeDasharray={ghost ? '4 3' : undefined} />{anchor && at === 0 && <circle cx={(x + .5) * unit} cy={(y + .5) * unit} r={unit * .3} fill="none" stroke="#253d47" strokeWidth="1.4" />}<text x={(x + .5) * unit} y={(y + .65) * unit} fontSize={unit * .38} textAnchor="middle" fill="#253d47">{MARKS[index]}</text></g>)}</g>;
}
/** Original SVG decorations clipped to the exact silhouette: the filled outline becomes the picture. */
export function Picture({ stage }: { stage: PiecesStage }) {
  const w = stage.cols * 40, h = stage.rows * 40, type = stage.picture;
  const eye = type === 'cat' ? [w * .4, h * .3] : type === 'fish' ? [w * .7, h * .43] : [w * .55, h * .3];
  return <g className="pieces-picture" pointerEvents="none" aria-label="완성된 그림">
    {stage.target.map(([x, y]) => <rect key={`${x},${y}`} x={x * 40} y={y * 40} width="40.2" height="40.2" fill={type === 'fish' || type === 'turtle' ? '#68b3a3' : type === 'cat' ? '#edb468' : '#8fb7d0'} />)}
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      {stage.target.map(([x, y]) => <svg key={`${x},${y}`} x={x * 40} y={y * 40} width="40" height="40" viewBox={`${x * 40} ${y * 40} 40 40`}>
        {type === 'turtle' && <><ellipse cx={w * .48} cy={h * .48} rx={w * .33} ry={h * .33} fill="#38897c" stroke="#e9deb2" strokeWidth="5" /><path d={`M${w * .3} ${h * .25} L${w * .6} ${h * .7} M${w * .65} ${h * .25} L${w * .32} ${h * .7}`} stroke="#e9deb2" strokeWidth="4" /></>}
        {type === 'fish' && <path d={`M${w * .2} 0 Q${w * .7} ${h * .5} ${w * .2} ${h} M${w * .4} 0 Q${w * .9} ${h * .5} ${w * .4} ${h}`} fill="none" stroke="#d5ead0" strokeWidth="12" />}
        {(type === 'car' || type === 'rocket' || type === 'boat') && <><rect x={w * .2} y={h * .26} width={w * .6} height={h * .24} rx="8" fill="#eff9ef" stroke="#426f86" strokeWidth="4" /><path d={`M0 ${h * .7} H${w} M${w * .5} 0 V${h * .6}`} stroke="#426f86" strokeWidth="6" /></>}
        {(type === 'cat' || type === 'bird') && <path d={`M${w * .22} ${h * .66} Q${w * .5} ${h * .9} ${w * .75} ${h * .55}`} fill="none" stroke="#fff1ce" strokeWidth="16" strokeLinecap="round" />}
        {(type === 'fish' || type === 'bird' || type === 'cat' || type === 'turtle') && <><circle cx={eye[0]} cy={eye[1]} r="9" fill="#fff9ea" /><circle cx={eye[0] + 2} cy={eye[1]} r="4" fill="#253d47" />{type === 'cat' && <><circle cx={eye[0] + w * .2} cy={eye[1]} r="9" fill="#fff9ea" /><circle cx={eye[0] + w * .2 + 2} cy={eye[1]} r="4" fill="#253d47" /><path d={`M${w * .49} ${h * .4} l8 0 l-4 5 Z`} fill="#ad615c" /></>}</>}
      </svg>)}
    </svg>
  </g>;
}
export function PiecesScene({ beat, onArrive }: SceneProps) {
  useEffect(() => onArrive(), [onArrive]);
  return <><rect width="560" height="300" fill="#eaf3e9" /><ellipse cx="280" cy="260" rx="220" ry="18" fill="#d4e4d9" /><g transform="translate(160 35)">{[0, 1, 2, 3].map((i) => <g key={i} transform={`translate(${i % 2 * 88 + (beat < 1 ? (i % 2 ? 14 : -14) : 0)} ${Math.floor(i / 2) * 88})`}><Tiles cells={i % 2 ? [[0, 0], [1, 0], [0, 1]] : [[0, 0], [1, 0], [1, 1]]} index={i} /></g>)}</g><text x="280" y="278" textAnchor="middle" fontSize="20" fill="#355a53">{beat > 1 ? '조각을 모으면, 그림이 짠!' : '어떤 그림이 숨어 있을까?'}</text></>;
}
