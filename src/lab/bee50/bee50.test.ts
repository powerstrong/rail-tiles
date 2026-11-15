import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { act, DIRS, isWon, neighbor, type Stage, type State } from '../model';
import { BeeSearch } from '../beeSearch';
import { explore, forward, lastSolvable, reachability } from '../reachability';
import { stagesFor } from '../stages';
import { worldById, stageCards } from '../../worlds';
import { isUnlocked } from '../../ui/StageSelect';
import { continueTarget } from '../../continue';
import { loadProgress, recordClear, saveProgress } from '../../storage';
import { starsFor } from '../../engine/stars';
import { arrowQuality } from './quality';

const added = stagesFor('bee').slice(30);
/** Independent forward oracle: coordinates, Set, no product act/pruning/mask/memo. */
function options(s: Stage, state: State): number[] {
  const at = state.at(-1)!, x = at % s.cols, y = Math.floor(at / s.cols), seen = new Set(state);
  return [[x, y - 1], [x + 1, y], [x, y + 1], [x - 1, y]].flatMap(([nx, ny], dir) => {
    if (nx < 0 || ny < 0 || nx >= s.cols || ny >= s.rows) return [];
    const next = ny * s.cols + nx;
    return s.terrain![next] && !seen.has(next) && (s.arrows?.[at] === undefined || s.arrows[at] === dir)
      && (next !== s.goal[0] || state.length + 1 === s.terrain!.filter(Boolean).length) ? [next] : [];
  });
}
function oracle(s: Stage, state: State): boolean {
  if (state.length === s.terrain!.filter(Boolean).length) return state.at(-1) === s.goal[0];
  return options(s, state).some(n => oracle(s, [...state, n]));
}
const small = (arrows: Record<number, number>): Stage => ({ id: 'oracle', kind: 'bee', number: 41,
  title: '', cols: 3, rows: 3, terrain: Array(9).fill(1), start: [0], goal: [8], arrows, solution: [], par: 8 });

describe('bee 31–50 expansion', () => {
  it('preserves the exact shipped rabbit and bee 1–30 data file', () => {
    const bytes = readFileSync(new URL('../stages.generated.json', import.meta.url));
    expect(createHash('sha256').update(bytes).digest('hex')).toBe('950990d2144087f58b142094feda80766e373107984e4faf127303c92105e6f8');
  });
  it('adds two ten-stage chapters, sequential unlocks, continue and best-star saves', () => {
    const world = worldById('bee')!, cards = stageCards(world);
    expect(added.map(s => s.id)).toEqual(Array.from({ length: 20 }, (_, i) => `lab-v1-bee-${i + 31}`));
    expect(world.unlockAfter).toBeUndefined();
    expect(world.chapters.slice(3).map(c => [c.start, c.count])).toEqual([[30, 10], [40, 10]]);
    expect(isUnlocked(cards, new Set(['lab-v1-bee-30']), 30)).toBe(true);
    expect(isUnlocked(cards, new Set(['lab-v1-bee-30']), 31)).toBe(false);
    const target = continueTarget({ stars: { 'lab-v1-bee-30': 3 }, last: { world: 'bee', stage: 'lab-v1-bee-30' } })!;
    expect(target.world.stages[target.index].id).toBe('lab-v1-bee-31');
    let raw: string | null = null;
    const storage = { getItem: (key: string) => key === 'rail-tiles:progress' ? raw : null, setItem: (_key: string, value: string) => { raw = value; } };
    const old = { schemaVersion: 2, stars: { 'lab-v1-bee-30': 3 as const, 'first-line': 2 as const }, last: { world: 'bee', stage: 'lab-v1-bee-50' } };
    saveProgress(recordClear(old, 'lab-v1-bee-50', starsFor(30, 30, true)), storage);
    saveProgress(recordClear(loadProgress(storage), 'lab-v1-bee-50', 1), storage);
    expect(loadProgress(storage)).toEqual({ ...old, stars: { ...old.stars, 'lab-v1-bee-50': 2 } });
  });
  it('makes chapter four about finishing one garden before crossing its single connector', () => {
    for (const s of added.slice(0, 10)) {
      expect(s.cols).toBe(s.number <= 32 ? 5 : 6);
      expect(s.rows).toBe(6);
      expect(s.arrows).toBeUndefined();
      const cells = s.terrain!.flatMap((open, at) => open ? [at] : []);
      const connectors = cells.filter(cut => {
        const remaining = new Set(cells.filter(n => n !== cut)), groups: number[][] = [];
        while (remaining.size) {
          const group = [remaining.values().next().value!]; remaining.delete(group[0]);
          for (let i = 0; i < group.length; i++) for (let d = 0; d < 4; d++) {
            const n = neighbor(s, group[i], d); if (remaining.delete(n)) group.push(n);
          }
          groups.push(group);
        }
        return groups.length === 2 && groups.every(g => g.length >= 8)
          && groups.some(g => g.includes(s.start[0]) && !g.includes(s.goal[0]));
      });
      expect(connectors.length, s.id).toBeGreaterThan(0);
    }
  });
  it('teaches arrow exits with the first two taps, while retracing ignores arrows', () => {
    const s = added[10];
    expect(s.start).toEqual([0]); expect(s.solution.slice(0, 2)).toEqual([1, 6]);
    expect(act(s, [0], 5)).toBeNull(); // real neighboring flower, wrong exit
    expect(act(s, [0], 1)).toEqual([0, 1]);
    expect(act(s, [0, 1], 6)).toEqual([0, 1, 6]);
    expect(act(s, [0, 1], 0)).toEqual([0]); // arrow points down, undo goes left
    const flower = small({ 4: 1 });
    for (const from of [1, 3, 5, 7]) expect(act(flower, [from], 4)).toEqual([from, 4]);
    expect(act(flower, [1, 4], 5)).toEqual([1, 4, 5]);
    expect(act(flower, [1, 4], 7)).toBeNull();
    expect(act(flower, [1, 4], 1)).toEqual([1]);
  });
  it('requires a real exit-preservation decision in each post-introduction arrow stage', () => {
    for (const s of added.slice(11)) expect(arrowQuality(s).preserveExitDecisions, s.id).toBeGreaterThanOrEqual(1);
  });
  it('namespaces proof keys by immutable arrow layout as well as head/visited set', () => {
    const a = new BeeSearch(small({ 4: 1 })), b = new BeeSearch(small({ 4: 2 }));
    expect(a.key([0, 1, 4])).not.toBe(b.key([0, 1, 4]));
    expect(a.key([0, 1, 4])).not.toBe(a.key([0, 3, 4]));
    const large = new BeeSearch(added[19]);
    expect(large.key([0, 32, 35])).not.toBe(large.key([0, 35]));
  });
  it('agrees with an independent exhaustive directed oracle, including inward arrows and dead exits', () => {
    for (const arrows of [{}, { 4: 1 }, { 4: 0 }, { 1: 2, 4: 1 }, { 0: 0 }, { 3: 1, 4: 3 }] as Record<number, number>[]) {
      const s = small(arrows), search = new BeeSearch(s), stack = [s.start];
      while (stack.length) {
        const state = stack.pop()!;
        expect(search.query(state, 50_000, Infinity).answer, `${JSON.stringify(arrows)} ${state}`).toBe(oracle(s, state) ? 'possible' : 'impossible');
        const ns = options(s, state);
        const product = DIRS.map((_, d) => neighbor(s, state.at(-1)!, d)).filter(n => forward(s, state, n));
        expect(product).toEqual(ns);
        for (const n of ns) stack.push([...state, n]);
      }
    }
  });
  it('proves all new answers and alternatives under the work limit, with recoverable arrow dead ends', () => {
    let recovered = 0;
    for (const s of added) {
      const graph = explore(s), search = graph.bee!;
      let state = s.start;
      for (const a of s.solution) {
        const proof = search.query(state, 6_000, Infinity);
        expect(proof.answer, `${s.id}: ${state}`).toBe('possible');
        expect(isWon(s, proof.path!.reduce((v, n) => act(s, v, n)!, state))).toBe(true);
        for (const n of options(s, state)) {
          const next = [...state, n], answer = search.query(next, 6_000, Infinity);
          expect(answer.answer, s.id).not.toBe('unknown');
          if (s.arrows && answer.answer === 'impossible') {
            const history = next.map((_, i) => next.slice(0, i + 1));
            expect(lastSolvable(graph, history), s.id).toBe(state.length - 1);
            expect(reachability(graph, next)).toBe('impossible'); recovered++;
          }
        }
        state = act(s, state, a)!;
      }
      expect(isWon(s, state), s.id).toBe(true);
      if (s.arrows) expect(Object.keys(s.arrows).length).toBeGreaterThan(0);
    }
    expect(recovered).toBeGreaterThan(0);
  });
});
