import { type ReactNode, useEffect, useState } from 'react';

/** When the result card starts to show: the `.result-card` animation delay in styles.css. */
const SHOW_MS = 1350;

/**
 * The card that comes up when a stage ends. It waits for the ceremony before fading in
 * (styles.css), and until then its buttons ignore taps: a child tapping the board during the
 * ceremony would otherwise press "다음 스테이지" or "처음부터 다시" without ever seeing them.
 * The backdrop still takes those taps, so they never reach the board either.
 */
export function ResultOverlay({ label, children }: { label: string; children: ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), SHOW_MS);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className={ready ? 'overlay' : 'overlay arming'} role="dialog" aria-label={label}>
      {children}
    </div>
  );
}
