import { PostcardArt } from '../../memory/PostcardArt';
import { MemoryArt } from '../../memory/MemoryArt';
import { Rail, RideTrain, TRACK_Y, type SceneProps } from './kit';
export function MemoryScene({ beat, hurry, onArrive }: SceneProps) {
  return <>
    <rect width="560" height="300" fill="#e7eddb"/>
    <path d="M85 190V65H475V190" fill="#e0bb87" stroke="#a4845f" strokeWidth="5"/>
    <path d="M85 130H475" stroke="#a4845f" strokeWidth="5"/>
    {[140, 240, 340, 440].map((x, i) => <g key={x} transform={`translate(${x - 30} 72)`}>
      <rect width="60" height="72" rx="9" fill={beat > 0 ? '#fff9ec' : '#397d79'}/>
      {beat > 0 ? <svg x="7" y="6" width="46" height="56"><MemoryArt face={i % 2 ? 'banana' : 'apple'}/></svg> : <text x="30" y="45" textAnchor="middle" fontSize="26" fill="#e2e7bd">✦</text>}
    </g>)}
    {beat > 1 && <svg x="220" y="145" width="120" height="75"><PostcardArt id="memory-3-10"/></svg>}
    <path d="M270 204L280 188L290 204" fill="none" stroke="#397d79" strokeWidth="6"/>
    <Rail a={[0, TRACK_Y]} b={[560, TRACK_Y]}/>
    <RideTrain path={[[-60, TRACK_Y], [230, TRACK_Y]]} at={1} hurry={hurry} onReach={onArrive}/>
  </>;
}
