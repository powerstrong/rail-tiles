import { StageCompletion } from '../ui/StageCompletion';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import type { GameProps } from '../worlds';
import { loadProgress } from '../storage';
import { starsFor } from '../engine/stars';
import { isMuted, play, setMuted } from '../ui/sound';
import { Artwork, threadColor } from './Artwork';
import { CLOUD_CHAPTERS, CLOUD_STAGES } from './stages';
import { isComplete, lines, lineName, logicalHint, type CloudStage, type Deduction, type Mark } from './model';
import './cloud.css';

export function CloudScreen({ stage, onBack, onNext, onCleared, hasNext, bestStars }: GameProps<CloudStage>) {
  const blank = () => Array<Mark>(stage.rows * stage.cols).fill(0);
  const [history, setHistory] = useState<Mark[][]>(() => [blank()]);
  const [tool, setTool] = useState<Mark>(1);
  const [hinted, setHinted] = useState(false);
  const [hint, setHint] = useState<Deduction | null>(null);
  const [note, setNote] = useState('');
  const [large, setLarge] = useState(false);
  const [focus, setFocus] = useState<{ axis: 'row' | 'col'; index: number } | null>(null);
  const [gallery, setGallery] = useState(false);
  const [muted, updateMuted] = useState(isMuted);
  const heading = useRef<HTMLHeadingElement>(null);
  const recorded = useRef(false);
  const state = history[history.length - 1], moves = history.length - 1;
  const won = isComplete(stage.clues, state);
  const allLines = lines(stage.clues, state), conflict = allLines.find(l => !l.candidates.length);
  const stars = starsFor(moves, stage.par, hinted);
  const saved = loadProgress();
  const collected = CLOUD_STAGES.filter(s => saved.stars[s.id] || (s.id === stage.id && (won || bestStars > 0)));
  useLayoutEffect(() => { heading.current?.focus({ preventScroll: true }); window.scrollTo(0, 0); }, []);
  useEffect(() => {
    if (won && !recorded.current) { recorded.current = true; play('arrive'); onCleared(stage.id, stars); }
    if (!won) recorded.current = false;
  }, [won, stage.id, stars, onCleared]);
  function clearHint() { setHint(null); setNote(''); }
  function undo() { setHistory(h => h.length > 1 ? h.slice(0, -1) : h); clearHint(); }
  useEffect(() => {
    const key = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, []);
  function mark(cell: number, value = tool) {
    setHistory(h => {
      const prev = h[h.length - 1];
      const next = [...prev]; next[cell] = prev[cell] === value ? 0 : value;
      if (next[cell] === prev[cell]) return h;
      return [...h, next];
    });
    play(value === 1 ? 'place' : 'erase'); clearHint();
  }
  function askHint() {
    const deduction = logicalHint(stage.clues, state);
    setHint(deduction);
    if (deduction) { setHinted(true); setFocus(deduction.line); setNote(''); }
    else setNote(conflict ? `${lineName(conflict)}의 표시와 숫자가 맞지 않아요. 이 줄의 표시를 지우거나 되돌려 보세요.` : '지금 표시에선 한 줄만으로 확정할 칸이 없어요. 짐작해서 채우지 말고 최근 표시를 되돌려 살펴보세요.');
  }
  function navigate(e: KeyboardEvent<HTMLButtonElement>, cell: number) {
    const delta: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -stage.cols, ArrowDown: stage.cols };
    if (!(e.key in delta)) return;
    e.preventDefault();
    const next = cell + delta[e.key];
    if (next >= 0 && next < state.length && (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' || Math.floor(next / stage.cols) === Math.floor(cell / stage.cols))) {
      document.getElementById(`cloud-cell-${next}`)?.focus();
    }
  }
  return <main className="cloud-screen">
    <header className="cloud-header"><button onClick={onBack}>← 스테이지 고르기</button><span>구름 자수 공방</span><button aria-label={muted ? '소리 켜기' : '소리 끄기'} aria-pressed={muted} onClick={() => { setMuted(!muted); updateMuted(!muted); }}>{muted ? '♪ 켜기' : '♪ 끄기'}</button></header>
    <div className="cloud-heading"><p>{CLOUD_CHAPTERS[Math.floor((stage.number - 1) / 10)].title} · {stage.label.replace('STAGE ', '')} / 30</p><h1 ref={heading} tabIndex={-1}>{stage.title}</h1></div>
    <p className="cloud-lesson">{stage.lesson}</p>
    <div className="cloud-toolbar" role="group" aria-label="바느질 도구">
      {([1, 2, 0] as const).map(v => <button key={v} aria-pressed={tool === v} onClick={() => setTool(v)}>{['· 지우개', '✚ 수놓기', '× 빈칸'][v]}</button>)}
    </div>
    <p className="cloud-caption">· 아직 모름　✚ 수놓음　× 비움{stage.rows > 1 ? ' · 숫자를 누르면 줄 강조' : ''}</p>
    <div className="cloud-board-options"><button aria-pressed={large} onClick={() => setLarge(v => !v)}>{large ? '− 한눈에 보기' : '+ 칸 크게 보기'}</button><span>{focus ? `${lineName(focus)} 강조 중` : '가로 ↔ · 세로 ↕'}</span></div>
    {large && <p className="cloud-caption">확대한 판은 옆으로 밀어 보세요. 줄의 숫자는 따라와요.</p>}
    <div className="cloud-scroll" role="region" aria-label="자수판" tabIndex={0}>
      <div className={`cloud-board${won ? ' is-finished' : ''}`} role="group" aria-label="숫자 단서와 자수 칸" style={{ '--cloud-cols': stage.cols, '--cloud-cell': large || stage.cols <= 4 ? '56px' : '44px' } as CSSProperties}>
        <span className="cloud-corner" aria-hidden="true">↕<br />↔</span>
        {stage.clues.cols.map((clue, x) => <button className={`cloud-clue cloud-col${focus?.axis === 'col' && focus.index === x ? ' selected' : ''}`} key={`col${x}`} aria-label={`${x + 1}열 단서 ${clue.join('·') || '0'}`} aria-pressed={focus?.axis === 'col' && focus.index === x} onClick={() => setFocus({ axis: 'col', index: x })}>{(clue.length ? clue : [0]).map((n, i) => <span key={i}>{n}</span>)}</button>)}
        {stage.clues.rows.map((clue, y) => <div className="cloud-board-row" key={y}>
          <button className={`cloud-clue cloud-row${focus?.axis === 'row' && focus.index === y ? ' selected' : ''}`} aria-label={`${y + 1}행 단서 ${clue.join('·') || '0'}`} aria-pressed={focus?.axis === 'row' && focus.index === y} onClick={() => setFocus({ axis: 'row', index: y })}>{clue.join('·') || '0'}</button>
          {state.slice(y * stage.cols, (y + 1) * stage.cols).map((value, x) => {
            const cell = y * stage.cols + x, active = focus?.axis === 'row' ? focus.index === y : focus?.index === x;
            return <button id={`cloud-cell-${cell}`} data-cell={cell} data-mark={value} style={won && value === 1 ? { color: threadColor(stage, cell) } : undefined} key={x} className={`cloud-cell mark-${value}${active ? ' line-active' : ''}${hint?.cell === cell ? ' cloud-hint-cell' : ''}`} aria-label={`${y + 1}행 ${x + 1}열, ${['아직 모름', '수놓음', '빈칸 ×'][value]}`} onClick={() => mark(cell)} onFocus={() => setFocus({ axis: focus?.axis ?? 'row', index: focus?.axis === 'col' ? x : y })} onKeyDown={e => navigate(e, cell)}>
              {value === 1 ? <svg viewBox="0 0 32 32" aria-hidden="true"><rect x="3" y="3" width="26" height="26" rx="5" fill="currentColor" /><path d="M9 9L23 23M23 9L9 23" stroke="#fff" strokeWidth="3" strokeLinecap="round" /></svg> : <span aria-hidden="true">{value === 2 ? '×' : '·'}</span>}
            </button>;
          })}
        </div>)}
      </div>
    </div>
    <div className="cloud-feedback" role="status" aria-live="polite">{conflict ? <><strong>{lineName(conflict)}의 숫자와 표시가 맞지 않아요.</strong> 이 줄을 고치거나 되돌려 보세요. <button onClick={undo}>직전 표시 되돌리기</button></> : note || (hint ? hint.reason : won ? '숨은 무늬가 작품이 되었어요!' : '숫자 묶음 사이에는 한 칸 이상 ×. 모든 칸을 ✚ 또는 ×로 정하면 완성이에요.')}</div>
    {hint && <section className="cloud-proof" aria-label="한 줄 힌트의 근거"><p>{lineName(hint.line)}에 놓을 수 있는 모양 {hint.line.candidates.length}가지 <span>(✚ 수놓기 · × 비움)</span></p><div className="cloud-candidates">{hint.line.candidates.map((p, i) => <div key={i} aria-label={p.map(v => v ? '수' : '빈').join(' ')}>{p.map((v, k) => <span key={k} className={hint.line.cells[k] === hint.cell ? 'target' : ''}>{v ? '✚' : '×'}</span>)}</div>)}</div><button onClick={() => mark(hint.cell, hint.value)}>이 칸을 {hint.value === 1 ? '수놓기' : '×로 표시'}</button></section>}
    <div className="cloud-tools"><button onClick={undo} disabled={!moves}>↶ 되돌리기</button><button onClick={() => { setHistory([blank()]); setHinted(false); clearHint(); }}>↻ 처음부터</button><button onClick={askHint} disabled={won}>한 줄 힌트</button></div>
    <p className="cloud-score">{moves}번 표시 · ★★★ {stage.par}번 · ★★ {stage.par + 2}번 이하{hinted ? ' · 힌트 사용: 최대 ★★' : ''}</p>
    {won && <StageCompletion className="cloud-clear" stars={stars} hasNext={hasNext} onNext={onNext} onBack={onBack} nextClassName="cloud-primary" />}
    <button className="cloud-gallery-button" aria-expanded={gallery} onClick={() => setGallery(v => !v)}>작품 모음 {collected.length} / 30 {gallery ? '접기' : '보기'}</button>
    {gallery && <section className="cloud-gallery" aria-label="작품 모음"><h2>구름 위 작은 전시회</h2><p>완성한 도안에 색실을 입혔어요. 모은 작품은 다음에도 남아요.</p>{!collected.length && <p>첫 작품을 수놓아 여기에 걸어 보세요.</p>}<div>{collected.map(s => <figure key={s.id}><Artwork stage={s} /><figcaption>{s.number}. {s.title}</figcaption></figure>)}</div></section>}
    <details className="cloud-rules"><summary>바느질 규칙 · 별 안내</summary><p>숫자는 이어진 수놓기 칸의 개수예요. 2·1은 ✚✚ × ✚처럼 두 묶음 사이를 최소 한 칸 비워요. 0은 그 줄을 모두 비워요. ×는 확실한 빈칸, ·는 아직 모르는 칸이에요.</p><p>도구를 골라 칸을 눌러요. 같은 도구로 다시 누르면 지워져요. 방향키로 칸을 옮기고 Enter 또는 Space로 표시할 수 있어요. Ctrl/⌘+Z는 되돌리기예요.</p><p>모든 가로·세로 숫자에 맞게 모든 칸을 표시하면 완성이에요. ★★★는 한 칸당 한 번, ★★는 두 번 더 표시할 때까지예요. 되돌린 표시는 횟수에서도 빠져요. 힌트는 이번 판 최대 ★★, 처음부터는 힌트 제한도 새로 시작해요. 시간과 실패 횟수 제한은 없어요.</p></details>
  </main>;
}
