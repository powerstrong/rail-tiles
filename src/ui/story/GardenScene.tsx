import { useEffect } from 'react';
import { Emblem } from '../WorldSelect';
import { type SceneProps, Rail, RideTrain, TRACK_Y } from './kit';
function GardenScene({ kind, beat, hurry, onArrive }: SceneProps & { kind: 'twins' | 'bee' }) {
  useEffect(() => { if (hurry) onArrive(); }, [hurry, onArrive]);
  return <>
    <rect width="560" height="300" fill={kind === 'twins' ? '#efe5f8' : '#f9efc9'} />
    {[70, 170, 270, 370, 470].map((x, i) => <g key={x} transform={`translate(${x} ${120 + i % 2 * 25})`}><circle r="24" fill="#b5cc91" /><path d="M0 20 V70" stroke="#7e9e65" strokeWidth="6" /><circle r={8 + beat * 2} fill="#e5b976" /></g>)}
    <g transform="translate(280 135)"><Emblem kind={kind} size={90} /></g>
    <Rail a={[0, TRACK_Y]} b={[560, TRACK_Y]} />
    <RideTrain path={[[-60, TRACK_Y], [160, TRACK_Y]]} at={1} hurry={hurry} onReach={onArrive} />
  </>;
}
export const TwinsScene = (props: SceneProps) => <GardenScene {...props} kind="twins" />;
export const BeeScene = (props: SceneProps) => <GardenScene {...props} kind="bee" />;
