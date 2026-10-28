import type { CSSProperties } from 'react';
import type { Chapter } from '../stages/stages';
import type { Stars } from '../engine/stars';

/** What the list needs to know about a stage, whichever world it belongs to. */
export interface StageCard {
  id: string;
  title: string;
  /** Bonus stages (a robot rescue) are marked; a chapter's last stage is always its boss. */
  battery?: number;
}

interface Props {
  stages: StageCard[];
  /** Screen heading (the world's name). */
  heading?: string;
  /** Extra class on the screen, for a world's colour theme. */
  theme?: string;
  chapters: Chapter[];
  stars: Readonly<Record<string, Stars>>;
  cleared: ReadonlySet<string>;
  allCleared: boolean;
  onPick: (index: number) => void;
  onBack: () => void;
  daily?: DailyCardProps;
}

interface DailyCardProps {
  /** null while today's puzzle is still being built. */
  title: string | null;
  stars: number;
  unlocked: boolean;
  /** Label of the stage that opens it, e.g. "STAGE 1-6". */
  unlockAfter: string;
  failed: boolean;
  /** Consecutive days cleared. */
  streak: number;
  onPlay: () => void;
  /** Shown while the puzzle is being built. */
  loadingText?: string;
}

function DailyCard({ title, stars, unlocked, unlockAfter, failed, streak, onPlay, loadingText = '오늘의 노선을 까는 중…' }: DailyCardProps) {
  const ready = unlocked && title !== null;
  const sub = !unlocked
    ? `${unlockAfter.replace('STAGE ', '')} 스테이지를 깨면 열려요`
    : failed
      ? '오늘의 퍼즐을 만들지 못했어요'
      : title === null
        ? loadingText
        : title;
  return (
    <button className={`daily-card ${ready ? '' : 'waiting'} ${stars > 0 ? 'done' : ''}`} disabled={!ready} onClick={onPlay}>
      <span className="daily-icon" aria-hidden>
        <svg viewBox="0 0 24 24">
          <rect x="3.5" y="5" width="17" height="15" rx="3" />
          <path d="M3.5 10 H20.5 M8 3 V7 M16 3 V7" />
          <path d="M8.5 15 L11 17.2 L15.5 12.8" className="daily-check" />
        </svg>
      </span>
      <span className="daily-text">
        <span className="daily-kicker">오늘의 퍼즐</span>
        <span className="daily-title">{sub}</span>
      </span>
      <span className="daily-side">
        {ready && <StarRow count={stars} />}
        {streak > 0 && <span className="daily-streak">🔥 {streak}일 연속</span>}
      </span>
    </button>
  );
}

/**
 * A stage opens once the one before it is cleared. Stages already cleared stay open,
 * so stages added in the middle of a chapter later never lock a player's old progress.
 * A bonus stage never blocks the way on.
 */
export function isUnlocked(stages: StageCard[], cleared: ReadonlySet<string>, index: number): boolean {
  if (index === 0 || cleared.has(stages[index]?.id) || cleared.has(stages[index - 1]?.id)) return true;
  // Bonus stages are optional: the stage after one opens once the stage before the bonus is cleared.
  return stages[index - 1]?.battery !== undefined && index >= 2 && cleared.has(stages[index - 2].id);
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

export function StageSelect({ stages, heading = '스테이지 선택', theme, chapters, stars, cleared, allCleared, onPick, onBack, daily }: Props) {
  const totalStars = stages.reduce((sum, s) => sum + (stars[s.id] ?? 0), 0);
  return (
    <main className={`select ${theme ?? ''}`}>
      <header className="select-head">
        <button className="icon-btn" onClick={onBack} aria-label="월드 선택으로">
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M15 5 L8 12 L15 19" />
          </svg>
        </button>
        <h1>{heading}</h1>
        <span className="select-progress" aria-label={`별 ${totalStars}개 / ${stages.length * 3}개`}>
          ★ {totalStars} / {stages.length * 3}
        </span>
      </header>
      {allCleared && (
        <p className="all-clear" role="status">
          <strong>모든 노선 완성!</strong> {stages.length}개 스테이지를 모두 클리어했어요.
        </p>
      )}
      {daily && <DailyCard {...daily} />}
      {chapters.map((ch) => {
        const list = stages.slice(ch.start, ch.start + ch.count);
        const got = list.reduce((sum, st) => sum + (stars[st.id] ?? 0), 0);
        const open = isUnlocked(stages, cleared, ch.start);
        return (
          <section key={ch.number} className={`chapter ${open ? '' : 'locked'}`} style={{ '--chapter': ch.color } as CSSProperties}>
            <header className="chapter-head">
              <span className="chapter-num">챕터 {ch.number}</span>
              <h2>{ch.title}</h2>
              <span className="chapter-stars" aria-label={`별 ${got}개 / ${ch.count * 3}개`}>
                ★ {got} / {ch.count * 3}
              </span>
              <p className="chapter-blurb">{open ? ch.blurb : `챕터 ${ch.number - 1}을 깨면 열려요`}</p>
            </header>
            <ol className="stage-grid">
              {list.map((stage, k) => {
                const i = ch.start + k;
                const unlocked = isUnlocked(stages, cleared, i);
                const done = cleared.has(stage.id);
                const kind = stage.battery !== undefined ? 'bonus' : k === ch.count - 1 ? 'boss' : '';
                return (
                  <li key={stage.id}>
                    <button
                      className={`stage-card ${done ? 'done' : ''} ${unlocked ? '' : 'locked'} ${kind}`}
                      disabled={!unlocked}
                      onClick={() => onPick(i)}
                      aria-label={`챕터 ${ch.number} 스테이지 ${k + 1} ${stage.title}${done ? `, 별 ${stars[stage.id]}개` : unlocked ? '' : ', 잠김'}`}
                    >
                      <span className="stage-num">{k + 1}</span>
                      <span className="stage-name">{stage.title}</span>
                      {kind && <span className={`tag tag-${kind}`}>{kind === 'boss' ? '보스' : '보너스'}</span>}
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
          </section>
        );
      })}
    </main>
  );
}
