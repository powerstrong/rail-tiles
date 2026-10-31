import { describe, expect, it } from 'vitest';
import { LOOK_ITEMS } from './ui/look';
import { isUnlocked } from './ui/StageSelect';
import { WORLDS, stageCards, worldById } from './worlds';

const ownerOf = (stageId: string | undefined) => WORLDS.find((w) => w.stages.some((s) => s.id === stageId));

describe('world registry', () => {
  it('has unique world ids', () => {
    expect(new Set(WORLDS.map((w) => w.id)).size).toBe(WORLDS.length);
  });

  it('never gives two stages the same id, in any world (stars and unlocks are stored by id)', () => {
    const seen = new Map<string, string>();
    const dupes: string[] = [];
    for (const w of WORLDS) {
      for (const s of w.stages) {
        const other = seen.get(s.id);
        if (other) dupes.push(`${s.id} (${other} and ${w.id})`);
        seen.set(s.id, w.id);
      }
    }
    expect(dupes).toEqual([]);
  });

  it('keeps daily puzzle ids apart from stage ids and from each other (streaks count ids by prefix)', () => {
    const prefixes = WORLDS.flatMap((w) => (w.daily ? [w.daily.prefix] : []));
    for (const p of prefixes) {
      for (const q of prefixes) if (p !== q) expect(q.startsWith(p), `${q} starts with ${p}`).toBe(false);
      for (const w of WORLDS) for (const s of w.stages) expect(s.id.startsWith(p), `${s.id} looks like a ${p} daily puzzle`).toBe(false);
    }
    expect(new Set(prefixes).size).toBe(prefixes.length);
  });

  it('lets every world be opened by playing from the start', () => {
    const open = new Set(WORLDS.filter((w) => !w.unlockAfter).map((w) => w.id));
    for (let grew = true; grew; ) {
      grew = false;
      for (const w of WORLDS) {
        const owner = ownerOf(w.unlockAfter);
        if (!open.has(w.id) && owner && open.has(owner.id)) {
          open.add(w.id);
          grew = true;
        }
      }
    }
    expect([...open].sort()).toEqual(WORLDS.map((w) => w.id).sort());
  });

  it('keeps the shipped unlock rules (players already opened worlds by them)', () => {
    const rules = Object.fromEntries(WORLDS.map((w) => [w.id, [w.unlockAfter ?? null, w.daily?.unlockAfter ?? null, w.daily?.prefix ?? null]]));
    expect(rules).toEqual({
      train: [null, 'first-passenger', 'daily-'],
      train2: ['last-delivery', null, null],
      ice: ['last-delivery', 'ice-snow-pile', 'ice-daily-'],
      machine: ['ice-conquer', null, null],
      volcano: ['mc-final-boss', null, null],
      depot: ['t2-final-boss', 'dp-water-tower', 'depot-daily-'],
    });
  });

  it('lets every garage item be unlocked with the stars of the regular stages', () => {
    const most = WORLDS.reduce((sum, w) => sum + w.stages.length * 3, 0);
    for (const item of LOOK_ITEMS) expect(item.stars, item.id).toBeLessThanOrEqual(most);
    // Every slot's items get dearer in order, so a later item never comes before an earlier one.
    for (const slot of ['body', 'roof', 'smoke', 'deco']) {
      const stars = LOOK_ITEMS.filter((i) => i.slot === slot).map((i) => i.stars);
      expect(stars, slot).toEqual([...stars].sort((a, b) => a - b));
    }
  });

  it('marks the bonus stages each world has', () => {
    const bonuses = Object.fromEntries(WORLDS.map((w) => [w.id, stageCards(w).filter((c) => c.bonus).length]));
    expect(bonuses).toEqual({ train: 0, train2: 5, ice: 0, machine: 3, volcano: 3, depot: 3 });
  });

  for (const w of WORLDS) {
    describe(w.title, () => {
      it('has chapters that cover its stages in order', () => {
        let next = 0;
        for (const ch of w.chapters) {
          expect(ch.start).toBe(next);
          expect(ch.count).toBeGreaterThan(0);
          next += ch.count;
        }
        expect(next).toBe(w.stages.length);
      });

      it('opens after a stage of another world, and its daily puzzle after one of its own', () => {
        if (w.unlockAfter) {
          const owner = ownerOf(w.unlockAfter);
          expect(owner, `${w.unlockAfter} is not a stage`).toBeDefined();
          expect(owner?.id).not.toBe(w.id);
          expect(w.lockNote).toBeTruthy();
        }
        if (w.daily) expect(ownerOf(w.daily.unlockAfter)?.id).toBe(w.id);
      });

      it('has intro cards only for its own stages', () => {
        const ids = new Set(w.stages.map((s) => s.id));
        for (const id of Object.keys(w.intros ?? {})) expect(ids.has(id), id).toBe(true);
      });

      it('keeps bonus stages inside a chapter: never first, never the boss, never two in a row', () => {
        const cards = stageCards(w);
        for (const ch of w.chapters) {
          for (let k = 0; k < ch.count; k++) {
            const card = cards[ch.start + k];
            if (!card.bonus) continue;
            expect(k, card.id).toBeGreaterThan(0);
            expect(k, card.id).toBeLessThan(ch.count - 1);
            expect(cards[ch.start + k - 1].bonus, card.id).toBe(false);
          }
        }
      });
    });
  }
});

describe('stage unlocks', () => {
  it('opens the stage after a bonus once the stage before the bonus is cleared', () => {
    const cards = stageCards(worldById('machine')!);
    const bonus = cards.findIndex((c) => c.bonus);
    const cleared = new Set(cards.slice(0, bonus).map((c) => c.id));
    expect(isUnlocked(cards, cleared, bonus)).toBe(true);
    expect(isUnlocked(cards, cleared, bonus + 1)).toBe(true);
    expect(isUnlocked(cards, cleared, bonus + 2)).toBe(false);
  });

  it('keeps a normal stage in the way', () => {
    const cards = stageCards(worldById('ice')!);
    const cleared = new Set([cards[0].id]);
    expect(isUnlocked(cards, cleared, 1)).toBe(true);
    expect(isUnlocked(cards, cleared, 2)).toBe(false);
  });

  it('keeps cleared stages open, so a stage added later never locks old progress', () => {
    const cards = [
      { id: 'a', title: 'a' },
      { id: 'added-later', title: 'new' },
      { id: 'b', title: 'b' },
      { id: 'c', title: 'c' },
    ];
    const cleared = new Set(['a', 'b']);
    expect(isUnlocked(cards, cleared, 1)).toBe(true);
    expect(isUnlocked(cards, cleared, 2)).toBe(true);
    expect(isUnlocked(cards, cleared, 3)).toBe(true);
  });
});
