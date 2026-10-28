import type { CSSProperties } from 'react';

export interface WorldCard {
  id: string;
  title: string;
  blurb: string;
  /** Accent colour and a small emblem drawn in SVG. */
  color: string;
  emblem: 'train' | 'penguin' | 'gear' | 'volcano';
  stars: number;
  maxStars: number;
  state: 'open' | 'locked' | 'conquered' | 'soon';
  /** Shown on a locked card. */
  lockNote?: string;
}

function Emblem({ kind }: { kind: WorldCard['emblem'] }) {
  switch (kind) {
    case 'train':
      return (
        <svg viewBox="0 0 48 48" aria-hidden>
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
        <svg viewBox="0 0 48 48" aria-hidden>
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
        <svg viewBox="0 0 48 48" aria-hidden>
          <circle cx="24" cy="24" r="12" fill="none" stroke="#7F8896" strokeWidth="8" strokeDasharray="5 4" />
          <circle cx="24" cy="24" r="8" fill="#A3ACB8" />
          <circle cx="24" cy="24" r="3" fill="#3A3846" />
        </svg>
      );
    case 'volcano':
      return (
        <svg viewBox="0 0 48 48" aria-hidden>
          <path d="M6 40 L19 14 H29 L42 40 Z" fill="#8C5E3C" />
          <path d="M19 14 Q24 20 29 14 L26 22 Q24 26 22 22 Z" fill="#F0692E" />
          <circle cx="20" cy="8" r="3" fill="#F0A33A" />
          <circle cx="28" cy="6" r="2" fill="#F0692E" />
        </svg>
      );
  }
}

interface Props {
  worlds: WorldCard[];
  onPick: (id: string) => void;
  onBack: () => void;
}

export function WorldSelect({ worlds, onPick, onBack }: Props) {
  return (
    <main className="select worlds">
      <header className="select-head">
        <button className="icon-btn" onClick={onBack} aria-label="타이틀로">
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M15 5 L8 12 L15 19" />
          </svg>
        </button>
        <h1>월드 선택</h1>
      </header>
      <ol className="world-list">
        {worlds.map((w, i) => {
          const playable = w.state === 'open' || w.state === 'conquered';
          return (
            <li key={w.id}>
              <button
                className={`world-card ${w.state}`}
                style={{ '--world': w.color } as CSSProperties}
                disabled={!playable}
                onClick={() => onPick(w.id)}
                aria-label={`${w.title}${w.state === 'conquered' ? ', 정복 완료' : w.state === 'locked' ? ', 잠김' : w.state === 'soon' ? ', 준비 중' : ''}`}
              >
                <span className="world-emblem">
                  <Emblem kind={w.emblem} />
                </span>
                <span className="world-text">
                  <span className="world-kicker">월드 {i + 1}</span>
                  <span className="world-title">{w.title}</span>
                  <span className="world-blurb">{w.state === 'locked' ? w.lockNote : w.state === 'soon' ? '곧 열려요!' : w.blurb}</span>
                </span>
                <span className="world-side">
                  {w.state === 'conquered' && <span className="world-badge">정복!</span>}
                  {playable && (
                    <span className="world-stars">
                      ★ {w.stars} / {w.maxStars}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </main>
  );
}
