import { useSyncExternalStore } from 'react';
import { currentTheme, setTheme, subscribeTheme } from '../theme';

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeTheme, currentTheme);
  const label = theme === 'light' ? '어두운 화면으로' : '밝은 화면으로';
  return (
    <button className="icon-btn theme-toggle" aria-label={label} title={label}
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {theme === 'light' ? <path d="M20 14A8.5 8.5 0 0 1 10 4a8.5 8.5 0 1 0 10 10Z" /> : <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
        </>}
      </svg>
    </button>
  );
}
