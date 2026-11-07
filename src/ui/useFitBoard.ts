import { useLayoutEffect, useRef } from 'react';

/**
 * Keeps the whole game screen on one page: measures everything around the board
 * (header, tip, status line, dock, paddings) and publishes it as `--reserve`, which the
 * board's CSS max-height subtracts from the screen height. A fixed guess broke on squarish
 * screens like an unfolded phone, where the board is height-limited and the dock fell off.
 */
export function useFitBoard<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useLayoutEffect(() => {
    const game = ref.current;
    if (!game || typeof ResizeObserver === 'undefined') return;

    const fit = () => {
      const board = game.querySelector<SVGSVGElement>('.board-wrap .board');
      if (!board) return;
      const cs = getComputedStyle(game);
      let used = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      let shown = 0;
      for (const child of Array.from(game.children) as HTMLElement[]) {
        const pos = getComputedStyle(child).position;
        if (pos === 'absolute' || pos === 'fixed' || child.offsetHeight === 0) continue;
        used += child.offsetHeight;
        shown++;
      }
      used += Math.max(0, shown - 1) * (parseFloat(cs.rowGap) || 0);
      // Everything but the board itself (the board-wrap may hold more than the board).
      // +1px: offsetHeight rounds, and a stray pixel would make the page scroll.
      const reserve = Math.ceil(used - board.getBoundingClientRect().height) + 1;
      const value = `${reserve}px`;
      if (game.style.getPropertyValue('--reserve') !== value) game.style.setProperty('--reserve', value);
    };

    const ro = new ResizeObserver(fit);
    const watch = () => {
      ro.observe(game);
      for (const child of Array.from(game.children)) ro.observe(child);
    };
    // Tips, banners and intros come and go: watch new children too.
    const mo = new MutationObserver(() => {
      watch();
      fit();
    });
    mo.observe(game, { childList: true });
    watch();
    fit();
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, []);

  return ref;
}
