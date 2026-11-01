import { describe, expect, it } from 'vitest';
import { WORLDS } from '../worlds';
import { STORIES } from './stories';

describe('world arrival stories', () => {
  it('has one for every world, and none for a world that does not exist', () => {
    expect(Object.keys(STORIES).sort()).toEqual(WORLDS.map((w) => w.id).sort());
  });

  for (const w of WORLDS) {
    it(`${w.title}: two or three short lines, so a young reader is not kept waiting`, () => {
      const story = STORIES[w.id];
      expect(story.friend.length).toBeGreaterThan(0);
      expect(story.lines.length).toBeGreaterThanOrEqual(2);
      expect(story.lines.length).toBeLessThanOrEqual(3);
      for (const line of story.lines) expect(line.length, line).toBeLessThanOrEqual(34);
    });

    it(`${w.title}: a farewell of three short lines too`, () => {
      const { farewell } = STORIES[w.id];
      expect(farewell.lines.length).toBe(3);
      for (const line of farewell.lines) expect(line.length, line).toBeLessThanOrEqual(34);
      expect(farewell.tail).toBeGreaterThan(0);
      expect(farewell.tail).toBeLessThan(100);
    });
  }
});
