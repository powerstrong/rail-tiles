import { useEffect } from 'react';
import { THREADS } from './model';
import { Rail, RideTrain, TRACK_Y, type SceneProps } from '../ui/story/kit';

export function ThreadMark({ color, x = 0, y = 0, scale = 1 }: { color: number; x?: number; y?: number; scale?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`} fill="currentColor" aria-hidden="true">
    {color === 0 ? <circle r="8" /> : color === 1 ? <path d="M0 -9 L9 7 H-9 Z" /> : color === 2 ? <path d="M0 -10 L9 0 L0 10 L-9 0 Z" /> : <rect x="-7" y="-7" width="14" height="14" rx="1" />}
  </g>;
}
export function FlowEmblem({ size }: { size?: number }) {
  const box = size ? { x: -size / 2, y: -size / 2, width: size, height: size } : {};
  return <svg viewBox="0 0 48 48" aria-hidden="true" {...box}>
    <rect x="3" y="5" width="42" height="39" rx="10" fill="#f5e7cc" stroke="#ba9873" strokeDasharray="3 2" />
    <path d="M12 14 H34 V24" stroke="#b75143" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <path d="M12 34 H35" stroke="#276f91" strokeWidth="4" strokeLinecap="round" fill="none" />
    <circle cx="12" cy="14" r="5" fill="#b75143" stroke="#fff7e9" strokeWidth="2" />
    <circle cx="34" cy="24" r="5" fill="#b75143" stroke="#fff7e9" strokeWidth="2" />
    <path d="M12 29 L17 37 H7 Z M35 29 L40 37 H30 Z" fill="#276f91" stroke="#fff7e9" strokeWidth="1.5" />
  </svg>;
}
export function Spool({ happy = false }: { happy?: boolean }) {
  return <svg viewBox="0 0 90 85" width="90" height="85" aria-hidden="true"><ellipse cx="46" cy="74" rx="32" ry="6" fill="#e0cdb5" /><path d="M22 15 H66 L62 64 H26 Z" fill="#bc7753" /><rect x="19" y="10" width="51" height="10" rx="5" fill="#a35c3f" /><rect x="19" y="61" width="51" height="10" rx="5" fill="#a35c3f" /><rect x="23" y="22" width="43" height="38" rx="12" fill="#46928e" /><path d="M27 26 L62 34 M25 36 L64 44 M26 47 L61 55" stroke="#6aafaa" strokeWidth="3" /><circle cx="35" cy="39" r="2.4" fill="#253e3d" /><circle cx="53" cy="39" r="2.4" fill="#253e3d" /><path d={happy ? 'M36 45 Q44 58 53 45 Z' : 'M38 46 Q44 52 50 46'} fill={happy ? '#fff6df' : 'none'} stroke="#253e3d" strokeWidth="2" strokeLinecap="round" /><path d="M22 44 Q2 31 10 21 M65 44 Q82 46 78 60" stroke="#3f8783" strokeWidth="4" fill="none" strokeLinecap="round" /></svg>;
}
export function FlowScene({ beat, hurry, onArrive }: SceneProps) {
  useEffect(() => { if (hurry) onArrive(); }, [hurry, onArrive]);
  return <><rect width="560" height="300" fill="#eee6d5" />
    {[65,180,295,410].map((x, i) => <g key={x} transform={`translate(${x} 40)`}>
      <path d="M0 0 H82 V115 L41 145 L0 115 Z" fill={i % 2 ? '#d9e5d7' : '#f6d9bf'} stroke="#ad997a" strokeDasharray="4 3" />
      <path d={`M20 30 H60 ${beat ? 'V85 H20' : ''}`} fill="none" stroke={THREADS[i].color} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <g style={{ color: THREADS[i].color }}><ThreadMark color={i} x={20} y={30} /><ThreadMark color={i} x={20} y={85} /></g>
    </g>)}
    <g transform="translate(257 155) scale(.7)"><Spool happy={beat > 0} /></g>
    <Rail a={[0, TRACK_Y]} b={[560, TRACK_Y]} /><RideTrain path={[[-60, TRACK_Y], [155, TRACK_Y]]} at={1} hurry={hurry} onReach={onArrive} />
  </>;
}
