import { StageCompletion } from '../ui/StageCompletion';
import { useEffect, useLayoutEffect, useReducer, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import type { GameProps } from '../worlds';
import { starsFor } from '../engine/stars';
import { isMuted, play, setMuted } from '../ui/sound';
import { COLORS, MARKS, Picture, Tiles } from './Art';
import { nextHint, reduceGame, startGame, type Hint } from './game';
import { canPlace, isComplete, key, occupied, shape, type Cell, type PiecesStage, type Pose } from './model';
import { PIECES_CHAPTERS } from './stages';
import './pieces.css';
interface Drag { index: number; anchor: Cell; turn: number; flip: boolean; fromBoard: boolean; startX: number; startY: number; moved: boolean }
const origin = { turn: 0, flip: false };
export function PiecesScreen({ stage, bestStars, hasNext, clearNote, onBack, onNext, onCleared }: GameProps<PiecesStage>) {
  const [game, dispatch] = useReducer((g: ReturnType<typeof startGame>, a: Parameters<typeof reduceGame>[2]) => reduceGame(stage, g, a), stage, startGame);
  const layout = game.history.at(-1)!, moves = game.history.length - 1, won = isComplete(stage, layout);
  const [selected, setSelected] = useState<number | null>(null);
  const [orient, setOrient] = useState(stage.pieces.map(() => ({ ...origin })));
  const [hover, setHover] = useState<Pose | null>(null);
  const [hint, setHint] = useState<Hint | null>(null);
  const [note, setNote] = useState('');
  const [help, setHelp] = useState(false);
  const [muted, setMutedState] = useState(isMuted);
  const [floating, setFloating] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<Drag | null>(null), board = useRef<SVGSVGElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const reported = useRef(false), clear = useRef(onCleared); clear.current = onCleared;
  useLayoutEffect(() => { title.current?.focus({ preventScroll: true }); window.scrollTo(0, 0); }, []);
  useEffect(() => {
    if (won && !reported.current) { reported.current = true; clear.current(stage.id, starsFor(moves, stage.par, game.hinted)); play('arrive'); }
    if (!won) reported.current = false;
  }, [won, moves, game.hinted, stage]);
  const undo = () => { drag.current = null; setFloating(null); setHover(null); setHint(null); setSelected(null); dispatch({ type: 'undo' }); setNote('한 번 되돌렸어요. 다른 자리에 놓아 봐요.'); play('erase'); };
  useEffect(() => {
    const keydown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if (e.key === 'Escape') { drag.current = null; setFloating(null); setHover(null); setSelected(null); }
    };
    window.addEventListener('keydown', keydown); return () => window.removeEventListener('keydown', keydown);
  }, []);
  const cellAt = (x: number, y: number): Cell | null => {
    const box = board.current?.getBoundingClientRect();
    if (!box || x < box.left || y < box.top || x >= box.right || y >= box.bottom) return null;
    return [Math.floor((x - box.left) / box.width * stage.cols), Math.floor((y - box.top) / box.height * stage.rows)];
  };
  const pieceAt = (cell: Cell) => layout.findIndex((p, i) => p && occupied(stage.pieces[i], p).some(c => key(c) === key(cell)));
  const select = (index: number) => {
    setSelected(index); setHint(null); setHover(null); setNote(`${MARKS[index]} 조각을 골랐어요. 돌린 뒤 틀에 놓아도 좋아요.`);
    if (layout[index] && selected !== index) setOrient(o => o.map((v, i) => i === index ? { turn: layout[index]!.turn, flip: layout[index]!.flip } : v));
  };
  const put = (index: number, pose: Pose) => {
    if (!canPlace(stage, layout, index, pose)) { setNote('틀 밖이나 다른 조각 위에는 놓을 수 없어요. 다시 놓아 봐요.'); play('deny'); return; }
    dispatch({ type: 'place', index, pose }); setHover(null); setHint(null); setSelected(null); setNote('쏙! 놓은 조각도 다시 집을 수 있어요.'); play('place');
  };
  const begin = (e: ReactPointerEvent, index: number, cell?: Cell) => {
    if (e.button !== 0 || drag.current) return;
    const p = layout[index], orientation = selected === index ? orient[index] : p ?? orient[index];
    const unchanged = p && p.turn === orientation.turn && p.flip === orientation.flip;
    const anchor: Cell = cell && p && unchanged ? [cell[0] - p.x, cell[1] - p.y] : shape(stage.pieces[index], orientation.turn, orientation.flip)[0];
    select(index);
    drag.current = { index, anchor, turn: orientation.turn, flip: orientation.flip, fromBoard: !!cell, startX: e.clientX, startY: e.clientY, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
    play('pickup');
  };
  const onBoardDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    const cell = cellAt(e.clientX, e.clientY); if (!cell || drag.current || e.button !== 0) return;
    const index = pieceAt(cell);
    // A selected piece can replace its old placement by tapping an empty square.
    if (index >= 0) { begin(e, index, cell); return; }
    if (selected === null) { setNote('아래 바구니에서 조각을 먼저 골라요.'); return; }
    const o = orient[selected], anchor = shape(stage.pieces[selected], o.turn, o.flip)[0];
    drag.current = { index: selected, anchor, ...o, fromBoard: false, startX: e.clientX, startY: e.clientY, moved: false };
    setHover({ x: cell[0] - anchor[0], y: cell[1] - anchor[1], ...o });
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (d) {
      if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 5) d.moved = true;
      const cell = cellAt(e.clientX, e.clientY);
      setHover(cell ? { x: cell[0] - d.anchor[0], y: cell[1] - d.anchor[1], turn: d.turn, flip: d.flip } : null);
      setFloating(d.moved && !cell ? { x: e.clientX, y: e.clientY } : null);
    } else if (selected !== null && e.pointerType === 'mouse') {
      const cell = cellAt(e.clientX, e.clientY), o = orient[selected], anchor = shape(stage.pieces[selected], o.turn, o.flip)[0];
      setHover(cell ? { x: cell[0] - anchor[0], y: cell[1] - anchor[1], ...o } : null);
    }
  };
  const end = (e: ReactPointerEvent) => {
    const d = drag.current; if (!d) return;
    drag.current = null; setFloating(null); setHover(null);
    const cell = cellAt(e.clientX, e.clientY);
    if (cell && (!d.fromBoard || d.moved)) put(d.index, { x: cell[0] - d.anchor[0], y: cell[1] - d.anchor[1], turn: d.turn, flip: d.flip });
    else if (d.moved) { setNote('놓을 자리가 아니어서 원래 자리에 두었어요.'); play('deny'); }
  };
  const transform = (flip = false) => {
    if (selected === null) return;
    const current = orient[selected], next = flip ? { ...current, flip: !current.flip } : { ...current, turn: (current.turn + 1) % 4 };
    setOrient(o => o.map((v, i) => i === selected ? next : v)); setHover(null); setHint(null); setNote(flip ? '뒤집었어요! 반대쪽 모양을 찾아요.' : '빙글! 조각의 표시 칸을 놓을 자리에 톡 눌러요.'); play('rotate');
  };
  const remove = (index: number) => { dispatch({ type: 'remove', index }); setHint(null); setHover(null); setSelected(null); setNote('바구니로 가져왔어요. 언제든 다시 놓아도 돼요.'); play('erase'); };
  const requestHint = () => {
    dispatch({ type: 'hint' }); const h = nextHint(stage, layout); setHint(h);
    if (!h) return;
    setSelected(h.index);
    if (!h.remove) { setOrient(o => o.map((v, i) => i === h.index ? { turn: h.pose.turn, flip: h.pose.flip } : v)); setNote(`${MARKS[h.index]} 조각을 점선 자리에 놓아 봐요. 표시 칸을 눌러도 돼요.`); }
    else setNote(`${MARKS[h.index]} 조각을 잠깐 꺼내면 다른 모양을 찾을 수 있어요.`);
  };
  const guided = stage.number === 1 && !game.hinted && !won ? layout.findIndex(p => !p) : -1;
  const ghost = hover && selected !== null ? { index: selected, pose: hover } : hint && !hint.remove ? hint : guided >= 0 ? { index: guided, pose: stage.solution[guided] } : null;
  const validGhost = ghost && canPlace(stage, layout, ghost.index, ghost.pose);
  const chapter = PIECES_CHAPTERS[Math.floor((stage.number - 1) / 10)];
  return <main className="pieces" style={{ '--cover-cols': stage.cols } as CSSProperties} onPointerMove={move} onPointerUp={end} onPointerCancel={() => { drag.current = null; setFloating(null); setHover(null); setNote('원래 자리에 두었어요. 다시 집어도 돼요.'); }}>
    <header className="pieces-top"><button onClick={onBack} aria-label="스테이지 고르기">← 목록</button><span>조각 맞추기</span><button aria-label={muted ? '소리 켜기' : '소리 끄기'} onClick={() => { setMuted(!muted); setMutedState(!muted); }}>{muted ? '소리 ×' : '소리 ♪'}</button></header>
    <div className="pieces-heading"><p>{chapter.title} · {stage.label.replace('STAGE ', '')}</p><h1 ref={title} tabIndex={-1}>{stage.title}</h1>{bestStars > 0 && <span className="pieces-best">최고 ★{bestStars}</span>}</div>
    <div className="pieces-goal"><span>{stage.number === 1 ? '● 조각을 점선에 쏙! 두 조각을 모아 봐요.' : stage.number === 11 ? '창문은 비워 둬요. 오목한 자리에 쏙!' : stage.number === 21 ? '돌려도 안 맞나요? 뒤집기를 눌러 봐요!' : '조각을 돌려서 틀을 빈틈없이 채워요.'}</span><button onClick={() => setHelp(!help)} aria-expanded={help}>규칙 {help ? '−' : '+'}</button></div>
    {help && <div className="pieces-rules"><p>조각을 끌거나, 조각을 고른 뒤 틀을 눌러요. 바구니에서 동그라미 친 표시 칸이 누른 칸에 놓여요. 회전은 조각을 고르고 「돌리기」를 눌러요.{stage.allowFlip ? ' 이제 「뒤집기」로 반대쪽 모양도 만들 수 있어요.' : ' 뒤집기는 3장에서 만나요.'}</p><p>틀 밖이나 겹친 자리는 놓이지 않아요. 놓은 조각도 언제든 다시 집거나 바구니로 가져올 수 있어요.</p><p>★★★ {stage.par}번 · ★★ {stage.par + 2}번 이하 · 그 밖에는 ★. 놓기·옮기기·꺼내기는 한 번이에요. 돌리기는 세지 않아요. 힌트를 쓰면 최대 ★★예요.</p></div>}
    <div className={`pieces-canvas${won ? ' is-complete' : ''}`}>
      <div className="pieces-board-caption"><span>{won ? '그림이 나타났어요!' : '어떤 그림이 숨어 있을까?'}</span><b>{layout.filter(Boolean).length} / {stage.pieces.length} 조각</b></div>
      <svg ref={board} className="pieces-board" style={{ maxWidth: `${Math.min(360, 300 * stage.cols / stage.rows)}px` }} viewBox={`0 0 ${stage.cols * 40} ${stage.rows * 40}`} aria-label="조각을 놓는 틀" onPointerDown={onBoardDown}>
        {stage.target.map(([x, y]) => <rect key={`${x},${y}`} x={x * 40 + 1} y={y * 40 + 1} width="38" height="38" rx="4" fill="#d5e3dc" stroke="#91aaa2" />)}
        {layout.map((p, i) => p && <g key={i} className={selected === i ? 'pieces-picked' : ''}><Tiles cells={occupied(stage.pieces[i], p)} index={i} /></g>)}
        {ghost && !won && <g className={`pieces-ghost${validGhost ? '' : ' is-invalid'}`} data-valid={!!validGhost}><Tiles cells={occupied(stage.pieces[ghost.index], ghost.pose)} index={ghost.index} ghost />{!validGhost && <text x={(ghost.pose.x + 1) * 40} y={(ghost.pose.y + 1) * 40} fontSize="26" fill="#8c2626">×</text>}</g>}
        {won && <Picture stage={stage} />}
        {stage.target.map(([x, y]) => <rect key={`hit-${x},${y}`} data-cell={`${x},${y}`} role="button" aria-label={`${y + 1}행 ${x + 1}열`} tabIndex={0} x={x * 40} y={y * 40} width="40" height="40" fill="transparent" className="pieces-cell" onKeyDown={e => {
          if (e.key !== 'Enter' && e.key !== ' ') return; e.preventDefault(); const index = pieceAt([x, y]);
          if (index >= 0) select(index); else if (selected !== null) { const o = orient[selected], a = shape(stage.pieces[selected], o.turn, o.flip)[0]; put(selected, { x: x - a[0], y: y - a[1], ...o }); }
        }} />)}
      </svg>
    </div>
    <div className="pieces-tray" aria-label="조각 바구니">{stage.pieces.map((piece, i) => {
      const o = orient[i], cells = shape(piece, o.turn, o.flip), w = Math.max(...cells.map(c => c[0])) + 1, h = Math.max(...cells.map(c => c[1])) + 1;
      return <button key={i} aria-label={`${MARKS[i]} 조각 ${i + 1}${layout[i] ? ' 놓여 있음' : ''}`} aria-pressed={selected === i} className={`pieces-piece${layout[i] ? ' is-placed' : ''}`} style={{ borderColor: selected === i ? '#285f58' : COLORS[i] }} onPointerDown={e => begin(e, i)} onClick={e => { if (e.detail === 0) select(i); }}><svg viewBox={`-2 -2 ${w * 20 + 4} ${h * 20 + 4}`} aria-hidden="true"><Tiles cells={cells} index={i} unit={20} anchor /></svg><span>{MARKS[i]} {layout[i] ? '놓음' : `${piece.cells.length}칸`}</span></button>;
    })}</div>
    <div className="pieces-transform"><button disabled={selected === null} onClick={() => transform()}>↻ 돌리기</button>{stage.allowFlip && <button disabled={selected === null} onClick={() => transform(true)}>↔ 뒤집기</button>}<button disabled={selected === null || !layout[selected]} onClick={() => selected !== null && remove(selected)}>↓ 바구니로</button></div>
    <div className="pieces-status" role="status" aria-live="polite">{note || '놓은 조각은 언제든 다시 집을 수 있어요.'}</div>
    {hint && <button className="pieces-hint-apply" onClick={() => { if (hint.remove) remove(hint.index); else put(hint.index, hint.pose); }}>{hint.remove ? '이 조각 꺼내기' : '힌트대로 놓기'}</button>}
    <div className="pieces-count"><span>놓기·꺼내기 {moves}번 · ★★★ {stage.par}번</span><span>{game.hinted ? '힌트 사용 · 최대 ★★' : '천천히 생각해도 좋아요'}</span></div>
    <div className="pieces-tools"><button onClick={undo} disabled={moves === 0}>↶ 되돌리기</button><button onClick={() => { drag.current = null; setFloating(null); dispatch({ type: 'reset' }); setOrient(stage.pieces.map(() => ({ ...origin }))); setHint(null); setSelected(null); setHover(null); setNote('바구니에 모두 모았어요. 새로 시작해요.'); }}>처음부터</button><button onClick={requestHint} disabled={won}>한 조각 힌트</button></div>
    {won && <StageCompletion className="pieces-clear" stars={starsFor(moves, stage.par, game.hinted)} hasNext={hasNext} onNext={onNext} onBack={onBack} note={clearNote} />}
    {floating && selected !== null && <svg className="pieces-floating" style={{ left: floating.x + 12, top: floating.y - 65 }} width="100" height="100" viewBox="-2 -2 124 124" aria-hidden="true"><Tiles cells={shape(stage.pieces[selected], drag.current?.turn ?? orient[selected].turn, drag.current?.flip ?? orient[selected].flip)} index={selected} unit={24} /></svg>}
  </main>;
}
