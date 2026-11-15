import { useEffect } from 'react';
import { Rail, RideTrain, TRACK_Y, type SceneProps } from '../ui/story/kit';
export function CloudScene({ beat, hurry, onArrive }: SceneProps) {
  useEffect(() => { if (hurry) onArrive(); }, [hurry, onArrive]);
  return <><rect width="560" height="300" fill="#e9f2f9" /><svg x="100" y="10" width="360" height="200" viewBox="0 0 360 180" aria-hidden="true">
    <path d="M15 70Q-5 38 34 36Q45 2 76 25Q111 15 112 49Q140 72 104 83H35Z" fill="#fff" />
    <ellipse cx="183" cy="99" rx="67" ry="66" fill="#fff9ed" stroke="#bd956a" strokeWidth="8" />
    {Array.from({ length: beat > 0 ? 9 : 3 }, (_, i) => <path key={i} d={`M${151 + i % 3 * 22} ${65 + Math.floor(i / 3) * 22}l14 14m0 -14l-14 14`} stroke={beat > 1 ? ['#d58269', '#65947d', '#537ead'][i % 3] : '#537ead'} strokeWidth="4" />)}
    <path d="M259 135Q324 111 300 50" fill="none" stroke="#537ead" strokeWidth="3" /><rect x="278" y="121" width="31" height="40" rx="6" fill="#537ead" /><path d="M275 129h37m-37 9h37m-37 9h37" stroke="#fff" strokeWidth="2" /></svg>
    <Rail a={[0, TRACK_Y]} b={[560, TRACK_Y]} />
    <RideTrain path={[[-60, TRACK_Y], [100, TRACK_Y]]} at={1} hurry={hurry} onReach={onArrive} />
  </>;
}
