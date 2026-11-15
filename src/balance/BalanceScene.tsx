import { BalanceEmblem, CandyArt } from './art';
import { Rail, RideTrain, TRACK_Y, type SceneProps } from '../ui/story/kit';
export function BalanceScene({ beat, hurry, onArrive }: SceneProps) {
  return <><rect width="560" height="300" fill="#f4eaf7" />
    {[60, 140, 420, 500].map((x, i) => <g key={x} transform={`translate(${x} ${45 + i % 2 * 45})`}><svg width="36" height="36" viewBox="0 0 56 46"><CandyArt weight={i + 1} /></svg></g>)}
    <g transform={`translate(300 145) rotate(${beat < 2 ? -9 : 0})`}><BalanceEmblem size={125} /></g>
    <Rail a={[0, TRACK_Y]} b={[560, TRACK_Y]} />
    <RideTrain path={[[-60, TRACK_Y], [130, TRACK_Y]]} at={1} hurry={hurry} onReach={onArrive} />
  </>;
}
