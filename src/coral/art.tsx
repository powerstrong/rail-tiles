import { COLORS } from './model';

/** Each pigment keeps a distinct silhouette, including when the screen is monochrome. */
export function Pigment({ color }: { color: number }) {
  return <svg viewBox="0 0 40 40" aria-hidden="true" className="coral-pigment" fill="currentColor" stroke="#244954" strokeWidth="1.3" strokeLinejoin="round">
    {color === 0 ? <circle cx="20" cy="20" r="10" /> : color === 1 ? <path d="M20 7 33 20 20 33 7 20Z" /> : color === 2 ? <path d="m20 7 14 25H6Z" /> : color === 3 ? <rect x="9" y="9" width="22" height="22" rx="3" /> : <path d="M20 33 7 20C-2 7 16 1 20 13 24 1 42 7 33 20Z" />}
  </svg>;
}
export function CoralEmblem({ size }: { size?: number }) {
  return <svg viewBox="0 0 48 48" aria-hidden="true" {...(size ? { x: -size / 2, y: -size / 2, width: size, height: size } : {})}>
    <circle cx="24" cy="24" r="23" fill="#dcf3ee" />
    <path d="M9 40Q24 35 39 40" stroke="#e4b843" strokeWidth="5" fill="none" strokeLinecap="round" />
    {[14, 25, 35].map((x, i) => <path key={x} d={`M${x} 37V${14 - i * 2}m0 15-6-6m6 0 5-7`} stroke={COLORS[i === 0 ? 0 : i === 1 ? 4 : 2]} strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />)}
    <circle cx="20" cy="30" r="1.5" fill="#264957" /><circle cx="29" cy="30" r="1.5" fill="#264957" /><path d="M22 33Q24 35 27 33" stroke="#264957" fill="none" />
  </svg>;
}
