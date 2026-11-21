import { BoardFirst, showBoard } from '../ui/BoardFirst';
import { StageCompletion } from '../ui/StageCompletion';
import { type CSSProperties, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react';
import { conceptById } from './catalog';
import { act, isWon, type Kind, type Stage, type State } from './model';
import { LabBoard } from './LabBoard';
import { stagesFor } from './stages';
import { explore, lastSolvable, reachability } from './reachability';
import { useLabHint } from './useLabHint';
import { isMuted, play, setMuted, type Sfx } from '../ui/sound';
import { starsFor, TWO_STAR_SLACK } from '../engine/stars';
import type { GameProps } from '../worlds';
import './lab.css';

/** Sound of one accepted move, per game. Win, undo and blocked moves have their own sounds. */
const MOVE_SFX: Record<Kind, Sfx> = { twins: 'swish', bee: 'swish' };
/** How long the board celebrates before the result card takes focus (0 with reduced motion). */
const CELEBRATE_MS = 900;
const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

interface PlayState { history: State[]; note: string; fx: { kind: 'move' | 'deny' | 'undo' | 'reset'; seq: number; action?: number } | null }
type PlayEvent = { type: 'move'; action: number } | { type: 'direction'; direction: number } | { type: 'undo' } | { type: 'reset' } | { type: 'clear-note' } | { type: 'recover'; index: number };
function invalidNote(stage: Stage): string {
  switch (stage.kind) {
    case 'twins': return '두 토끼 모두 막혀 있어요. 다른 방향을 찾아볼까요?';
    case 'bee': return stage.arrows ? '화살표 꽃에서는 화살표 쪽으로 나가요. 직전 꽃으로 되짚어도 돼요. 벌집은 맨 마지막이에요.' : '아직 가지 않은 이웃 꽃을 골라요. 벌집은 맨 마지막이에요.';
    default: return '다른 칸을 골라 다시 해 봐요.';
  }
}
export function PuzzleScreen({ stage, bestStars, hasNext, onCleared, onBack, onNext }: GameProps<Stage>) {
  const concept = conceptById(stage.kind);
  const [hinted, setHinted] = useState(false);
  const [game, dispatch] = useReducer((current: PlayState, event: PlayEvent): PlayState => {
    if (event.type === 'clear-note') return current.note ? { ...current, note: '' } : current;
    const fx = (kind: NonNullable<PlayState['fx']>['kind']) => ({ kind, seq: (current.fx?.seq ?? 0) + 1 });
    if (event.type === 'recover') return { history: current.history.slice(0, event.index + 1), note: '풀 수 있던 자리로 돌아왔어요. 다른 꽃길을 골라 봐요.', fx: fx('undo') };
    if (event.type === 'reset') return { history: [[...stage.start]], note: '처음 자리로 돌아왔어요. 다른 생각으로 다시 떠나요.', fx: fx('reset') };
    if (event.type === 'undo') return current.history.length > 1 ? { history: current.history.slice(0, -1), note: '한 걸음 되돌렸어요. 천천히 생각해도 좋아요.', fx: fx('undo') } : current;
    const now = current.history.at(-1)!;
    if (isWon(stage, now)) return current;
    // Resolve directional moves against reducer state, including multiple batched key events.
    const action = event.type === 'direction'
      ? event.direction
      : event.action;
    if (action < 0) return current;
    const next = act(stage, now, action);
    if (next && stage.kind === 'bee' && next.length < now.length) return { history: current.history.slice(0, -1), note: '꽃길 한 칸을 되짚었어요.', fx: fx('undo') };
    return next ? { history: [...current.history, next], note: '', fx: { ...fx('move'), action } } : { ...current, note: invalidNote(stage), fx: fx('deny') };
  }, { history: [[...stage.start]], note: '', fx: null });
  const state = game.history.at(-1)!, won = isWon(stage, state), moves = game.history.length - 1;
  const graph = useMemo(() => {
    if (stage.kind !== 'bee') return null;
    try { return explore(stage); } catch { return null; }
  }, [stage]);
  const stuck = reachability(graph, state) === 'impossible';
  const recoveryIndex = lastSolvable(graph, game.history);
  // The board comes first: rules are on the stage list and one tap away here, so they never push the board off a phone screen.
  const [helpOpen, setHelpOpen] = useState(false);
  const [muted, setMutedState] = useState(isMuted);
  const toggleMute = () => { setMuted(!muted); setMutedState(!muted); };
  useEffect(() => {
    if (!game.fx) return;
    if (game.fx.kind === 'move') play(isWon(stage, game.history.at(-1)!) ? 'arrive' : MOVE_SFX[stage.kind]);
    else play(game.fx.kind === 'deny' ? 'deny' : 'erase');
  }, [game.fx, stage]);
  const hint = useLabHint(stage, state);
  const heading = useRef<HTMLHeadingElement>(null);
  const recorded = useRef(false);
  const [cardShown, setCardShown] = useState(false);
  const completeRef = useRef(onCleared);
  completeRef.current = onCleared;
  useLayoutEffect(() => {
    heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);
  useEffect(() => {
    if (won && !recorded.current) { recorded.current = true; completeRef.current(stage.id, starsFor(moves, stage.par, hinted)); }
    if (!won) { recorded.current = false; setCardShown(false); return; }
    // Let the child see the finished board and its sparkle first. The card (and its buttons) does not exist
    // until then, so nothing invisible can take a tap or a key press.
    if (reducedMotion()) { setCardShown(true); return; }
    const t = window.setTimeout(() => setCardShown(true), CELEBRATE_MS);
    return () => clearTimeout(t);
  }, [won, stage.id, moves, hinted, stage.par]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'z' || event.shiftKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable || target?.matches('input,textarea,select')) return;
      event.preventDefault(); dispatch({ type: 'undo' });
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  useEffect(() => {
    if (!(stage.kind === 'twins') || won) return;
    const arrow = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable || target?.matches('input,textarea,select')) return;
      // Focused boards already handle arrows. Tools and the entry heading need this fallback.
      if (target?.closest('.lb-movement')) return;
      const direction = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'].indexOf(event.key);
      if (direction < 0) return;
      event.preventDefault();
      if (!event.repeat) dispatch({ type: 'direction', direction });
    };
    window.addEventListener('keydown', arrow);
    return () => window.removeEventListener('keydown', arrow);
  }, [stage.kind, won]);
  const total = stagesFor(stage.kind).length;
  const progressText = stage.kind === 'bee' ? `방문한 꽃길 ${state.length} / ${stage.terrain!.filter(Boolean).length}` : `${moves}번 움직였어요`;
  return <main className={`lab lab-play lab-${concept.id}`} style={{ '--lab-accent': `var(--lab-theme-accent, ${concept.color})`, '--lab-wash': `var(--lab-theme-wash, ${concept.wash})`, '--lab-board-ratio': stage.cols / stage.rows, '--lab-board-cols': stage.cols } as CSSProperties}>
    <header className="lab-top"><button className="lab-back" onClick={onBack}>← 스테이지 고르기</button><span className="lab-play-world"><span aria-hidden="true">{concept.icon}</span>{concept.title}</span>
      <button className="lab-mute" onClick={toggleMute} aria-label={muted ? '소리 켜기' : '소리 끄기'} aria-pressed={muted}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5 H7.5 L12 5.5 V18.5 L7.5 14.5 H4 Z" />{muted ? <path d="M16 9.5 L21 14.5 M21 9.5 L16 14.5" /> : <path d="M15.5 9 Q17.5 12 15.5 15 M18 6.5 Q22 12 18 17.5" />}</svg></button></header>
    <div className="lab-play-heading"><div><p className="lab-eyebrow">{concept.chapters[Math.floor((stage.number - 1) / 10)]} · {stage.number} / {total}</p><h1 tabIndex={-1} ref={heading}>{stage.title}</h1></div>{bestStars > 0 && <span className="lab-done-tag">✓ 최고 별 {bestStars}개</span>}</div>
    <div className="lab-play-goal"><span aria-hidden="true">⚑</span><p>{concept.goal}</p><button className={bestStars === 0 && !helpOpen ? 'is-new' : ''} aria-expanded={helpOpen} aria-controls="lab-play-rules" onClick={() => setHelpOpen(open => !open)}>{helpOpen ? '규칙 접기' : '규칙 보기'} <span aria-hidden="true">{helpOpen ? '−' : '+'}</span></button></div>
    {helpOpen && <section className="lab-play-rules" id="lab-play-rules" aria-label="게임 규칙"><p>{concept.goal} {concept.story}</p>{stage.kind === 'bee' && stage.number >= 31 && <p>{stage.arrows ? '화살표 꽃에서는 화살표 쪽으로 나가요. 들어오는 쪽은 자유! 되짚기도 돼요.' : '두 꽃밭 사이 작은 길! 건너기 전에 이쪽 꽃을 모두 만나 봐요.'}</p>}<ol>{concept.rules.map(rule => <li key={rule}>{rule}</li>)}</ol><button className="lab-text-button" onClick={() => setHelpOpen(false)}>알겠어요, 해 볼게요 ↓</button></section>}
    <BoardFirst status={progressText}>
    <div className={`lab-play-canvas${won ? ' is-won' : ''}`}><LabBoard stage={stage} state={state} onAction={action => dispatch({ type: 'move', action })} hint={hint.hint} disabled={won} previousState={game.history.at(-2)} lastAction={game.fx?.kind === 'move' ? game.fx.action ?? null : null} />
      {won && <div className="lab-celebrate" aria-hidden="true">{Array.from({ length: 10 }, (_, i) => <span key={i} className="lab-spark-burst" style={{ '--i': i } as CSSProperties}>{i % 3 ? '✦' : '★'}</span>)}<p className="lab-cheer"><span>{concept.icon}</span>{concept.cheer}</p></div>}
    </div>
    </BoardFirst>
    <div className="lab-play-status"><span>{progressText}</span><span>★★★ {stage.par} · ★★ {stage.par + TWO_STAR_SLACK}번 이하{hinted ? ' · 힌트 사용(최대 ★★)' : ''}</span></div>
    <div className="lab-message-slot">
      {stuck ? <div className="lab-stuck" role="status">이 꽃길은 끝까지 이을 수 없어요. 되짚어 볼까요?
        {recoveryIndex >= 0 && <button aria-label="마지막으로 풀 수 있던 지점으로 되돌리기" onClick={() => { hint.clear(); dispatch({ type: 'recover', index: recoveryIndex }); }}>풀 수 있던 곳으로 ↶</button>}
      </div> : <div className={`lab-feedback-line${game.note || hint.text ? ' has-message' : ''}`} role="status" aria-live="polite">{game.note || hint.text || (won ? `${concept.cheer} 오늘도 새로운 생각을 찾았어요.` : stage.kind === 'bee' ? '이웃 꽃을 잇고, 직전 꽃으로 되짚어요.' : '두 친구를 함께 집으로 데려가요.')}</div>}
    </div>
    <div className="lab-tools" aria-label="퍼즐 도움 도구">
      <button onClick={() => dispatch({ type: 'undo' })} disabled={moves === 0}><span aria-hidden="true">↶</span><span>되돌리기</span></button>
      <button onClick={() => { hint.clear(); setHinted(false); dispatch({ type: 'reset' }); showBoard(); }}><span aria-hidden="true">↻</span><span>처음부터</span></button>
      <button onClick={() => { dispatch({ type: 'clear-note' }); setHinted(true); hint.request(); }} disabled={hint.busy || won} aria-busy={hint.busy}><span aria-hidden="true">{hint.busy ? '◌' : '💡'}</span><span>{hint.busy ? '생각하는 중…' : '한 걸음 힌트'}</span></button>
    </div>
    {won && cardShown && <StageCompletion className="lab-clear" stars={starsFor(moves, stage.par, hinted)} hasNext={hasNext} onNext={onNext} onBack={onBack} nextClassName="lab-solid-button" backClassName="lab-outline-button" actionsClassName="lab-clear-actions" />}
  </main>;
}
