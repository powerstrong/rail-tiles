import { useEffect, useState } from 'react';
import type { SpaceStage } from './model';
import { explore } from './solver';

/**
 * Fewest presses to dock from every layout the stage can reach, by layout key; null until it is
 * ready (or when the stage is too big to map). Mapped in a worker, so opening a stage never waits
 * for it; without workers it is mapped just after the stage first shows.
 */
export function useWinMap(stage: SpaceStage): Map<string, number> | null {
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
      timer = window.setTimeout(() => {
        const g = explore(stage);
        done(g.truncated ? null : [...g.toWin]);
      }, 30);
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
