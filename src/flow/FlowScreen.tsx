import { BoardFirst, BoardMap, showBoard } from '../ui/BoardFirst';
import { StageCompletion } from '../ui/StageCompletion';
import { type CSSProperties, useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';
import type { GameProps } from '../worlds';
import { starsFor } from '../engine/stars';
import { isMuted, play, setMuted } from '../ui/sound';
import { FLOW_CHAPTERS } from './stages';
import { feedback, initialPlay, isComplete, reducePlay, threadLength, THREADS, type FlowStage } from './model';
import { FlowBoard } from './FlowBoard';
import { Spool } from './FlowArt';
import './flow.css';

export function FlowScreen({ stage, bestStars, hasNext, onBack, onNext, onCleared }: GameProps<FlowStage>) {
  const [game, dispatch] = useReducer((g: ReturnType<typeof initialPlay>, a: Parameters<typeof reducePlay>[2]) => reducePlay(stage,g,a), stage, initialPlay);
  const [help, setHelp] = useState(false), [muted, setMutedState] = useState(isMuted);
  const heading = useRef<HTMLHeadingElement>(null), complete = useRef(false);
  const callback = useRef(onCleared); callback.current = onCleared;
  const previous = useRef(game.paths);
  const f = feedback(stage, game.paths), won = isComplete(stage,game.paths) && !game.before;
  const stars = starsFor(threadLength(game.paths), stage.par, game.hinted);
  useLayoutEffect(() => { heading.current?.focus({ preventScroll:true }); window.scrollTo(0,0); }, []);
  useEffect(() => {
    if (previous.current === game.paths) return;
    const oldLength = previous.current.flat().length;
    previous.current = game.paths;
    play(game.paths.flat().length < oldLength ? 'erase' : 'swish');
  }, [game.paths]);
  useEffect(() => {
    if (won && !complete.current) { callback.current(stage.id, stars); play('arrive'); }
    complete.current = won;
  }, [won, stars, stage.id]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); dispatch({ type:'undo' }); }
      if (e.key === 'Escape') dispatch({ type:'cancel' });
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown',key);
  }, []);
  const chapter = FLOW_CHAPTERS[Math.floor((stage.number-1)/10)];
  const rule = stage.fill ? '같은 무늬를 잇고, 모든 칸을 채워요.' : '같은 무늬 단추끼리 이어요. 빈칸은 남아도 좋아요.';
  return <main className="flow-play" style={{ '--cover-cols': stage.cols, '--cover-ratio': stage.cols / stage.rows } as CSSProperties}>
    <header className="flow-top"><button onClick={onBack}>← 스테이지 고르기</button><span>색깔 길 잇기</span><button className="flow-mute" aria-label={muted ? '소리 켜기' : '소리 끄기'} aria-pressed={muted} onClick={() => { setMuted(!muted); setMutedState(!muted); }}>{muted ? '♪ 꺼짐' : '♪ 켜짐'}</button></header>
    <div className="flow-heading"><div><p className="flow-kicker">실바람 마을 · {chapter.number}장 · {(stage.number-1)%10+1}/10</p><h1 ref={heading} tabIndex={-1}>{stage.title}</h1></div><div className="flow-spool"><Spool happy={won} /></div></div>
    <div className="flow-rule"><p>{rule}{stage.number >= 21 && <strong> 같은 무늬 고리도 지나가요.</strong>}</p><button onClick={() => setHelp(v => !v)} aria-expanded={help} aria-controls="flow-rules">{help ? '접기' : '도움말'}</button></div>
    {help && <section id="flow-rules" className="flow-help" aria-label="게임 규칙"><p>마을 잔치에 걸 조각보를 함께 꿰매요.</p><ul><li>색과 무늬가 같은 단추 두 개를 드래그로 이어요. 실은 위·아래·옆으로만 가요.</li><li>실 위에서 다시 그리면 그 자리 뒤쪽이 지워져요. 다른 실을 지나면 그 실이 바로 끊겨요.</li><li>다른 무늬의 단추와 고리는 그 무늬 실의 자리예요.</li><li>{stage.fill ? '천 조각을 뺀 모든 칸을 채워야 완성이에요.' : '단추 짝만 모두 이으면 완성! 빈칸은 채우지 않아도 돼요.'}</li><li>탭으로 단추를 고른 뒤 이웃 빈칸을 톡톡 눌러도 돼요. 키보드는 방향키로 칸 선택, Enter로 실 잇기예요.</li></ul><p>완성한 실의 길이 {stage.par}칸 이하 ★★★ · {stage.par+2}칸 이하 ★★ · 그 외 ★. 힌트를 쓰면 최대 ★★예요. 다시 그린 횟수와 시간은 별에 영향을 주지 않아요.</p></section>}
    {stage.number === 1 && <p className="flow-first">● 단추에서 같은 ● 단추까지 쭉 그어 보세요.</p>}
    {stage.number === 11 && <p className="flow-first">새 발견! 두 단추가 이어져도 빈칸이 남으면 길을 바꿔 봐요.</p>}
    {stage.number === 21 && <p className="flow-first">새 발견! 점선 고리는 같은 무늬 실이 꼭 지나갈 자리예요.</p>}
    <BoardFirst status={<>{f.joined} / {stage.pairs.length}짝 연결</>}>
    <BoardMap>
    <div className={`flow-cloth${won ? ' is-complete' : ''}`}><FlowBoard stage={stage} game={game} dispatch={dispatch} /></div>
    </BoardMap>
    </BoardFirst>
    <div className="flow-status" aria-label="길 잇기 진행"><span><b>{f.joined}</b> / {stage.pairs.length}짝 연결</span><span>끊긴 짝 <b>{f.loose}</b></span><span>남은 칸 <b>{f.remaining}</b>{!stage.fill && ' · 남아도 돼요'}</span></div>
    <div className="flow-legend" aria-label="실의 색과 무늬">{stage.pairs.map((_,i) => <span key={i} style={{ '--thread-color': THREADS[i].color } as CSSProperties}>{THREADS[i].mark} {THREADS[i].name.split(' ')[0]}</span>)}</div>
    <p className="flow-note" role="status" aria-live="polite">{game.note || (won ? '한 땀 한 땀, 마을의 천이 완성됐어요!' : game.active !== null ? `${THREADS[game.active].name} 실을 잇는 중 · 다른 실 위에 그리면 그 실이 끊겨요.` : '단추나 그려 둔 실에서 시작해요. 언제든 고칠 수 있어요.')}</p>
    <div className="flow-tools" aria-label="퍼즐 도움 도구"><button onClick={() => dispatch({ type:'undo' })} disabled={!game.history.length && !game.before}>↶ 되돌리기</button><button onClick={() => { dispatch({ type:'reset' }); showBoard(); }}>↻ 처음부터</button><button onClick={() => dispatch({ type:'hint' })} disabled={won}>✦ 한 줄 힌트</button></div>
    <p className="flow-rating">{game.hinted ? '힌트 사용 · 이번 완성은 최대 ★★' : '몇 번 고쳐도 괜찮아요 · 힌트 없이 완성하면 ★★★'}{bestStars > 0 && ` · 최고 ★${bestStars}`}</p>
    {won && <StageCompletion className="flow-clear" stars={stars} hasNext={hasNext} onNext={onNext} onBack={onBack} nextClassName="flow-next" />}
  </main>;
}
