const KEY = 'rail-tiles:progress';
const SCHEMA_VERSION = 1;

export interface Progress {
  schemaVersion: number;
  cleared: string[];
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function defaultStorage(): StorageLike | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function emptyProgress(): Progress {
  return { schemaVersion: SCHEMA_VERSION, cleared: [] };
}

/** Never throws: missing, corrupt or future-version data falls back to a fresh start. */
export function loadProgress(storage: StorageLike | null = defaultStorage()): Progress {
  try {
    const raw = storage?.getItem(KEY);
    if (!raw) return emptyProgress();
    const data = JSON.parse(raw) as Partial<Progress>;
    if (data.schemaVersion !== SCHEMA_VERSION || !Array.isArray(data.cleared)) return emptyProgress();
    return { schemaVersion: SCHEMA_VERSION, cleared: data.cleared.filter((id) => typeof id === 'string') };
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(progress: Progress, storage: StorageLike | null = defaultStorage()): void {
  try {
    storage?.setItem(KEY, JSON.stringify(progress));
  } catch {
    // Private mode or full storage: progress just won't persist.
  }
}

export function markCleared(progress: Progress, stageId: string): Progress {
  if (progress.cleared.includes(stageId)) return progress;
  return { ...progress, cleared: [...progress.cleared, stageId] };
}
