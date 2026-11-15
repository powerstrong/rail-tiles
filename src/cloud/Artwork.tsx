import type { CloudStage } from './model';
const THREADS = ['#537ead', '#d58269', '#65947d', '#ad78a4', '#c69840'];
export const threadColor = (stage: CloudStage, cell: number) => THREADS[(Math.floor(cell / stage.cols) + Math.floor(stage.number / 3)) % THREADS.length];

/** Original SVG stitched mosaic. Colour is a reward; every filled tile also has a thread shape. */
export function Artwork({ stage }: { stage: CloudStage }) {
  return <svg className="cloud-art" viewBox={`-1 -1 ${stage.cols + 2} ${stage.rows + 2}`} role="img" aria-label={`${stage.title} 완성 작품`}>
    <rect x="-.8" y="-.8" width={stage.cols + 1.6} height={stage.rows + 1.6} rx=".5" fill="#fff9ed" stroke="#d9b583" strokeWidth=".15" />
    {stage.goal.map((v, i) => v ? <g key={i} transform={`translate(${i % stage.cols} ${Math.floor(i / stage.cols)})`}>
      <rect x=".04" y=".04" width=".92" height=".92" rx=".16" fill={threadColor(stage, i)} />
      <path d="M.22 .22L.78 .78M.78 .22L.22 .78" stroke="#fff7e5" strokeWidth=".09" strokeLinecap="round" />
    </g> : null)}
  </svg>;
}
