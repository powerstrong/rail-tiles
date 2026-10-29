import { createContext, useContext } from 'react';

/**
 * Train customisation ("기차 꾸미기"). Items unlock with the total stars earned in every world,
 * and later items are fancier, so the train keeps getting prettier as the player plays on.
 */
export type Slot = 'body' | 'roof' | 'smoke' | 'deco';

export interface Paint {
  main: string;
  dark: string;
  hi: string;
  /** Painted with a gradient (rainbow, jewel) instead of a flat colour. */
  gradient?: string[];
}

export interface LookItem {
  id: string;
  slot: Slot;
  name: string;
  /** Total stars needed to unlock. */
  stars: number;
  paint?: Paint;
}

const paint = (main: string, dark: string, hi: string, gradient?: string[]): Paint => ({ main, dark, hi, gradient });

export const LOOK_ITEMS: LookItem[] = [
  // Body
  { id: 'body-red', slot: 'body', name: '빨강', stars: 0, paint: paint('#E5584F', '#BF423B', '#F58270') },
  { id: 'body-blue', slot: 'body', name: '파랑', stars: 8, paint: paint('#3A8FD9', '#2A6FB0', '#6CB3EE') },
  { id: 'body-green', slot: 'body', name: '초록', stars: 20, paint: paint('#4CAF6A', '#378A50', '#7ACB8F') },
  { id: 'body-yellow', slot: 'body', name: '노랑', stars: 40, paint: paint('#F2C13A', '#C99A1F', '#FFDC74') },
  { id: 'body-pink', slot: 'body', name: '분홍', stars: 65, paint: paint('#F07BA8', '#C9578A', '#FFA9CA') },
  { id: 'body-purple', slot: 'body', name: '보라', stars: 95, paint: paint('#8E6BD1', '#6A4BAD', '#B596EC') },
  { id: 'body-night', slot: 'body', name: '밤하늘', stars: 170, paint: paint('#2E3A5C', '#1D2640', '#5B6EA6') },
  { id: 'body-gold', slot: 'body', name: '반짝 금색', stars: 220, paint: paint('#E8B93A', '#B88A1A', '#FFE9A0', ['#FFE9A0', '#E8B93A', '#C9921C', '#FFE38A']) },
  { id: 'body-rainbow', slot: 'body', name: '무지개', stars: 300, paint: paint('#F07BA8', '#8E6BD1', '#FFF3DC', ['#FF6B6B', '#FFB347', '#FFE066', '#6BD68A', '#5AB8F0', '#B48BF2']) },
  { id: 'body-jewel', slot: 'body', name: '보석', stars: 400, paint: paint('#7FD6F0', '#3FA3C9', '#E8FBFF', ['#E8FBFF', '#9FE3F7', '#C9B8FF', '#7FD6F0', '#FFFFFF']) },
  // Cab roof
  { id: 'roof-teal', slot: 'roof', name: '청록 지붕', stars: 0, paint: paint('#2F7F78', '#21605A', '#4FA59C') },
  { id: 'roof-navy', slot: 'roof', name: '남색 지붕', stars: 12, paint: paint('#34508A', '#243A66', '#5A78B5') },
  { id: 'roof-orange', slot: 'roof', name: '주황 지붕', stars: 30, paint: paint('#F08A3C', '#C46A26', '#FFB070') },
  { id: 'roof-white', slot: 'roof', name: '하얀 지붕', stars: 55, paint: paint('#F4F1EA', '#C9C2B4', '#FFFFFF') },
  { id: 'roof-mint', slot: 'roof', name: '민트 지붕', stars: 85, paint: paint('#5FD3B5', '#3AA88C', '#9BEBD6') },
  { id: 'roof-pink', slot: 'roof', name: '분홍 지붕', stars: 120, paint: paint('#F59AC0', '#D06D98', '#FFC4DC') },
  { id: 'roof-gold', slot: 'roof', name: '금빛 지붕', stars: 260, paint: paint('#E8B93A', '#B88A1A', '#FFE9A0', ['#FFE9A0', '#E8B93A', '#C9921C']) },
  // Smoke
  { id: 'smoke-cloud', slot: 'smoke', name: '하얀 연기', stars: 0 },
  { id: 'smoke-heart', slot: 'smoke', name: '하트 연기', stars: 25 },
  { id: 'smoke-star', slot: 'smoke', name: '별 연기', stars: 50 },
  { id: 'smoke-note', slot: 'smoke', name: '음표 연기', stars: 80 },
  { id: 'smoke-bubble', slot: 'smoke', name: '비눗방울', stars: 110 },
  { id: 'smoke-rainbow', slot: 'smoke', name: '무지개 연기', stars: 180 },
  { id: 'smoke-sparkle', slot: 'smoke', name: '반짝이 가루', stars: 350 },
  // Decorations
  { id: 'deco-none', slot: 'deco', name: '장식 없음', stars: 0 },
  { id: 'deco-flag', slot: 'deco', name: '깃발', stars: 15 },
  { id: 'deco-ribbon', slot: 'deco', name: '리본', stars: 35 },
  { id: 'deco-flowers', slot: 'deco', name: '꽃 장식', stars: 60 },
  { id: 'deco-stars', slot: 'deco', name: '별 스티커', stars: 100 },
  { id: 'deco-hearts', slot: 'deco', name: '하트 스티커', stars: 140 },
  { id: 'deco-crown', slot: 'deco', name: '왕관', stars: 250 },
  { id: 'deco-wings', slot: 'deco', name: '천사 날개', stars: 450 },
  { id: 'deco-aura', slot: 'deco', name: '반짝반짝 오라', stars: 520 },
];

export const SLOTS: { slot: Slot; title: string }[] = [
  { slot: 'body', title: '기차 색' },
  { slot: 'roof', title: '지붕 색' },
  { slot: 'smoke', title: '연기' },
  { slot: 'deco', title: '장식' },
];

export type TrainLook = Record<Slot, string>;

export const DEFAULT_LOOK: TrainLook = { body: 'body-red', roof: 'roof-teal', smoke: 'smoke-cloud', deco: 'deco-none' };

/** Items everyone starts with: a first visit to the garage shows everything else earned so far as new. */
export const STARTER_COUNT = LOOK_ITEMS.filter((i) => i.stars === 0).length;

export const itemById = (id: string) => LOOK_ITEMS.find((i) => i.id === id);

/** Unlocked items, earliest first (so a count of items seen marks which ones are new). */
export const unlockedItems = (stars: number) => LOOK_ITEMS.filter((i) => i.stars <= stars).sort((a, b) => a.stars - b.stars);

/** The next item still locked, and how many stars it needs. */
export function nextUnlock(stars: number): LookItem | null {
  return LOOK_ITEMS.filter((i) => i.stars > stars).sort((a, b) => a.stars - b.stars)[0] ?? null;
}

/** A saved look, with anything unknown or no longer unlocked swapped back to the default. */
export function safeLook(look: Partial<TrainLook> | undefined, stars: number): TrainLook {
  const out = { ...DEFAULT_LOOK };
  for (const { slot } of SLOTS) {
    const item = look?.[slot] ? itemById(look[slot]!) : undefined;
    if (item && item.slot === slot && item.stars <= stars) out[slot] = item.id;
  }
  return out;
}

export const LookContext = createContext<TrainLook>(DEFAULT_LOOK);
export const useLook = () => useContext(LookContext);

// ---------------------------------------------------------------- smoke

const HEART = 'M0 4 C-7 -2 -6 -8 -2.5 -8 C-1 -8 0 -6.5 0 -5.5 C0 -6.5 1 -8 2.5 -8 C6 -8 7 -2 0 4 Z';
const STAR = 'M0 -8 L2.3 -2.5 L8 -2.5 L3.5 1 L5 7 L0 3.6 L-5 7 L-3.5 1 L-8 -2.5 L-2.3 -2.5 Z';
const NOTE = 'M2 -8 V3 A3.5 3 0 1 1 -1.5 0 A3.5 3 0 0 1 0 0.4 V-8 Z M2 -8 L7 -6 V-3.5 L2 -5.5 Z';
const RAINBOW = ['#FF6B6B', '#FFB347', '#FFE066', '#6BD68A', '#5AB8F0', '#B48BF2'];

/** One smoke puff element for the chosen style, centred on (x, y). `n` varies colours. */
export function makePuff(smoke: string, x: number, y: number, n: number): SVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const shape = smoke === 'smoke-heart' ? HEART : smoke === 'smoke-star' || smoke === 'smoke-sparkle' ? STAR : smoke === 'smoke-note' ? NOTE : null;
  // The shape sits at the origin of a positioned group, so the CSS puff animation (a transform)
  // never fights the placement.
  const group = document.createElementNS(ns, 'g');
  group.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
  let el: SVGElement;
  if (shape) {
    el = document.createElementNS(ns, 'path');
    el.setAttribute('d', shape);
  } else {
    el = document.createElementNS(ns, 'circle');
    el.setAttribute('r', '7');
  }
  group.appendChild(el);
  const fill =
    smoke === 'smoke-heart'
      ? '#FF8FB1'
      : smoke === 'smoke-star'
        ? '#FFD34E'
        : smoke === 'smoke-note'
          ? '#7A6CF0'
          : smoke === 'smoke-rainbow'
            ? RAINBOW[n % RAINBOW.length]
            : smoke === 'smoke-sparkle'
              ? ['#FFE38A', '#FFFFFF', '#FFC94A'][n % 3]
              : null;
  if (fill) el.style.fill = fill;
  if (smoke === 'smoke-bubble') {
    el.style.fill = 'rgba(190, 230, 255, 0.35)';
    el.style.stroke = RAINBOW[n % RAINBOW.length];
    el.style.strokeWidth = '1.6';
  }
  el.setAttribute('class', `puff${shape ? ' puff-shape' : ''}${smoke === 'smoke-sparkle' ? ' puff-sparkle' : ''}`);
  el.addEventListener('animationend', () => group.remove());
  return group;
}
