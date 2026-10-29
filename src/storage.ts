import type { Stars } from './engine/stars';

const KEY = 'rail-tiles:progress';
const SCHEMA_VERSION = 2;

export interface Progress {
  schemaVersion: number;
  /** Best star rating per cleared stage id. A stage is cleared iff it has an entry. */
  stars: Record<string, Stars>;
  /** Chosen train look (item id per slot); missing or locked items fall back to the default. */
  look?: Record<string, string>;
  /** How many look items had been unlocked the last time the garage was opened. */
  lookSeen?: number;
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
    const data = JSON.parse(raw) as { schemaVersion?: unknown; cleared?: unknown; stars?: unknown; look?: unknown; lookSeen?: unknown };
    if (data?.schemaVersion === 1 && Array.isArray(data.cleared)) {
      // v1 only knew "cleared": count each as one star.
      const stars: Record<string, Stars> = {};
      for (const id of data.cleared) if (typeof id === 'string') stars[id] = 1;
      return { schemaVersion: SCHEMA_VERSION, stars };
    }
    if (data?.schemaVersion !== SCHEMA_VERSION || typeof data.stars !== 'object' || data.stars === null) return emptyProgress();
    const stars: Record<string, Stars> = {};
    for (const [id, v] of Object.entries(data.stars)) if (isStars(v)) stars[id] = v;
    return { schemaVersion: SCHEMA_VERSION, stars, ...extras(data) };
  } catch {
    return emptyProgress();
  }
}

/** The optional look fields, kept only when they have the right shape. */
function extras(data: { look?: unknown; lookSeen?: unknown }): Pick<Progress, 'look' | 'lookSeen'> {
  const out: Pick<Progress, 'look' | 'lookSeen'> = {};
  if (typeof data.look === 'object' && data.look !== null) {
    out.look = Object.fromEntries(Object.entries(data.look).filter(([k, v]) => typeof k === 'string' && typeof v === 'string'));
  }
  if (typeof data.lookSeen === 'number' && Number.isFinite(data.lookSeen)) out.lookSeen = data.lookSeen;
  return out;
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

/** Total stars earned across every world. */
export const totalStars = (progress: Progress) => Object.values(progress.stars).reduce<number>((a, b) => a + b, 0);

// ---------------------------------------------------------------- save code

const CODE_PREFIX = 'RT1.';

const toBase64Url = (bytes: Uint8Array) => {
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromBase64Url = (text: string) => {
  const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

/**
 * A text code holding every star and the train look, to keep somewhere safe (a chat to
 * yourself, a note) and paste back on any device. Compressed where the browser can.
 */
export async function exportCode(progress: Progress): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify({ s: progress.stars, l: progress.look ?? {} }));
  if (typeof CompressionStream !== 'undefined') return `${CODE_PREFIX}z${toBase64Url(await pipe(json, new CompressionStream('deflate-raw')))}`;
  return `${CODE_PREFIX}j${toBase64Url(json)}`;
}

/** Reads a save code; null when it is not one of ours or is damaged. */
export async function readCode(code: string): Promise<Pick<Progress, 'stars' | 'look'> | null> {
  try {
    const text = code.replace(/\s+/g, '');
    if (!text.startsWith(CODE_PREFIX)) return null;
    const kind = text[CODE_PREFIX.length];
    let bytes = fromBase64Url(text.slice(CODE_PREFIX.length + 1));
    if (kind === 'z') {
      if (typeof DecompressionStream === 'undefined') return null;
      bytes = await pipe(bytes, new DecompressionStream('deflate-raw'));
    } else if (kind !== 'j') return null;
    const data = JSON.parse(new TextDecoder().decode(bytes)) as { s?: unknown; l?: unknown };
    if (typeof data.s !== 'object' || data.s === null) return null;
    const stars: Record<string, Stars> = {};
    for (const [id, v] of Object.entries(data.s)) if (isStars(v)) stars[id] = v;
    return { stars, ...extras({ look: data.l }) };
  } catch {
    return null;
  }
}

/** Merges loaded progress in, keeping the better rating of each stage. */
export function mergeProgress(progress: Progress, loaded: Pick<Progress, 'stars' | 'look'>): Progress {
  const stars = { ...progress.stars };
  for (const [id, v] of Object.entries(loaded.stars)) if ((stars[id] ?? 0) < v) stars[id] = v;
  return { ...progress, stars, look: progress.look ?? loaded.look };
}
