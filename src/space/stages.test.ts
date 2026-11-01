import { describe, expect, it } from 'vitest';
import { dailySpaceDef, dailySpaceStage, naivePresses, without } from './generate';
import { after, initialState, isWon, press } from './gravity';
import { pressName } from './model';
import { explore, solveSpace } from './solver';
import { SPACE_CHAPTERS, SPACE_STAGES } from './stages';

const parOf = (s: (typeof SPACE_STAGES)[number]) => solveSpace(s).par;

describe('space stages', () => {
  it('have unique sp- ids, three chapters of ten, a bonus at 5 and the boss at 10', () => {
    expect(new Set(SPACE_STAGES.map((s) => s.id)).size).toBe(SPACE_STAGES.length);
    for (const s of SPACE_STAGES) expect(s.id.startsWith('sp-')).toBe(true);
    expect(SPACE_CHAPTERS.map((c) => c.count)).toEqual([10, 10, 10]);
    for (const ch of SPACE_CHAPTERS) {
      SPACE_STAGES.slice(ch.start, ch.start + ch.count).forEach((s, k) => expect(s.limit !== undefined, s.id).toBe(k === 4));
    }
  });

  for (const stage of SPACE_STAGES) {
    it(`${stage.label} ${stage.id}: the listed answer wins in par presses and par is the true minimum`, () => {
      let s = initialState(stage);
      for (const d of stage.solution) {
        const p = press(stage, s, d);
        expect(p.frames.length, `${pressName(d)} does something`).toBeGreaterThan(0);
        s = p.next;
      }
      expect(isWon(stage, s)).toBe(true);
      expect(stage.solution.length).toBe(stage.par);
      const res = solveSpace(stage);
      expect(res.truncated).toBe(false);
      expect(res.par).toBe(stage.par);
      // The screen maps every layout when the stage opens: keep that quick on a phone.
      expect(res.reachable).toBeLessThan(40_000);
      if (stage.limit !== undefined) expect(stage.limit).toBeGreaterThan(stage.par);
    }, 30_000);
  }

  it('start with no capsule already home, and keep docks off boosters and wormholes', () => {
    for (const s of SPACE_STAGES) {
      expect(s.start.some((c, k) => c === s.docks[k]), s.id).toBe(false);
      for (const c of s.docks) expect(s.tiles[c].t, s.id).toBe('dock');
    }
  });

  it('bring in one thing per chapter: walls, then boosters, then wormholes', () => {
    SPACE_CHAPTERS.forEach((ch, c) => {
      for (const s of SPACE_STAGES.slice(ch.start, ch.start + ch.count)) {
        const pads = s.tiles.some((t) => t.t === 'pad');
        const holes = s.tiles.some((t) => t.t === 'hole');
        if (c === 0) expect(pads || holes, s.id).toBe(false);
        if (c === 1) expect([pads, holes], s.id).toEqual([true, false]);
        if (c === 2) expect(holes, s.id).toBe(true);
      }
    });
  });

  it('need their boosters and wormholes: without them the docks are further away or out of reach', () => {
    for (const s of SPACE_STAGES) {
      for (const kind of ['pad', 'hole'] as const) {
        if (!s.tiles.some((t) => t.t === kind)) continue;
        const p = parOf(without(s, kind));
        expect(p === null || p > s.par, `${s.id} without ${kind}: ${p}`).toBe(true);
      }
    }
  });

  it('teach one capsule first, then two, then three', () => {
    const counts = SPACE_STAGES.map((s) => s.capsules.length);
    expect(counts.slice(0, 2)).toEqual([1, 1]);
    expect(counts[2]).toBe(2);
    for (const ch of SPACE_CHAPTERS) {
      const boss = SPACE_STAGES[ch.start + ch.count - 1];
      expect(boss.capsules.length, boss.id).toBe(3);
    }
  });

  it('give every pressable layout a way to look ahead (the hint), from the start of each stage', () => {
    for (const s of SPACE_STAGES) {
      const g = explore(s);
      let st = initialState(s);
      for (const d of s.solution) {
        expect(g.toWin.has(String.fromCharCode(...st.map((c) => c + 40))), s.id).toBe(true);
        st = after(s, st, d);
      }
    }
  });

  it('ask for real thinking past the first lessons: moving straight at the docks never earns ★★★', () => {
    const lessons = ['sp-first-gravity', 'sp-wall-stop', 'sp-two-capsules', 'sp-booster', 'sp-wormhole'];
    for (const s of SPACE_STAGES) {
      if (lessons.includes(s.id)) continue;
      expect(naivePresses(s), s.id).toBeGreaterThan(s.par);
    }
  });
});

describe('space daily puzzle', () => {
  it('is the same for a date everywhere, wins in its par and needs thinking, every weekday', () => {
    for (let d = 1; d <= 7; d++) {
      const date = `2026-11-0${d}`;
      const def = dailySpaceDef(date);
      expect(dailySpaceDef(date)).toEqual(def);
      expect(def.id).toBe(`space-daily-${date}`);
      const stage = dailySpaceStage(def);
      expect(solveSpace(stage).par, date).toBe(def.par);
      let st = initialState(stage);
      for (const p of stage.solution) st = after(stage, st, p);
      expect(isWon(stage, st), date).toBe(true);
      expect(naivePresses(stage), date).toBeGreaterThan(stage.par);
    }
  }, 120_000);
});
