const colors = ['#f5d68b', '#d8c7f1', '#a9d9cb', '#f3b6a3', '#b6d8f1', '#ead79f'];
/** Original candy silhouettes; number + one dot per unit also work without colour. */
export function CandyArt({ weight }: { weight: number }) {
  const fill = colors[weight - 1];
  return <svg viewBox="0 0 56 46" aria-hidden="true" focusable="false">
    <g fill={fill} stroke="#65516d" strokeWidth="1.7" strokeLinejoin="round">
      {weight === 1 ? <circle cx="28" cy="18" r="15" /> : weight === 2 ? <path d="M28 2 46 18 28 34 10 18Z" /> : weight === 3 ? <path d="M28 2 47 33H9Z" /> : weight === 4 ? <rect x="12" y="3" width="32" height="31" rx="7" /> : weight === 5 ? <path d="m28 1 6 10 12 2-8 9 2 12-12-5-12 5 2-12-8-9 12-2Z" /> : <path d="M20 2h16l10 16-10 16H20L10 18Z" />}
    </g><text x="28" y="24" textAnchor="middle" fill="#44344b" fontSize="18" fontWeight="800">{weight}</text>
    {Array.from({ length: weight }, (_, i) => <circle key={i} cx={28 + (i - (weight - 1) / 2) * 6} cy="41" r="2.2" fill="#65516d" />)}
  </svg>;
}
export function BalanceEmblem({ size }: { size?: number }) {
  return <svg viewBox="0 0 48 48" aria-hidden="true" {...(size ? { x: -size / 2, y: -size / 2, width: size, height: size } : {})}>
    <path d="M24 9V40M15 41h18M7 14h34M10 14 4 30h12ZM38 14l-6 16h12Z" fill="#f4d789" stroke="#836099" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="m24 2 2 4 5 1-3.5 3.5.5 5-4-2-4 2 .5-5L17 7l5-1Z" fill="#f4ce67" stroke="#836099" strokeWidth="1.5" />
  </svg>;
}
export function ScaleArt({ delta }: { delta: number }) {
  return <svg className="balance-scale-art" viewBox="0 0 340 66" aria-hidden="true">
    <path d="M170 15v44m-25 0h50" stroke="#98744b" strokeWidth="7" strokeLinecap="round" />
    <path data-testid="balance-beam" d={`M40 ${18 - delta}L300 ${18 + delta}`} stroke="#8b639e" strokeWidth="7" strokeLinecap="round" />
    <path d={`M40 ${18 - delta}v34M300 ${18 + delta}v34`} stroke="#bea4c7" strokeWidth="2" strokeDasharray="3 3" />
    <circle cx="170" cy="18" r="10" fill="#f5d68b" stroke="#8b639e" strokeWidth="2" /><circle cx="170" cy="18" r="3" fill="#8b639e" />
  </svg>;
}
