import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MEMORY_CHAPTERS, MEMORY_STAGES, POSTCARD_STAGES, memoryChapterNote } from './stages';
import { isUnlocked } from '../ui/StageSelect';
import { MemoryPostcard } from './MemoryPostcard';
import { PostcardArt } from './PostcardArt';
import { MemoryMap } from './MemoryCollection';
import { MemoryArt } from './MemoryArt';
import { MemoryBoard } from './MemoryBoard';
import { createRound, FACE_NAMES, memoryReducer } from './model';
describe('memory thirty-stage course and art', () => {
  it('ships three chapters, thirty stable ids and the approved rectangular sizes and face sets', () => {
    expect(MEMORY_CHAPTERS).toEqual([
      expect.objectContaining({ number: 1, start: 0, count: 10, title: '첫 짝꿍' }),
      expect.objectContaining({ number: 2, start: 10, count: 10, title: '그림 너머의 풍경' }),
      expect.objectContaining({ number: 3, start: 20, count: 10, title: '이어지는 세계' }),
    ]);
    expect(MEMORY_STAGES.map(s => s.id)).toEqual([1, 2, 3].flatMap(ch => Array.from({ length: 10 }, (_, i) => `memory-${ch}-${String(i + 1).padStart(2, '0')}`)));
    expect(MEMORY_STAGES.map(s => s.faces.length)).toEqual([2, 2, 3, 3, 3, 4, 4, 4, 6, 6, 6, 6, 6, 8, 8, 6, 8, 8, 8, 8, 8, 8, 8, 8, 10, 10, 8, 10, 10, 10]);
    expect(MEMORY_STAGES.slice(0, 10).map(s => s.faces.join(','))).toEqual([
      'apple,banana', 'rabbit,bear', 'apple,banana,grapes', 'rabbit,bear,fish', 'train,boat,umbrella',
      'apple,banana,grapes,strawberry', 'rabbit,bear,fish,butterfly', 'train,boat,umbrella,key',
      'apple,banana,grapes,train,boat,umbrella', 'rabbit,bear,fish,butterfly,strawberry,key',
    ]);
    for (const s of MEMORY_STAGES) {
      expect(s.chapter).toBe(Math.floor(MEMORY_STAGES.indexOf(s) / 10) + 1);
      expect(s.number).toBe(MEMORY_STAGES.indexOf(s) % 10 + 1);
      expect(s.cols).toBe(s.faces.length === 10 ? 5 : s.faces.length >= 6 ? 4 : s.faces.length);
      expect(s.rows * s.cols).toBe(s.faces.length * 2);
      expect(new Set(s.faces).size).toBe(s.faces.length);
      for (const face of s.faces) expect(renderToStaticMarkup(createElement(MemoryArt, { face }))).toContain('<svg');
    }
    expect(new Set(MEMORY_STAGES.flatMap(s => s.faces)).size).toBe(24);
  });
  it('keeps hidden pictures out of the DOM and names revealed cards by position and face', () => {
    const stage = MEMORY_STAGES[0], state = createRound(stage, 7);
    const hidden = renderToStaticMarkup(createElement(MemoryBoard, { stage, state, onFlip: () => {} }));
    expect(hidden).toContain('1행 1열, 뒷면');
    for (const name of Object.values(FACE_NAMES)) expect(hidden).not.toContain(name);
    const shown = memoryReducer(state, { type: 'flip', index: 0 });
    expect(renderToStaticMarkup(createElement(MemoryBoard, { stage, state: shown, onFlip: () => {} }))).toContain(`1행 1열, ${FACE_NAMES[state.deck[0]]}`);
  });
});

describe('postcards, partial maps and chapter completion', () => {
  const render = (id: string, pairs: number, matched: number) => renderToStaticMarkup(createElement(MemoryPostcard, { id, pairs, matched }));
  it('maps twenty distinct scenes and ten positions to the specified serpentine order', () => {
    expect(POSTCARD_STAGES).toHaveLength(20);
    expect(new Set(POSTCARD_STAGES.map(s => s.postcard!.asset)).size).toBe(20);
    expect(MEMORY_STAGES.slice(20).map(s => s.postcard!.map)).toEqual([
      {row:0,col:0},{row:0,col:1},{row:1,col:1},{row:1,col:0},{row:2,col:0},
      {row:2,col:1},{row:3,col:1},{row:3,col:0},{row:4,col:0},{row:4,col:1},
    ]);
    for (const s of POSTCARD_STAGES) {
      expect(renderToStaticMarkup(createElement(PostcardArt, { id: s.id }))).toContain('<path');
      const covered = render(s.id, s.faces.length, 0);
      expect(covered.match(/<span/g)).toHaveLength(s.faces.length);
      expect(covered).not.toContain('is-revealed');
      expect(render(s.id, s.faces.length, s.faces.length).match(/class="is-revealed"/g)).toHaveLength(s.faces.length);
    }
    const partial = renderToStaticMarkup(createElement(MemoryMap, { collected: new Set(['memory-3-10']) }));
    expect(partial.match(/memory-map-missing/g)).toHaveLength(9);
    expect(partial.match(/<svg/g)).toHaveLength(1);
  });
  it('reveals the same landscape for different shuffle seeds and match orders, without card clues', () => {
    for (const stage of [MEMORY_STAGES[13], MEMORY_STAGES[29]]) {
      const results = [42, 97].map((seed, order) => {
        let s = createRound(stage, seed);
        for (const face of (order ? [...stage.faces].reverse() : stage.faces).slice(0, 3)) {
          for (const index of s.deck.flatMap((f, i) => f === face ? [i] : [])) s = memoryReducer(s, { type: 'flip', index });
        }
        return render(stage.id, stage.faces.length, s.matched.length / 2);
      });
      expect(results[0]).toBe(results[1]);
      expect(results[0].match(/class="is-revealed"/g)).toHaveLength(3);
      expect(results[0]).not.toMatch(/행|열|뒷면|data-face|memory-face/);
    }
  });
  it('opens chapter boundaries with one star and reports only genuinely completed chapters', () => {
    for (const index of [10, 20]) {
      expect(isUnlocked(MEMORY_STAGES, new Set(), index)).toBe(false);
      expect(isUnlocked(MEMORY_STAGES, new Set([MEMORY_STAGES[index - 1].id]), index)).toBe(true);
    }
    for (const [i, note] of [[9, '첫 짝꿍 10판을 해냈어요!'], [19, '열 장의 풍경을 발견했어요!'], [29, '탐험 지도 완성!']] as const) {
      expect(memoryChapterNote(MEMORY_STAGES[i].id, new Set())).toBeUndefined();
      const others = new Set(MEMORY_STAGES.slice(i - 9, i).map(s => s.id));
      expect(memoryChapterNote(MEMORY_STAGES[i].id, others)).toBe(note);
      others.delete(MEMORY_STAGES[i - 5].id);
      expect(memoryChapterNote(MEMORY_STAGES[i].id, others)).toBeUndefined();
    }
  });
});
