import { BoardFirst, BoardMap, showBoard } from '../ui/BoardFirst';
import { StarRow } from '../ui/StageSelect';
import { StageCompletion } from '../ui/StageCompletion';
import { useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, type CSSProperties } from 'react';
import { COLOR_NAMES, COLORS, SYMBOLS, Reef, count, type CoralStage, type CoralState } from './model';
import { CORAL_CHAPTERS } from './stages';
import { CoralEmblem, Pigment } from './art';
import { starsFor, TWO_STAR_SLACK } from '../engine/stars';
import { isMuted, play, setMuted } from '../ui/sound';
import type { GameProps } from '../worlds';
import './coral.css';

interface Game { history: CoralState[]; hinted: boolean; hint: number | null; revision: number; note: string; waveFrom: number | null }
type Event = { type: 'move'; color: number } | { type: 'undo' } | { type: 'reset' } | { type: 'hint-request' } | { type: 'hint-result'; color: number | null; revision: number };

export function CoralScreen({ stage, hasNext, bestStars, onBack, onNext, onCleared, clearNote }: GameProps<CoralStage>) {
  const reef = useMemo(() => new Reef(stage), [stage]);
  const [game, dispatch] = useReducer((g: Game, e: Event): Game => {
    if (e.type === 'hint-request') return { ...g, hinted: true, hint: null, note: '다음 물결을 찾고 있어요. 계속 골라도 괜찮아요.' };
    if (e.type === 'hint-result') return e.revision !== g.revision ? g : { ...g, hint: e.color, note: e.color === null ? '조금 쉬었다 다시 힌트를 눌러 주세요. 계속 물들여도 괜찮아요.' : `${SYMBOLS[e.color]} ${COLOR_NAMES[e.color]}부터 골라 보세요. 지금 자리에서 가장 짧게 이을 수 있어요.` };
    if (e.type === 'reset') return { history: [reef.initial()], hinted: false, hint: null, revision: g.revision + 1, waveFrom: null, note: '다시 작은 물결부터! 다른 순서도 골라 보세요.' };
    if (e.type === 'undo') return g.history.length < 2 ? g : { ...g, history: g.history.slice(0, -1), hint: null, revision: g.revision + 1, waveFrom: null, note: '한 물결 되돌렸어요.' };
    const state = g.history.at(-1)!, next = reef.move(state, e.color);
    if (!next) return g;
    const gain = count(next.mask) - count(state.mask);
    return { ...g, history: [...g.history, next], hint: null, revision: g.revision + 1, waveFrom: state.mask, note: gain >= 4 ? `${gain}칸이 차례차례! 큰 물결이 이어졌어요!` : gain ? `${gain}칸의 새 친구를 만났어요.` : '색이 바뀌었어요. +숫자가 있는 색은 새 친구를 만나요.' };
  }, { history: [reef.initial()], hinted: false, hint: null, revision: 0, note: '', waveFrom: null });
  const state = game.history.at(-1)!, moves = game.history.length - 1, won = reef.won(state);
  const [over, setOver] = useState<number | null>(null), [help, setHelp] = useState(false), [muted, setMute] = useState(isMuted);
  const [busy, setBusy] = useState(false);
  const worker = useRef<Worker | null>(null), timeout = useRef<ReturnType<typeof setTimeout>>();
  const hintRequest = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const recorded = useRef(false), completion = useRef(onCleared);
  completion.current = onCleared;
  const chapter = CORAL_CHAPTERS[Math.floor((stage.number - 1) / 10)];
  const waves = game.waveFrom === null ? new Map<number, number>() : reef.waves(game.waveFrom, state.mask);
  const shownColor = game.hint ?? over;
  const preview = shownColor === null || won ? 0 : reef.expand(state.mask, shownColor) & ~state.mask;
  const stopHint = () => { hintRequest.current++; worker.current?.terminate(); worker.current = null; clearTimeout(timeout.current); };
  useEffect(() => { stopHint(); setBusy(false); return stopHint; }, [game.revision]);
  useLayoutEffect(() => { heading.current?.focus({ preventScroll: true }); window.scrollTo(0, 0); }, []);
  useEffect(() => {
    if (!won) { recorded.current = false; return; }
    if (!recorded.current) {
      recorded.current = true;
      completion.current(stage.id, starsFor(moves, stage.par, game.hinted));
      play('arrive');
    }
  }, [won, moves, stage.id, stage.par, game.hinted]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.matches('input,textarea,select,[contenteditable=true]')) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); dispatch({ type: 'undo' }); }
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, []);
  const requestHint = () => {
    dispatch({ type: 'hint-request' }); setBusy(true); stopHint();
    const revision = game.revision, request = hintRequest.current;
    const done = (color: number | null) => { if (request !== hintRequest.current) return; stopHint(); setBusy(false); dispatch({ type: 'hint-result', color, revision }); };
    try {
      worker.current = new Worker(new URL('./hint.worker.ts', import.meta.url), { type: 'module' });
      worker.current.onmessage = (e: MessageEvent<{ color: number | null }>) => done(e.data.color);
      worker.current.onerror = () => done(null);
      timeout.current = setTimeout(() => done(null), 8000);
      worker.current.postMessage({ stage, state });
    } catch { done(null); }
  };
  const choose = (color: number) => { if (reef.move(state, color)) play('splash'); dispatch({ type: 'move', color }); };
  return <main className="coral-play">
    <header className="coral-top"><button onClick={onBack} aria-label="스테이지 고르기">←</button><span><CoralEmblem />무지개 산호초</span><button aria-label={muted ? '소리 켜기' : '소리 끄기'} aria-pressed={muted} onClick={() => { setMuted(!muted); setMute(!muted); }}>{muted ? '♪ 꺼짐' : '♪ 켜짐'}</button></header>
    <div className="coral-heading"><p>{chapter.number}장 · {chapter.title} <span>{stage.number} / 30</span></p><h1 tabIndex={-1} ref={heading}>{stage.title}</h1>{bestStars > 0 && <span className="coral-best">최고 <StarRow count={bestStars} /></span>}</div>
    <div className="coral-goal"><p>{chapter.number === 1 ? '깃발에서 같은 색 이웃을 쭉 이어요.' : chapter.number === 2 ? '가운데 깃발에서 사방으로 이어요.' : '바위는 두고, 산호를 모두 이어요.'}</p><button onClick={() => setHelp(!help)} aria-expanded={help}>규칙 {help ? '−' : '+'}</button></div>
    {help && <div className="coral-rules"><p>색 버튼을 누르면 깃발과 연결된 산호가 모두 그 색으로 바뀌고, 상하좌우의 같은 색을 끝까지 흡수해요. 대각선과 바위는 건너지 않아요.</p><p>+숫자는 이번에 늘어날 칸 수예요. 색을 가리키거나 키보드로 고르면 그 칸이 반짝여요. 큰 무리 뒤에 만날 이웃도 살펴봐요.</p><p>몇 번이 걸려도 완성! ★★★는 {stage.par}번 이하, ★★는 {stage.par + TWO_STAR_SLACK}번 이하예요. 힌트를 쓰면 최대 ★★. 되돌리기는 자유예요.</p></div>}
    <div className="coral-score"><div><strong data-testid="coral-moves">{moves}번</strong> 물들였어요</div><div>★★★ {stage.par}번 이하<br /><span>★★ {stage.par + TWO_STAR_SLACK}번 이하</span></div></div>
    <BoardFirst status={<>{moves}번 물들였어요</>}>
    <BoardMap>
    <section className="coral-ocean" aria-label="산호 정원">
      <div className="coral-board-label"><span>깃발과 연결된 산호</span><strong>{count(state.mask)} / {count(reef.all)}칸</strong></div>
      <div className="coral-grid" role="group" aria-label={`산호초, ${count(state.mask)}칸 연결`} style={{ '--coral-cols': stage.cols } as CSSProperties}>
        {stage.start.map((original, cell) => {
          const owned = !!(state.mask & (1 << cell)), color = owned ? state.color : original, wave = waves.get(cell);
          return <div key={`${game.revision}-${cell}`} className={`coral-cell${original < 0 ? ' is-rock' : ''}${owned ? ' is-owned' : ''}${preview & (1 << cell) ? ' is-preview' : ''}${wave !== undefined ? ' is-wave' : ''}`} style={{ '--pigment': COLORS[color], '--wave-delay': `${Math.min(wave ?? 0, 6) * 35}ms` } as CSSProperties} role="img" aria-label={`${Math.floor(cell / stage.cols) + 1}행 ${cell % stage.cols + 1}열, ${original < 0 ? '바위' : `${COLOR_NAMES[color]} ${SYMBOLS[color]}${owned ? ', 연결됨' : ''}${cell === stage.origin ? ', 시작 깃발' : ''}`}`}>
            {original < 0 ? <svg viewBox="0 0 40 40" aria-hidden="true"><path d="m6 28 4-17 16-5 9 16-4 12H12Z" fill="#8a9c9b" /><path d="m10 11 10 11 15 0M20 22l-8 12" stroke="#c9d5cc" fill="none" strokeWidth="2" /></svg> : <Pigment color={color} />}
            {cell === stage.origin && <span className="coral-origin" aria-label="시작 깃발">⚑</span>}
            {wave !== undefined && waves.size >= 4 && <i className="coral-bubble" aria-hidden="true" />}
          </div>;
        })}
      </div>
      <div className="coral-seafloor" aria-hidden="true"><svg viewBox="0 0 320 23"><path d="M0 20Q70 4 145 19T320 16V23H0Z" fill="#ddcaa0" /><path d="M23 21V7m0 8-7-5m7 1 7-8M286 21V5m0 10 8-7" stroke="#69a594" strokeWidth="3" fill="none" strokeLinecap="round" /><circle cx="250" cy="8" r="3" fill="none" stroke="#7ebebd" /></svg></div>
    </section>
    </BoardMap>
    <p className="coral-palette-label">다음 색 고르기 <span>+숫자만큼 커져요</span></p>
    <div className="coral-palette" role="group" aria-label="퍼뜨릴 색 고르기" style={{ gridTemplateColumns: `repeat(${reef.palette.length}, minmax(0, 1fr))` }}>
      {reef.palette.map(color => {
        const gain = count(reef.expand(state.mask, color)) - count(state.mask), current = color === state.color;
        return <button key={color} className={`coral-color${game.hint === color ? ' is-hint' : ''}`} style={{ '--pigment': COLORS[color] } as CSSProperties} disabled={current || won} aria-label={`${COLOR_NAMES[color]} ${SYMBOLS[color]}, ${current ? '현재 색' : `고르면 ${gain}칸 커져요`}`} data-color={color} onClick={() => choose(color)} onPointerEnter={() => setOver(color)} onPointerLeave={() => setOver(null)} onFocus={() => setOver(color)} onBlur={() => setOver(null)}>
          <span className="coral-swatch"><Pigment color={color} /></span><span>{COLOR_NAMES[color]}</span><strong>{current ? '지금' : `+${gain}칸`}</strong>
        </button>;
      })}
    </div>
    </BoardFirst>
    <div className="coral-feedback" role="status" aria-live="polite">{won ? '모든 산호가 한 색! 무지개 정원이 반짝여요.' : game.note || '어떤 색이 더 멀리 이어질까요? +숫자를 살펴봐요.'}{game.hinted && <small>힌트 사용 · 이번 완성은 최대 ★★</small>}</div>
    <div className="coral-tools" aria-label="퍼즐 도움 도구"><button disabled={!moves} onClick={() => { play('erase'); dispatch({ type: 'undo' }); }}>↶ 되돌리기</button><button onClick={() => { dispatch({ type: 'reset' }); showBoard(); }}>↻ 처음부터</button><button disabled={won || busy} aria-busy={busy} onClick={requestHint}>{busy ? '찾는 중…' : '한 걸음 힌트'}</button></div>
    {won && <StageCompletion className="coral-clear" stars={starsFor(moves, stage.par, game.hinted)} hasNext={hasNext} onNext={onNext} onBack={onBack} nextClassName="coral-primary" note={clearNote} />}
  </main>;
}
