import { describe, expect, it } from 'vitest';
import { type CargoStageDef, parseCargoStage } from './model';
import { distance, explore, nextMove, solveCargo } from './solver';
import { initialState, isWon, keyOf, move, phases, whyNot } from './yard';

const yard = (wagons: string[], board = '', chain?: number) => parseCargoStage({ id: 't', title: '', tip: '', wagons, board, par: 0, solution: '', chain } as CargoStageDef, 1);
const glyphs = (w: string[]) => w.map((s) => [...s].map((c) => 'FWCSMG'[Number(c)]).join(''));

describe('freight yard rules', () => {
  it('lifts the whole top run of one kind, as many as fit', () => {
    const st = yard(['3:', '3:WFF', '3:F']);
    const s = initialState(st);
    const step = move(st, s, [1, 2])!;
    expect(step.carried).toBe(2);
    expect(glyphs(step.next.w)).toEqual(['', 'W', 'FFF']);
    const two = move(st, s, [1, 0])!;
    expect(two.carried).toBe(2);
    expect(glyphs(two.next.w)).toEqual(['FF', 'W', 'F']);
  });

  it('drops only onto an empty wagon or the same kind, never over the size, never from a tied-up wagon', () => {
    const st = yard(['3:W', '3:FFF', '3:WC', '3:F']);
    const s = initialState(st);
    expect(whyNot(s, [3, 2])).toBe('kind');
    expect(whyNot(s, [3, 1])).toBe('full');
    expect(whyNot(s, [1, 3])).toBe('tied');
    expect(whyNot(s, [0, 0])).toBe('same');
    expect(move(st, s, [3, 2])).toBeNull();
  });

  it('sends the front wagon off once it is full of one kind; the line moves up and an empty wagon of its size joins at the back', () => {
    const st = yard(['2:F', '3:WF', '4:']);
    const step = move(st, initialState(st), [1, 0])!;
    expect(step.departed).toEqual([{ wagon: 0, kind: 0 }]);
    expect(glyphs(step.next.w)).toEqual(['W', '', '']);
    expect(step.next.sizes).toEqual([3, 4, 2]);
  });

  it('keeps a full wagon behind the front waiting, then sends it right after the front one (a chain)', () => {
    const st = yard(['3:FF', '3:WW', '3:FW', '3:']);
    const tie = move(st, initialState(st), [2, 1])!;
    expect(tie.departed).toEqual([]);
    expect(glyphs(tie.next.w)).toEqual(['FF', 'WWW', 'F', '']);
    const go = move(st, tie.next, [2, 0])!;
    expect(go.departed.map((d) => d.kind)).toEqual([0, 1]);
    expect(go.next.w.every((w) => !w)).toBe(true);
    expect(isWon(st, go.next)).toBe(true);
  });

  it('with a departure board, sends only the kind whose turn it is', () => {
    const st = yard(['3:FF', '3:WW', '3:WF', '3:'], 'WF');
    const front = move(st, initialState(st), [2, 0])!;
    // Fish fills the front, but the board wants flowers first: it waits, and the line is stuck.
    expect(front.departed).toEqual([]);
    expect(isWon(st, front.next)).toBe(false);
    // Nothing can ever leave again: a dead end, though the yard itself can be cleared.
    const g = explore(st)!;
    expect(distance(g, front.next)).toBe(-1);
    expect(g.toWin[0]).toBe(5);
  });

  it('plays a move as the screen shows it: boxes down first, then one train at a time', () => {
    const st = yard(['3:FF', '3:WW', '3:FW', '3:']);
    const tie = move(st, initialState(st), [2, 1])!.next;
    const ph = phases(st, tie, [2, 0])!;
    expect(glyphs(ph.landed.w)).toEqual(['FFF', 'WWW', '', '']);
    expect(ph.after.length).toBe(2);
    expect(ph.after[1]).toEqual(move(st, tie, [2, 0])!.next);
  });

  it('counts a chain towards a bonus goal only when one move sends that many', () => {
    const st = yard(['3:FF', '3:WW', '3:FW', '3:'], '', 2);
    expect(solveCargo(st)!.par).toBe(2);
    const slow = yard(['3:FF', '3:WWW', '3:F'], '', 2);
    // The flowers are already tied up behind; fish to the front sends both at once.
    expect(solveCargo(slow)!.par).toBe(1);
  });

  it('tells wagon orders apart (the line matters)', () => {
    const a = initialState(yard(['3:F', '3:W']));
    const b = initialState(yard(['3:W', '3:F']));
    expect(keyOf(a)).not.toBe(keyOf(b));
  });

  it('finds the fewest moves and a hint that keeps to them', () => {
    const st = yard(['3:FF', '3:WWF', '3:W']);
    const g = explore(st)!;
    expect(g.toWin[0]).toBe(2);
    expect(nextMove(st, g, initialState(st))).toEqual([1, 0]);
  });
});
