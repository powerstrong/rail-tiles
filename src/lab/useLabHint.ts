import { useEffect, useRef, useState } from 'react';
import { describeAction, keyOf, type Stage, type State } from './model';
import type { SearchResult } from './solver';
interface Hint { at: string; action: number | null; text: string }
/** A fresh, cancellable Worker keeps exploration off the main thread, even after a wrong turn. */
export function useLabHint(stage: Stage, state: State) {
  const at = `${stage.id}:${keyOf(state)}`;
  const [result, setResult] = useState<Hint | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const worker = useRef<Worker | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout>>();
  const generation = useRef(0);
  const cancel = () => { generation.current++; worker.current?.terminate(); worker.current = null; clearTimeout(timeout.current); };
  useEffect(() => { cancel(); setWorking(null); setResult(null); return cancel; }, [at]);
  const clear = () => { cancel(); setWorking(null); setResult(null); };
  const request = () => {
    cancel();
    const mine = generation.current;
    setWorking(at); setResult(null);
    const say = (text: string, action: number | null = null) => {
      if (mine !== generation.current) return;
      setResult({ at, action, text }); setWorking(null); cancel();
    };
    try {
      const w = new Worker(new URL('./hint.worker.ts', import.meta.url), { type: 'module' });
      worker.current = w;
      w.onmessage = (e: MessageEvent<{ ok: boolean; result?: SearchResult }>) => {
        const r = e.data.result;
        if (!e.data.ok || !r) { say('힌트를 불러오지 못했어요. 잠시 뒤 다시 눌러 주세요.'); return; }
        if (r.path?.length) say(describeAction(stage, state, r.path[0]), r.path[0]);
        else if (r.path) say('이미 멋지게 완성했어요!');
        else if (r.exhausted) say('길을 더 찾아봐야 해요. 한두 번 되돌리거나 처음부터 다시 생각해 볼까요?');
        else say('이 자리에서는 완성할 길이 없어요. 되돌려 다른 길을 골라 보세요.');
      };
      w.onerror = () => say('힌트를 불러오지 못했어요. 되돌리기와 규칙 보기는 계속 쓸 수 있어요.');
      timeout.current = setTimeout(() => say('생각이 조금 길어지네요. 되돌린 뒤 다시 힌트를 눌러 보세요.'), 12_000);
      w.postMessage({ stage, state });
    } catch { say('이 브라우저에서는 힌트를 불러오지 못했어요. 되돌리기와 규칙 보기를 이용해 주세요.'); }
  };
  return { hint: result?.at === at ? result.action : null, text: result?.at === at ? result.text : '', busy: working === at, request, clear };
}
