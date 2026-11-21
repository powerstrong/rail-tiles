import { BoardFirst, BoardMap, showBoard } from '../ui/BoardFirst';
import { StageCompletion } from '../ui/StageCompletion';
import { useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';
import type { GameProps } from '../worlds';
import { isMuted, play, setMuted } from '../ui/sound';
import { createRound, FACE_NAMES, isComplete, memoryReducer, memoryStarsFor, starLimits, type MemoryStage } from './model';
import { MemoryBoard } from './MemoryBoard';
import { MemoryArt } from './MemoryArt';
import { MEMORY_CHAPTERS } from './stages';
import { MemoryPostcard } from './MemoryPostcard';
import { PostcardArt } from './PostcardArt';
import './memory.css';
const newSeed = () => crypto.getRandomValues(new Uint32Array(1))[0];
export function MemoryScreen({ stage, bestStars, hasNext, onCleared, onBack, onNext }: GameProps<MemoryStage>) {
  const [state, dispatch] = useReducer(memoryReducer, stage, s => createRound(s, newSeed()));
  const [manualCover, setManualCover] = useState(false);
  const [muted, setMutedState] = useState(isMuted);
  const [rulesOpen, setRulesOpen] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const recordedRound = useRef<number | null>(null);
  const completed = isComplete(state), pairs = stage.faces.length, limits = starLimits(pairs);
  const rating = memoryStarsFor(state.misses, pairs, state.hinted);
  const callbacks = useRef(onCleared);
  callbacks.current = onCleared;
  const sounded = useRef({ round: state.roundId, attempts: 0, matched: 0 });
  useLayoutEffect(() => { heading.current?.focus({ preventScroll: true }); window.scrollTo(0, 0); }, []);
  useEffect(() => {
    const pending = state.pendingMismatch;
    if (!pending || manualCover) return;
    const timer = window.setTimeout(() => dispatch({ type: 'expire', roundId: state.roundId, attemptId: pending.attemptId }), 900);
    return () => clearTimeout(timer);
  }, [state.pendingMismatch, state.roundId, manualCover]);
  useEffect(() => {
    if (!state.hint.length) return;
    const timer = window.setTimeout(() => dispatch({ type: 'clearHint', roundId: state.roundId, hintId: state.hintId }), 600);
    return () => clearTimeout(timer);
  }, [state.hint, state.hintId, state.roundId]);
  useEffect(() => {
    const before = sounded.current;
    if (before.round === state.roundId) {
      if (state.matched.length > before.matched) play(completed ? 'arrive' : 'pickup');
      else if (state.attempts > before.attempts || state.first !== null) play('place');
    }
    sounded.current = { round: state.roundId, matched: state.matched.length, attempts: state.attempts };
  }, [state.attempts, state.first, state.matched.length, state.seen.length, state.roundId, completed]);
  useLayoutEffect(() => {
    if (!completed || recordedRound.current === state.roundId) return;
    recordedRound.current = state.roundId;
    callbacks.current(stage.id, rating);

  }, [completed, state.roundId, stage.id, rating]);
  const lastFace = state.lastMatch && state.deck[state.lastMatch[0]];
  return <main className="memory-screen world-memory">
    <header className="memory-top"><button onClick={onBack}>← 스테이지 고르기</button><span>미지의 세계</span>
      <button aria-label={muted ? '소리 켜기' : '소리 끄기'} aria-pressed={muted} onClick={() => { setMuted(!muted); setMutedState(!muted); }}>{muted ? '♪ 켜기' : '♪ 끄기'}</button></header>
    <div className="memory-heading"><p>{MEMORY_CHAPTERS[stage.chapter - 1].title} · {stage.chapter}-{stage.number} / {stage.chapter}-10</p><h1 tabIndex={-1} ref={heading}>{stage.title}</h1></div>
    <div className="memory-score"><span>안 맞은 횟수 <strong>{state.misses}</strong></span><span>최고 별 {bestStars ? '★'.repeat(bestStars) : '아직 없어요'}</span></div>
    <p className="memory-limits">★★★ {limits.three}번 이하 · ★★ {limits.two}번 이하{state.hinted ? ' · 힌트 사용: 최대 ★★' : ''}</p>
    <div className="memory-shelf" role="status"><span>찾은 짝 <strong>{state.matched.length / 2} / {pairs}</strong></span>{stage.postcard ? <div className="memory-place"><MemoryPostcard id={stage.id} pairs={pairs} matched={state.matched.length / 2}/>{bestStars > 0 && <small>이미 모은 엽서</small>}</div> : lastFace && <span className="memory-collected"><MemoryArt face={lastFace}/>{FACE_NAMES[lastFace]} 짝꿍!</span>}</div>
    <BoardFirst status={<>찾은 짝 {state.matched.length / 2} / {pairs} · 안 맞음 {state.misses}</>}>
    <BoardMap>
    <MemoryBoard stage={stage} state={state} onFlip={index => dispatch({ type: 'flip', index })}/>
    </BoardMap>
    </BoardFirst>
    <p className="memory-note" role="status">{state.note || (completed ? '모든 짝이 제자리를 찾았어요!' : state.pendingMismatch ? '다음 카드를 누르면 바로 이어져요.' : '천천히 기억해요. 몇 번이든 괜찮아요.')}</p>
    {completed && <StageCompletion className="memory-result" stars={rating} hasNext={hasNext} onNext={onNext} onBack={onBack} nextClassName="memory-primary">{stage.postcard && <figure className="memory-result-postcard"><PostcardArt id={stage.id}/></figure>}</StageCompletion>}
    <div className="memory-tools"><button onClick={() => { dispatch({ type: 'restart', stage, seed: newSeed() }); showBoard(); }}>↻ 새로 섞어 시작</button><button disabled={completed} onClick={() => dispatch({ type: 'hint' })}>본 짝 알려주기 · 사용하면 최대 ★★</button></div>
    <label className="memory-observe"><input type="checkbox" checked={manualCover} onChange={e => setManualCover(e.target.checked)}/>다음 카드를 누를 때 덮기</label>
    <button className="memory-rules-toggle" aria-expanded={rulesOpen} aria-controls="memory-rules" onClick={() => setRulesOpen(!rulesOpen)}>{rulesOpen ? '규칙 접기 −' : '규칙 보기 +'}</button>
    {rulesOpen && <section id="memory-rules" className="memory-rules" aria-label="게임 규칙"><p>같은 그림 두 장을 찾아 주세요. 짝을 찾으며 새로운 풍경을 만나요.</p><ul><li>두 장씩 열어요. 같으면 그림이 그대로 남아요.</li><li>다르면 잠깐 보여 준 뒤 덮어요. 기다리지 않고 다음 카드를 눌러도 돼요.</li><li>본 짝 알려주기는 이미 본 카드만 알려 줘요. 도움을 받으면 최대 별 두 개예요.</li><li>시간과 실수 제한은 없어요. 완료하면 별 하나 이상을 받아요.</li><li>나갔다 돌아오면 새 카드로 시작해요.</li></ul></section>}
  </main>;
}
