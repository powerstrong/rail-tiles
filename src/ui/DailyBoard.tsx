import type { CSSProperties } from 'react';
import { StarRow } from './StageSelect';
import { Emblem, type WorldCard } from './WorldSelect';

export interface DailyRow {
  id: string;
  title: string;
  color: string;
  emblem: WorldCard['emblem'];
  state: 'locked' | 'loading' | 'failed' | 'open' | 'done';
  /** Stars on today's puzzle (when cleared). */
  stars: number;
  streak: number;
  /** "펭귄 얼음 나라 1-3을 깨면 열려요" */
  lockText: string;
  loadingText?: string;
}

interface Props {
  rows: DailyRow[];
  date: string;
  onPlay: (id: string) => void;
  onBack: () => void;
}

/** The plaza notice board: every world's puzzle of the day in one place. */
export function DailyBoard({ rows, date, onPlay, onBack }: Props) {
  const [, m, d] = date.split('-').map(Number);
  const open = rows.filter((r) => r.state === 'open' || r.state === 'done');
  const done = rows.filter((r) => r.state === 'done').length;
  return (
    <main className="select board-screen">
      <header className="select-head">
        <button className="icon-btn" onClick={onBack} aria-label="노선도로">
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M15 5 L8 12 L15 19" />
          </svg>
        </button>
        <h1>오늘의 퍼즐 게시판</h1>
      </header>
      <p className="board-date">
        📌 {m}월 {d}일 · {open.length ? `${done}/${open.length} 완료` : '아직 열린 퍼즐이 없어요'}
        {open.length > 0 && done === open.length && ' · 오늘 다 했어요! 🎉'}
      </p>
      <ul className="board-list">
        {rows.map((r) => (
          <li key={r.id}>
            <button
              className={`board-row ${r.state}`}
              style={{ '--world': r.color } as CSSProperties}
              disabled={r.state !== 'open' && r.state !== 'done'}
              onClick={() => onPlay(r.id)}
              aria-label={`${r.title} 오늘의 퍼즐: ${r.state === 'done' ? `완료, 별 ${r.stars}개` : r.state === 'open' ? '도전할 수 있어요' : r.state === 'locked' ? r.lockText : r.state === 'loading' ? '준비 중' : '만들지 못했어요'}`}
            >
              <span className="world-emblem">
                <Emblem kind={r.emblem} />
              </span>
              <span className="board-text">
                <span className="board-title">{r.title}</span>
                <span className="board-sub">
                  {r.state === 'locked'
                    ? `🔒 ${r.lockText}`
                    : r.state === 'loading'
                      ? (r.loadingText ?? '퍼즐을 만드는 중…')
                      : r.state === 'failed'
                        ? '오늘 퍼즐을 만들지 못했어요. 나중에 다시 와 주세요.'
                        : r.streak > 0
                          ? `🔥 ${r.streak}일 연속`
                          : '오늘 처음 도전!'}
                </span>
              </span>
              <span className="board-side">{r.state === 'done' ? <StarRow count={r.stars} /> : r.state === 'open' ? <span className="board-go">도전 ▶</span> : null}</span>
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
