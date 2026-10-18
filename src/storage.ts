import type { Stars } from './engine/stars';

const KEY = 'rail-tiles:progress';
const SCHEMA_VERSION = 2;

export interface Progress {
  schemaVersion: number;
  /** Best star rating per cleared stage id. A stage is cleared iff it has an entry. */
  stars: Record<string, Stars>;
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
  return { schemaVersion: SCHEMA_VERSION, stars: {} };
}

const isStars = (v: unknown): v is Stars => v === 1 || v === 2 || v === 3;

/** Never throws: missing, corrupt or future-version data falls back to a fresh start. v1 data is migrated. */
export function loadProgress(storage: StorageLike | null = defaultStorage()): Progress {
  try {
    const raw = storage?.getItem(KEY);
    if (!raw) return emptyProgress();
    const data = JSON.parse(raw) as { schemaVersion?: unknown; cleared?: unknown; stars?: unknown };
    if (data?.schemaVersion === 1 && Array.isArray(data.cleared)) {
      // v1 only knew "cleared": count each as one star.
      const stars: Record<string, Stars> = {};
      for (const id of data.cleared) if (typeof id === 'string') stars[id] = 1;
      return { schemaVersion: SCHEMA_VERSION, stars };
    }
    if (data?.schemaVersion !== SCHEMA_VERSION || typeof data.stars !== 'object' || data.stars === null) return emptyProgress();
    const stars: Record<string, Stars> = {};
    for (const [id, v] of Object.entries(data.stars)) if (isStars(v)) stars[id] = v;
    return { schemaVersion: SCHEMA_VERSION, stars };
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

/** Records a clear, keeping the best star rating. Returns the same object when nothing improves. */
export function recordClear(progress: Progress, stageId: string, stars: Stars): Progress {
  if ((progress.stars[stageId] ?? 0) >= stars) return progress;
  return { ...progress, stars: { ...progress.stars, [stageId]: stars } };
}
