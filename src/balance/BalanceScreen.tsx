import { useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';
import type { GameProps } from '../worlds';
import { starsFor, TWO_STAR_SLACK } from '../engine/stars';
import { StarRow } from '../ui/StageSelect';
import { isMuted, play, setMuted } from '../ui/sound';
import { CandyArt, ScaleArt } from './art';
import { isWon, move, solve, totals, type BalanceStage, type State } from './model';
import { CHAPTER_TITLES } from './generate';
import './balance.css';

interface Game { history: State[]; hinted: boolean; hint: number | null }
type Event = { type: 'move'; group: number } | { type: 'undo' } | { type: 'reset' } | { type: 'hint' };
export function BalanceScreen({ stage, bestStars, hasNext, onBack, onNext, onCleared }: GameProps<BalanceStage>) {
  const [game, dispatch] = useReducer((current: Game, event: Event): Game => {
    if (event.type === 'reset') return { history: [[...stage.start]], hinted: false, hint: null };
    if (event.type === 'undo') return { ...current, history: current.history.length > 1 ? current.history.slice(0, -1) : current.history, hint: null };
    const now = current.history.at(-1)!;
    if (event.type === 'hint') return { ...current, hinted: true, hint: solve(stage, now)?.[0] ?? null };
    if (isWon(stage, now)) return current;
    return { ...current, history: [...current.history, move(stage, now, event.group)], hint: null };
  }, { history: [[...stage.start]], hinted: false, hint: null });
  const state = game.history.at(-1)!, sums = totals(stage, state), won = isWon(stage, state), moves = game.history.length - 1;
  const [muted, setMutedState] = useState(isMuted), [rules, setRules] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null), clearHeading = useRef<HTMLHeadingElement>(null), recorded = useRef(false);
  const callback = useRef(onCleared); callback.current = onCleared;
  const stars = starsFor(moves, stage.par, game.hinted);
  const chapter = Math.floor((stage.number - 1) / 10);
  const activeCandy = useRef<number | null>(null);
  const buttons = useRef(new Map<number, HTMLButtonElement>());
  useLayoutEffect(() => { heading.current?.focus({ preventScroll: true }); window.scrollTo(0, 0); }, []);
  useLayoutEffect(() => {
    if (activeCandy.current !== null && !won) buttons.current.get(activeCandy.current)?.focus({ preventScroll: true });
  }, [state, won]);
  useEffect(() => {
    if (!won) { recorded.current = false; return; }
    if (!recorded.current) { recorded.current = true; callback.current(stage.id, stars); play('arrive'); }
    clearHeading.current?.focus({ preventScroll: true });
  }, [won, stage.id, stars]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'z' || event.shiftKey) return;
      if ((event.target as HTMLElement)?.matches('input,textarea,select,[contenteditable=true]')) return;
      event.preventDefault(); activeCandy.current = null; dispatch({ type: 'undo' }); play('erase');
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  const tool = (event: Event) => { activeCandy.current = null; dispatch(event); play(event.type === 'hint' ? 'pop' : 'erase'); };
  const linked = (group: number) => stage.candies.filter(c => c.group === group).length > 1;
  const pairName = (group: number) => group === 0 ? '○' : '◇';
  return <main className="balance-play">
    <header className="balance-header"><button onClick={onBack}>← 스테이지 고르기</button><span>별사탕 저울</span><button aria-label={muted ? '소리 켜기' : '소리 끄기'} aria-pressed={muted} onClick={() => { setMuted(!muted); setMutedState(!muted); }}>{muted ? '♪ 켜기' : '♪ 끄기'}</button></header>
    <p className="balance-eyebrow">{CHAPTER_TITLES[chapter]} · {stage.number}/30</p>
    <div className="balance-heading"><h1 tabIndex={-1} ref={heading}>{stage.label.replace('STAGE ', '')} {stage.title}</h1>{bestStars > 0 && <span>최고 ★{bestStars}</span>}</div>
    <p className="balance-discovery">{stage.discovery}</p>
    <div className={`balance-scales${sums.length > 1 ? ' balance-double' : ''}`}>
      {sums.map(([left, right], scale) => {
        const delta = Math.sign(right - left) * Math.min(12, 5 + Math.abs(right - left));
        return <section className={`balance-scale${left === right ? ' balanced' : ''}`} key={scale} aria-label={`${scale + 1}번 저울`}>
          <div className="balance-scale-caption"><b>{sums.length > 1 ? `${scale === 0 ? '☀' : '☾'} ${scale + 1}번 저울` : '별빛을 나누어요'}</b><span>{left === right ? '✓ 딱 맞아요!' : left > right ? '← 왼쪽이 무거워요' : '오른쪽이 무거워요 →'}</span></div>
          <ScaleArt delta={delta} />
          <div className="balance-plates">
            {([0, 1] as const).map(side => <div className="balance-pan" data-side={side} key={side} style={{ transform: `translateY(${side === 0 ? -delta : delta}px)` }}>
              <p className="balance-total"><span>{side === 0 ? '왼쪽' : '오른쪽'}</span><strong data-testid={`total-${scale}-${side}`}>{sums[scale][side]}</strong></p>
              <div className="balance-candies">
                {stage.fixed[scale][side] > 0 && <div className="balance-fixed" aria-label={`움직이지 않는 고정 추 ${stage.fixed[scale][side]}`}><svg viewBox="0 0 56 46" aria-hidden="true"><path d="M19 13V9a9 9 0 0 1 18 0v4M14 13h28l5 29H9Z" fill="#f0d795" stroke="#79623c" strokeWidth="2" /><text x="28" y="34" textAnchor="middle" fontSize="19" fontWeight="800" fill="#51452c">{stage.fixed[scale][side]}</text></svg><small>고정</small></div>}
                {stage.candies.map((candy, i) => candy.scale === scale && state[i] === side && <button
                  key={i} ref={node => { if (node) buttons.current.set(i, node); else buttons.current.delete(i); }}
                  className={`balance-candy${game.hint === candy.group ? ' balance-hint' : ''}${linked(candy.group) ? ' balance-paired' : ''}`}
                  data-candy={i} data-group={candy.group}
                  aria-label={`${i + 1}번 사탕, 무게 ${candy.weight}${linked(candy.group) ? `, ${pairName(candy.group)} 짝꿍도 함께` : ''}, ${side === 0 ? '오른쪽' : '왼쪽'}으로 옮기기`}
                  disabled={won} onClick={() => { activeCandy.current = i; dispatch({ type: 'move', group: candy.group }); play('swish'); }}>
                  <CandyArt weight={candy.weight} />{linked(candy.group) && <span className={`balance-pair pair-${candy.group}`}>{pairName(candy.group)}</span>}
                </button>)}
              </div>
              {!stage.candies.some((c, i) => c.scale === scale && state[i] === side) && stage.fixed[scale][side] === 0 && <span className="balance-empty">빈 접시</span>}
            </div>)}
          </div>
        </section>;
      })}
    </div>
    <div className="balance-status" role="status" aria-live="polite">{won ? '✦ 반듯반듯! 별빛이 모였어요.' : game.hint !== null ? `${linked(game.hint) ? pairName(game.hint) + ' 짝꿍 중 ' : ''}빛나는 테두리의 사탕을 하나 눌러 보세요.` : stage.number === 1 && moves === 0 ? '무게 2 사탕을 톡! 눌러 볼까요?' : `${moves}번 눌렀어요 · 언제든 되돌릴 수 있어요.`}</div>
    <div className="balance-tools" aria-label="퍼즐 도움 도구"><button disabled={moves === 0} onClick={() => tool({ type: 'undo' })}>↶ 되돌리기</button><button onClick={() => tool({ type: 'reset' })}>↻ 처음부터</button><button disabled={won} onClick={() => tool({ type: 'hint' })}>✧ 힌트</button></div>
    <p className="balance-star-guide">★★★ {stage.par}번 · ★★ {stage.par + TWO_STAR_SLACK}번 이하{game.hinted ? ' · 힌트 사용: 최대 ★★' : ''}</p>
    <button className="balance-rule-toggle" aria-expanded={rules} onClick={() => setRules(!rules)}>{rules ? '규칙 접기 −' : '규칙 보기 +'}</button>
    {rules && <div className="balance-rules"><p>사탕을 누르면 반대 접시로 옮겨져요. 사탕 속 숫자와 점은 무게예요. 모양이 달라도 무게를 모으면 같아져요.</p><p>두 접시의 합이 같으면 성공! 고정 추도 합에 들어가요. ○·◇ 짝꿍은 함께 옮겨지고, 두 저울을 모두 맞춰요.</p><p>누름 수는 되돌리면 함께 줄어요. 시간·실패 제한은 없어요. 힌트는 최대 별 두 개, 처음부터 시작하면 힌트 기록도 지워져요.</p></div>}
    {won && <section className="balance-clear" aria-label="스테이지 완료"><StarRow count={stars} className="result-stars" /><h2 tabIndex={-1} ref={clearHeading}>{stage.number === 30 ? '별 축제가 열렸어요!' : '딱 맞는 별사탕 한 쌍!'}</h2><p>{moves}번 눌러 완성했어요.</p><div>{hasNext && <button onClick={onNext}>다음 스테이지 →</button>}<button onClick={onBack}>스테이지 고르기</button></div></section>}
  </main>;
}
