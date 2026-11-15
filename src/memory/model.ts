import type { Stars } from '../engine/stars';

export const FACE_NAMES = {
  apple: '사과', banana: '바나나', grapes: '포도', strawberry: '딸기',
  rabbit: '토끼', bear: '곰', fish: '물고기', butterfly: '나비',
  train: '기차', boat: '배', umbrella: '우산', key: '열쇠',
  leaf: '나뭇잎', mushroom: '버섯', acorn: '도토리', flower: '꽃',
  octopus: '문어', crab: '게', turtle: '거북', lighthouse: '등대',
  rocket: '로켓', planet: '고리 행성', robot: '로봇', telescope: '망원경',
} as const;
export type Face = keyof typeof FACE_NAMES;
export interface MemoryStage {
  chapter: 1 | 2 | 3; number: number;
  postcard?: { asset: string; map?: { row: number; col: number } };
  id: string; title: string; label: string; rows: number; cols: number; faces: Face[];
}
export interface MemoryState {
  roundId: number; seed: number; deck: Face[]; matched: number[]; seen: number[];
  first: number | null;
  pendingMismatch: { positions: [number, number]; attemptId: number } | null;
  attempts: number; misses: number; hinted: boolean;
  hint: number[]; hintId: number; note: string;
  lastMatch: [number, number] | null;
}
export type MemoryEvent =
  | { type: 'flip'; index: number }
  | { type: 'expire'; roundId: number; attemptId: number }
  | { type: 'restart'; stage: MemoryStage; seed: number }
  | { type: 'hint' }
  | { type: 'clearHint'; roundId: number; hintId: number };

/** Seeded Fisher–Yates; randomness belongs to round creation, never a reducer step. */
export function shuffleDeck(faces: readonly Face[], seed: number): Face[] {
  let s = seed >>> 0;
  const random = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const deck = [...faces, ...faces];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}
export function createRound(stage: MemoryStage, seed: number, roundId = 1): MemoryState {
  return { roundId, seed, deck: shuffleDeck(stage.faces, seed), matched: [], seen: [], first: null,
    pendingMismatch: null, attempts: 0, misses: 0, hinted: false, hint: [], hintId: 0, note: '', lastMatch: null };
}
export const isComplete = (s: MemoryState) => s.matched.length === s.deck.length;
export const isFaceUp = (s: MemoryState, i: number) => s.matched.includes(i) || s.first === i || !!s.pendingMismatch?.positions.includes(i);
export const starLimits = (pairs: number) => ({ three: pairs === 10 ? 23 : pairs === 8 ? 15 : Math.ceil(1.5 * pairs), two: pairs === 10 ? 40 : pairs === 8 ? 28 : 3 * pairs });
export function memoryStarsFor(misses: number, pairs: number, hinted = false): Stars {
  const limits = starLimits(pairs);
  const raw = misses <= limits.three ? 3 : misses <= limits.two ? 2 : 1;
  return hinted && raw === 3 ? 2 : raw;
}
function knownPair(s: MemoryState): number[] {
  const available = s.seen.filter(i => !s.matched.includes(i));
  if (s.first !== null) {
    const other = available.find(i => i !== s.first && s.deck[i] === s.deck[s.first!]);
    return other === undefined ? [] : [other];
  }
  for (const i of available) {
    const j = available.find(j => j !== i && s.deck[j] === s.deck[i]);
    if (j !== undefined) return [i, j];
  }
  return [];
}
export function memoryReducer(s: MemoryState, event: MemoryEvent): MemoryState {
  if (event.type === 'restart') return createRound(event.stage, event.seed, s.roundId + 1);
  if (event.type === 'expire') return event.roundId === s.roundId && event.attemptId === s.pendingMismatch?.attemptId
    ? { ...s, pendingMismatch: null } : s;
  if (event.type === 'clearHint') return event.roundId === s.roundId && event.hintId === s.hintId && s.hint.length
    ? { ...s, hint: [] } : s;
  if (isComplete(s)) return s;
  if (event.type === 'hint') {
    const hint = knownPair(s);
    return hint.length ? { ...s, hint, hintId: s.hintId + 1, hinted: true, pendingMismatch: null, note: '본 적 있는 짝이 여기 있어요! 이 판은 최대 별 두 개예요.' }
      : { ...s, note: '카드를 조금 더 만나 봐요' };
  }
  const i = event.index;
  if (!Number.isInteger(i) || i < 0 || i >= s.deck.length || isFaceUp(s, i)) return s;
  const seen = s.seen.includes(i) ? s.seen : [...s.seen, i];
  const base = { ...s, seen, hint: [], note: '' };
  // A third card starts a new turn in this same event. No input is swallowed.
  if (s.first === null) return { ...base, pendingMismatch: null, first: i };
  const pair: [number, number] = [s.first, i];
  const attempts = s.attempts + 1;
  if (s.deck[s.first] === s.deck[i]) return { ...base, first: null, attempts, matched: [...s.matched, ...pair], lastMatch: pair };
  return { ...base, first: null, attempts, misses: s.misses + 1, pendingMismatch: { positions: pair, attemptId: attempts } };
}
