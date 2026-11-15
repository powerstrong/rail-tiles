import { neighbors, type FlowStage } from './model';

export interface Candidate { path: number[]; mask: number }
export interface FlowAudit { solutions: number; candidates: number[]; rounds: number; deductions: number; logicSolved: boolean; nodes: number }

/** Offline verifier only. Every simple path is enumerated; hitting a cap is an error, never unique. */
export function candidatesFor(s: FlowStage): Candidate[][] {
  if (s.cols * s.rows > 30) throw new Error('Flow verifier supports at most 30 squares');
  const adj = Array.from({ length: s.cols * s.rows }, (_, c) => neighbors(s, c));
  return s.pairs.map((pair, color) => {
    const forbidden = new Set(s.pairs.flatMap((p, i) => i === color ? [] : [...p.ends, ...p.via]));
    const out: Candidate[] = [];
    let visits = 0;
    const walk = (path: number[], mask: number) => {
      if (++visits > 1_000_000 || out.length > 40_000) throw new Error(`Flow candidate cap: ${s.id}`);
      const head = path.at(-1)!;
      if (head === pair.ends[1]) {
        if (pair.via.every(c => (mask & 2 ** c) !== 0)) out.push({ path, mask });
        return;
      }
      for (const c of adj[head]) if (!(mask & 2 ** c) && !forbidden.has(c)) walk([...path, c], mask | 2 ** c);
    };
    walk([pair.ends[0]], 2 ** pair.ends[0]);
    return out;
  });
}

/** Constraint propagation: disjoint support in each other color + squares with only one possible owner.
 * This certificate never branches. It is a mechanical inference check, not a claim about child difficulty.
 */
export function deduce(s: FlowStage, original: Candidate[][]) {
  let domains = original.map(d => [...d]), rounds = 0, deductions = 0;
  for (;;) {
    const next = domains.map((domain, color) => domain.filter(p => domains.every((other, i) => i === color || other.some(q => !(q.mask & p.mask)))));
    if (s.fill) for (const c of s.cells) {
      const bit = 2 ** c, owners = next.flatMap((d, i) => d.some(p => p.mask & bit) ? [i] : []);
      if (owners.length === 1) next[owners[0]] = next[owners[0]].filter(p => p.mask & bit);
    }
    const removed = domains.reduce((n, d, i) => n + d.length - next[i].length, 0);
    if (!removed) break;
    rounds++; deductions += removed; domains = next;
  }
  const single = domains.every(d => d.length === 1);
  const covered = single ? domains.reduce((mask, d) => mask | d[0].mask, 0) : 0;
  const full = s.cells.reduce((mask, c) => mask | 2 ** c, 0);
  return { domains, rounds, deductions, logicSolved: single && (!s.fill || covered === full) };
}

/** Independent exact combination search on the unpruned route domains, stops after second solution. */
export function auditStage(s: FlowStage): FlowAudit {
  const domains = candidatesFor(s), logic = deduce(s, domains);
  const full = s.cells.reduce((m, c) => m | 2 ** c, 0);
  let solutions = 0, nodes = 0;
  const search = (left: number[], used: number) => {
    if (++nodes > 2_000_000) throw new Error(`Flow combination cap: ${s.id}`);
    if (solutions >= 2) return;
    if (!left.length) { if (!s.fill || used === full) solutions++; return; }
    const available = left.map(i => ({ i, choices: domains[i].filter(p => !(p.mask & used)) })).sort((a, b) => a.choices.length - b.choices.length);
    const first = available[0];
    if (!first.choices.length) return;
    if (s.fill) {
      const possible = available.reduce((m, d) => d.choices.reduce((m, p) => m | p.mask, m), used);
      if (possible !== full) return;
    }
    for (const p of first.choices) search(left.filter(i => i !== first.i), used | p.mask);
  };
  search(domains.map((_, i) => i), 0);
  return { solutions, candidates: domains.map(d => d.length), rounds: logic.rounds, deductions: logic.deductions, logicSolved: logic.logicSolved, nodes };
}
