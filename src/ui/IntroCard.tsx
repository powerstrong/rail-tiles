import type { ReactNode } from 'react';

export interface Intro {
  title: string;
  text: string;
  /** SVG content drawn in a 120×120 box centred on 0,0. */
  art: ReactNode;
}

/** "New thing!" card shown when a stage first brings in a mechanic. */
export function IntroCard({ intro, onClose }: { intro: Intro; onClose: () => void }) {
  return (
    <div className="overlay intro-overlay" role="dialog" aria-label={`새 기믹: ${intro.title}`} onClick={onClose}>
      <div className="result-card intro-card" onClick={(e) => e.stopPropagation()}>
        <p className="result-kicker">새 기믹!</p>
        <svg viewBox="-60 -60 120 120" className="intro-art" aria-hidden>
          {intro.art}
        </svg>
        <h2>{intro.title}</h2>
        <p className="result-sub">{intro.text}</p>
        <div className="result-actions">
          <button className="primary" onClick={onClose} autoFocus>
            알았어요!
          </button>
        </div>
      </div>
    </div>
  );
}
