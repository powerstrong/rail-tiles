import { useEffect, useState } from 'react';
import type { CargoStage, Move } from './model';
import { explore } from './solver';
import { type YardState, keyOf, move, movesFrom } from './yard';

/** Fewest moves to clear from every yard the stage can reach, by key (dead ends left out). */
export function winEntries(stage: CargoStage): [string, number][] | null {
  const g = explore(stage);
  if (!g) return null;
  const out: [string, number][] = [];
  for (const [key, id] of g.ids) if (g.toWin[id] >= 0) out.push([key, g.toWin[id]]);
  return out;
}

/** The first move of a shortest way to clear from `s`, by the map. */
export function nextMoveBy(stage: CargoStage, map: Map<string, number>, s: YardState): Move | null {
  const d = map.get(keyOf(s));
  if (d === undefined || d === 0) return null;
  return movesFrom(s).find((m) => map.get(keyOf(move(stage, s, m)!.next)) === d - 1) ?? null;
}

/**
 * Fewest moves to clear from every yard the stage can reach, by key; null until it is ready (or
 * when the stage is too big to map). Mapped in a worker, so opening a stage never waits for it;
 * without workers it is mapped just after the stage first shows.
 */
export function useWinMap(stage: CargoStage): Map<string, number> | null {
  const [map, setMap] = useState<Map<string, number> | null>(null);
  useEffect(() => {
    let alive = true;
    let worker: Worker | null = null;
    let timer = 0;
    setMap(null);
    const done = (entries: [string, number][] | null) => {
      if (alive) setMap(entries ? new Map(entries) : null);
    };
    const inline = () => {
      timer = window.setTimeout(() => done(winEntries(stage)), 30);
    };
    try {
      worker = new Worker(new URL('./winMap.worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (e: MessageEvent<[string, number][] | null>) => {
        worker?.terminate();
        done(e.data);
      };
      worker.onerror = () => {
        worker?.terminate();
        inline();
      };
      worker.postMessage(stage);
    } catch {
      inline();
    }
    return () => {
      alive = false;
      worker?.terminate();
      clearTimeout(timer);
    };
  }, [stage]);
  return map;
}
