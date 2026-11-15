/** Original SVG: pointed petals and an explicit arrow, readable without colour. */
export function ArrowFlower({ direction, badge = false }: { direction: number; badge?: boolean }) {
  return <svg className={badge ? 'lb-arrow-badge' : 'lb-toy lb-arrow-flower'} viewBox="0 0 64 64" aria-hidden="true">
    {!badge && <>
      <path d="M32 54V30 M32 46Q18 50 17 40Q28 36 32 46 M32 48Q46 51 48 40Q37 37 32 48" fill="#9abd7a" stroke="#547953" strokeWidth="2" />
      <path d="M32 3L42 17L56 27L42 37L32 51L22 37L8 27L22 17Z" fill="#d6e7f5" stroke="#426f91" strokeWidth="2" />
    </>}
    <circle cx="32" cy={badge ? 32 : 27} r={badge ? 28 : 18} fill="#fffdf1" stroke="#426f91" strokeWidth={badge ? 4 : 2} />
    <g transform={badge ? 'translate(0 5)' : undefined}><path d="M19 27H43 M33 17L43 27L33 37" transform={`rotate(${(direction - 1) * 90} 32 27)`} fill="none" stroke="#244e70" strokeWidth={badge ? 6 : 5} strokeLinecap="round" strokeLinejoin="round" /></g>
  </svg>;
}
