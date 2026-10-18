import type { Stage } from '../engine/stage';
import type { Stars } from '../engine/stars';

interface Props {
  stages: Stage[];
  stars: Readonly<Record<string, Stars>>;
  cleared: ReadonlySet<string>;
  allCleared: boolean;
  onPick: (index: number) => void;
  onBack: () => void;
}

export function isUnlocked(stages: Stage[], cleared: ReadonlySet<string>, index: number): boolean {
  return index === 0 || cleared.has(stages[index - 1]?.id);
}

/** Three small stars, filled up to `count`. */
export function StarRow({ count, className }: { count: number; className?: string }) {
  return (
    <span className={`star-row ${className ?? ''}`} aria-label={`별 ${count}개`}>
      {[1, 2, 3].map((n) => (
        <svg key={n} viewBox="0 0 24 24" className={n <= count ? 'on' : 'off'} aria-hidden>
          <path d="M12 2.8 L14.7 8.6 L21 9.3 L16.3 13.6 L17.6 19.9 L12 16.7 L6.4 19.9 L7.7 13.6 L3 9.3 L9.3 8.6 Z" />
        </svg>
      ))}
    </span>
  );
}

export function StageSelect({ stages, stars, cleared, allCleared, onPick, onBack }: Props) {
  const totalStars = stages.reduce((sum, s) => sum + (stars[s.id] ?? 0), 0);
  return (
    <main className="select">
      <header className="select-head">
        <button className="icon-btn" onClick={onBack} aria-label="타이틀로">
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M15 5 L8 12 L15 19" />
          </svg>
        </button>
        <h1>스테이지 선택</h1>
        <span className="select-progress" aria-label={`별 ${totalStars}개 / ${stages.length * 3}개`}>
          ★ {totalStars} / {stages.length * 3}
        </span>
      </header>
      {allCleared && (
        <p className="all-clear" role="status">
          <strong>모든 노선 완성!</strong> {stages.length}개 스테이지를 모두 클리어했어요.
        </p>
      )}
      <ol className="stage-grid">
        {stages.map((stage, i) => {
          const unlocked = isUnlocked(stages, cleared, i);
          const done = cleared.has(stage.id);
          return (
            <li key={stage.id}>
              <button
                className={`stage-card ${done ? 'done' : ''} ${unlocked ? '' : 'locked'}`}
                disabled={!unlocked}
                onClick={() => onPick(i)}
                aria-label={`스테이지 ${i + 1} ${stage.title}${done ? `, 별 ${stars[stage.id]}개` : unlocked ? '' : ', 잠김'}`}
              >
                <span className="stage-num">{i + 1}</span>
                <span className="stage-name">{stage.title}</span>
                {unlocked && <StarRow count={stars[stage.id] ?? 0} className="card-stars" />}
                {!unlocked && (
                  <span className="lock" aria-hidden>
                    <svg viewBox="0 0 24 24">
                      <rect x="5" y="11" width="14" height="10" rx="2.5" />
                      <path d="M8 11 V8 A4 4 0 0 1 16 8 V11" />
                    </svg>
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </main>
  );
}
