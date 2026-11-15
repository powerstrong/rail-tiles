import { type ReactNode, useEffect, useRef } from 'react';
import { StarRow } from './StageSelect';

/** Shared success content; recording, sound and board celebrations stay with each game. */
export function StageCompletion({ stars, hasNext, onNext, onBack, className, nextClassName,
  backClassName, actionsClassName, children, note, overlay = false, scroll = true }: {
  stars: number; hasNext: boolean; onNext: () => void; onBack: () => void;
  className: string; nextClassName?: string; backClassName?: string; actionsClassName?: string;
  children?: ReactNode; note?: string; overlay?: boolean; scroll?: boolean;
}) {
  const card = useRef<HTMLElement>(null);
  // Only world unlocks and the daily refresh schedule reach this prop. Keep them brief.
  const notice = note?.startsWith('🚂') ? '새 여행지가 열렸어요.' : note?.replace(/^🔥 .* · /, '');
  useEffect(() => {
    // ResultOverlay moves focus after its existing board ceremony has finished.
    if (overlay) return;
    const button = card.current?.querySelector<HTMLButtonElement>('button');
    button?.focus({ preventScroll: true });
    // Reveal the whole card so its stars and the focused button's outline stay visible.
    if (scroll) card.current?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
  }, [overlay, scroll]);
  return <section ref={card} className={className} aria-label="스테이지 완료">
    <StarRow count={stars} className="result-stars" />
    {children}
    {notice && <p className="clear-note">{notice}</p>}
    <div className={actionsClassName}>
      {hasNext && <button className={nextClassName} onClick={onNext}>다음 스테이지 →</button>}
      <button className={backClassName} onClick={onBack}>스테이지 고르기</button>
    </div>
  </section>;
}
