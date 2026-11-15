import { KINDS, type Kind } from './model';
export const LAB_PROGRESS_KEY = 'rail-tiles-lab-v1';
export type Rating = 'love' | 'tune' | 'unsure';
export interface LabProgress { completed: Record<string, true>; ratings: Partial<Record<Kind, Rating>> }
export interface LabStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }
const empty = (): LabProgress => ({ completed: {}, ratings: {} });
const validId = (id: string) => [...KINDS, 'coral'].some(k => id.startsWith(`lab-v1-${k}-`) && /^(?:[1-9]|[12][0-9]|30)$/.test(id.slice(`lab-v1-${k}-`.length)));
const validId = (id: string) => [...KINDS, 'balance'].some(k => id.startsWith(`lab-v1-${k}-`) && /^(?:[1-9]|[12][0-9]|30)$/.test(id.slice(`lab-v1-${k}-`.length)));
const validId = (id: string) => [...KINDS, 'cloud'].some(k => id.startsWith(`lab-v1-${k}-`) && /^(?:[1-9]|[12][0-9]|30)$/.test(id.slice(`lab-v1-${k}-`.length)));
const storage = (): LabStorage | null => { try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; } };
export function loadLabProgress(store = storage()): LabProgress {
  try {
    const raw: unknown = JSON.parse(store?.getItem(LAB_PROGRESS_KEY) ?? 'null');
    if (!raw || typeof raw !== 'object') return empty();
    const data = raw as { completed?: unknown; ratings?: unknown };
    const completed: Record<string, true> = {};
    if (data.completed && typeof data.completed === 'object') for (const [id, yes] of Object.entries(data.completed)) {
      if (validId(id) && yes === true) completed[id] = true;
    }
    const ratings: LabProgress['ratings'] = {};
    if (data.ratings && typeof data.ratings === 'object') for (const [id, value] of Object.entries(data.ratings)) {
      if (KINDS.includes(id as Kind) && ['love', 'tune', 'unsure'].includes(value as string)) ratings[id as Kind] = value as Rating;
    }
    return { completed, ratings };
  } catch { return empty(); }
}
export function completeLabStage(p: LabProgress, id: string): LabProgress {
  return !validId(id) || p.completed[id] ? p : { ...p, completed: { ...p.completed, [id]: true } };
}
export function rateLabConcept(p: LabProgress, kind: Kind, rating: Rating): LabProgress {
  return p.ratings[kind] === rating ? p : { ...p, ratings: { ...p.ratings, [kind]: rating } };
}
/** Union completion stamps across tabs; lab play never grants official-world stars or unlocks. */
export function saveLabProgress(p: LabProgress, store = storage()): boolean {
  try {
    if (!store) return false;
    const old = loadLabProgress(store);
    store.setItem(LAB_PROGRESS_KEY, JSON.stringify({ completed: { ...old.completed, ...p.completed }, ratings: { ...old.ratings, ...p.ratings } }));
    return true;
  } catch { return false; }
}
