export type Theme = 'light' | 'dark';
const KEY = 'rail-tiles:theme';
const CHANGE = 'rail-tiles:theme-change';

function readPreference(): Theme | null {
  try {
    const saved = localStorage.getItem(KEY);
    return saved === 'light' || saved === 'dark' ? saved : null;
  } catch { return null; }
}

let preference = readPreference();

export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#252733' : '#f4e9d6');
  window.dispatchEvent(new Event(CHANGE));
}

export function setTheme(theme: Theme) {
  preference = theme; // Keep the choice for this session even if storage is blocked.
  try { localStorage.setItem(KEY, theme); } catch { /* Private/limited storage. */ }
  apply(theme);
}

export function subscribeTheme(listener: () => void) {
  window.addEventListener(CHANGE, listener);
  return () => window.removeEventListener(CHANGE, listener);
}

/** Keep following the system until a choice is made; sync choices between tabs. */
export function initializeTheme() {
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  const refresh = () => apply(preference ?? (system.matches ? 'dark' : 'light'));
  system.addEventListener('change', refresh);
  window.addEventListener('storage', (event) => {
    if (event.key === KEY || event.key === null) {
      preference = readPreference();
      refresh();
    }
  });
  refresh();
}
