import { type ReactNode, useLayoutEffect, useRef } from 'react';

const shortScreen = () => window.matchMedia('(max-height: 480px)').matches;

/** Re-enter the play viewport after resetting a stage from its scrollable tools. */
export function showBoard() {
  const board = document.querySelector('.board-first');
  requestAnimationFrame(() => {
    if (shortScreen() && board?.isConnected) board.scrollIntoView({ block: 'start', behavior: 'instant' });
  });
}

/** Normal screens flatten these wrappers; only short screens get a play viewport. */
export function BoardFirst({ children, status, sideControls = false }: { children: ReactNode; status?: ReactNode; sideControls?: boolean }) {
  const block = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (shortScreen()) block.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
    });
    const secondary = block.current?.querySelector<HTMLElement>(':scope > .board-first-secondary');
    const observer = new ResizeObserver(() => {
      if (secondary) block.current?.style.setProperty('--board-first-after', `${secondary.offsetHeight}px`);
    });
    if (secondary) observer.observe(secondary);
    // Entry and an explicit restart are the only scroll destinations. Folding
    // or resizing must not pull a reader away from the menu or help tools.
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, []);
  return <section className={`board-first${sideControls ? ' board-first-side' : ''}`} ref={block} aria-label="게임 화면">
    <div className="board-first-handle" aria-hidden="true">▲ 메뉴 · 아래로 밀어 보기</div>
    {children}
    {status != null && <div className="board-first-status" role="status">{status}</div>}
    <div className="board-first-handle board-first-more" aria-hidden="true">▼ 도움 도구 · 위로 밀어 보기</div>
  </section>;
}

/** Fit the entire drawing surface, including its frame, without a scroll gutter.
 * Controls are siblings of this map and retain their native 44px touch targets.
 * Scaling the actual DOM also preserves SVG hit testing and pointer coordinates.
 */
export function BoardMap({ children }: { children: ReactNode }) {
  const map = useRef<HTMLDivElement>(null), drawing = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const area = map.current!, art = drawing.current!;
    const fit = () => {
      if (!shortScreen()) {
        art.removeAttribute('style');
        return;
      }
      const width = area.clientWidth, height = area.clientHeight;
      if (!width || !height) return;
      const naturalWidth = art.scrollWidth, naturalHeight = art.offsetHeight;
      const scale = Math.min(1, (width - 4) / naturalWidth, (height - 8) / naturalHeight);
      art.style.transform = `scale(${scale})`;
      art.style.left = `${(width - naturalWidth * scale) / 2}px`;
      art.style.top = `${(height - naturalHeight * scale) / 2}px`;
    };
    const observer = new ResizeObserver(fit);
    observer.observe(area); observer.observe(art);
    const mutation = new MutationObserver(fit);
    mutation.observe(art, { childList: true, subtree: true });
    window.addEventListener('resize', fit);
    fit();
    return () => { observer.disconnect(); mutation.disconnect(); window.removeEventListener('resize', fit); };
  }, []);
  return <div className="board-first-map" ref={map}><div className="board-first-fit" ref={drawing}>{children}</div></div>;
}
