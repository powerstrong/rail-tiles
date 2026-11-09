
export interface WorldCard {
  id: string;
  title: string;
  blurb: string;
  /** Accent colour and a small emblem drawn in SVG. */
  color: string;
  emblem: 'train' | 'penguin' | 'gear' | 'volcano' | 'depot' | 'space' | 'clock';
  stars: number;
  maxStars: number;
  state: 'open' | 'locked' | 'conquered' | 'soon';
  /** Opened along the way and never played yet: gets a NEW badge. */
  fresh?: boolean;
  /** Shown on a locked card. */
  lockNote?: string;
  /** The world this one opens after (its stop on the route); none for the first. */
  from?: string;
}

/** A world's little emblem; `size` places it centred on 0,0 inside another SVG. */
export function Emblem({ kind, size }: { kind: WorldCard['emblem']; size?: number }) {
  const box = size ? { x: -size / 2, y: -size / 2, width: size, height: size } : {};
  switch (kind) {
    case 'train':
      return (
        <svg viewBox="0 0 48 48" aria-hidden {...box}>
          <rect x="8" y="14" width="24" height="18" rx="4" fill="#E5584F" />
          <rect x="28" y="20" width="12" height="12" rx="3" fill="#BF423B" />
          <rect x="12" y="18" width="8" height="7" rx="2" fill="#A9DFDF" />
          <rect x="31" y="9" width="5" height="11" rx="2" fill="#3A3846" />
          <circle cx="15" cy="35" r="5" fill="#3A3846" />
          <circle cx="33" cy="35" r="5" fill="#3A3846" />
        </svg>
      );
    case 'penguin':
      return (
        <svg viewBox="0 0 48 48" aria-hidden {...box}>
          <ellipse cx="24" cy="26" rx="14" ry="17" fill="#2D3446" />
          <ellipse cx="24" cy="30" rx="9" ry="12" fill="#fff" />
          <circle cx="19.5" cy="18" r="2.4" fill="#fff" />
          <circle cx="28.5" cy="18" r="2.4" fill="#fff" />
          <path d="M21 22 H27 L24 26 Z" fill="#F5A23A" />
          <path d="M12 30 Q24 36 36 30 L36 34 Q24 40 12 34 Z" fill="#3F8BD9" />
        </svg>
      );
    case 'gear':
      return (
        <svg viewBox="0 0 48 48" aria-hidden {...box}>
          <circle cx="24" cy="24" r="12" fill="none" stroke="#7F8896" strokeWidth="8" strokeDasharray="5 4" />
          <circle cx="24" cy="24" r="8" fill="#A3ACB8" />
          <circle cx="24" cy="24" r="3" fill="#3A3846" />
        </svg>
      );
    case 'volcano':
      return (
        <svg viewBox="0 0 48 48" aria-hidden {...box}>
          <path d="M6 40 L19 14 H29 L42 40 Z" fill="#8C5E3C" />
          <path d="M19 14 Q24 20 29 14 L26 22 Q24 26 22 22 Z" fill="#F0692E" />
          <circle cx="20" cy="8" r="3" fill="#F0A33A" />
          <circle cx="28" cy="6" r="2" fill="#F0692E" />
        </svg>
      );
    case 'depot':
      return (
        <svg viewBox="0 0 48 48" aria-hidden {...box}>
          <path d="M5 20 L24 9 L43 20 V41 H5 Z" fill="#E9E1D2" />
          <path d="M3 21 L24 8 L45 21" stroke="#2E6F8E" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="21" y="3" width="6" height="5" rx="2" fill="#E0B145" />
          <path d="M14 41 V29 Q24 19 34 29 V41 Z" fill="#2E4A5C" />
          <rect x="17" y="30" width="14" height="11" rx="3" fill="#E5584F" />
          <circle cx="24" cy="34" r="3" fill="#F4E9C8" />
          <rect x="16" y="38" width="16" height="4" rx="1.5" fill="#E0B145" />
        </svg>
      );
    case 'space':
      return (
        <svg viewBox="0 0 48 48" aria-hidden {...box}>
          <circle cx="24" cy="24" r="21" fill="#1F2A4D" />
          <circle cx="11" cy="12" r="1.6" fill="#FFF6D6" />
          <circle cx="38" cy="10" r="1.2" fill="#FFF6D6" />
          <circle cx="40" cy="34" r="1.6" fill="#FFF6D6" />
          <ellipse cx="24" cy="26" rx="19" ry="6" fill="none" stroke="#9B6BF0" strokeWidth="2.5" transform="rotate(-18 24 26)" />
          <path d="M14 30 L9 37 L17 34 Z M34 30 L39 37 L31 34 Z" fill="#C2433C" />
          <circle cx="24" cy="25" r="11" fill="#F0625A" />
          <circle cx="24" cy="23" r="6" fill="#CDEFFF" stroke="#C9D3EA" strokeWidth="2" />
          <path d="M24 14 V10" stroke="#1E2440" strokeWidth="2" strokeLinecap="round" />
          <circle cx="24" cy="9" r="2" fill="#7BE0A5" />
        </svg>
      );
    case 'clock':
      return (
        <svg viewBox="0 0 48 48" aria-hidden {...box}>
          <path d="M10 44 V16 L24 4 L38 16 V44 Z" fill="#8A5A33" />
          <path d="M8 17 L24 3 L40 17" stroke="#6A4223" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="24" cy="22" r="10" fill="#FFF8E8" stroke="#E0AE3F" strokeWidth="3" />
          <path d="M24 22 V15 M24 22 L29 25" stroke="#3A2E2A" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M18 44 V38 A6 6 0 0 1 30 38 V44 Z" fill="#2A1E1A" />
          <path d="M21 44 L27 44 L27 40 L22 39 Z" fill="#F6C744" />
        </svg>
      );
  }
}
