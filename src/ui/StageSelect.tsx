import type { Stage } from '../engine/stage';

interface Props {
  stages: Stage[];
  totalPlanned: number;
  cleared: ReadonlySet<string>;
  onPick: (index: number) => void;
  onBack: () => void;
}

export function isUnlocked(stages: Stage[], cleared: ReadonlySet<string>, index: number): boolean {
  return index === 0 || cleared.has(stages[index - 1]?.id);
}

export function StageSelect({ stages, totalPlanned, cleared, onPick, onBack }: Props) {
  return (
    <main className="select">
      <header className="select-head">
        <button className="icon-btn" onClick={onBack} aria-label="타이틀로">
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M15 5 L8 12 L15 19" />
          </svg>
        </button>
        <h1>스테이지 선택</h1>
        <span className="select-progress">
          {stages.filter((s) => cleared.has(s.id)).length} / {totalPlanned}
        </span>
      </header>
      <ol className="stage-grid">
        {Array.from({ length: totalPlanned }, (_, i) => {
          const stage = stages[i];
          if (!stage) {
            return (
              <li key={i}>
                <div className="stage-card soon" aria-disabled>
                  <span className="stage-num">{i + 1}</span>
                  <span className="stage-name">준비 중</span>
                </div>
              </li>
            );
          }
          const unlocked = isUnlocked(stages, cleared, i);
          const done = cleared.has(stage.id);
          return (
            <li key={stage.id}>
              <button
                className={`stage-card ${done ? 'done' : ''} ${unlocked ? '' : 'locked'}`}
                disabled={!unlocked}
                onClick={() => onPick(i)}
                aria-label={`스테이지 ${i + 1} ${stage.title}${done ? ', 클리어' : unlocked ? '' : ', 잠김'}`}
              >
                <span className="stage-num">{i + 1}</span>
                <span className="stage-name">{stage.title}</span>
                {done && (
                  <span className="badge" aria-hidden>
                    <svg viewBox="0 0 24 24">
                      <path d="M5 12.5 L10 17 L19 7" />
                    </svg>
                  </span>
                )}
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
