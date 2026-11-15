import { useEffect, useRef, useState, type CSSProperties, type Dispatch, type PointerEvent } from 'react';
import { buttonAt, connected, endpointAt, ownerAt, THREADS, type FlowAction, type FlowPlay, type FlowStage } from './model';
import { ThreadMark } from './FlowArt';

export function FlowBoard({ stage: s, game, dispatch }: { stage: FlowStage; game: FlowPlay; dispatch: Dispatch<FlowAction> }) {
  const root = useRef<HTMLDivElement>(null);
  const pointer = useRef<number | null>(null);
  const previous = useRef<{ x: number; y: number } | null>(null);
  const lastCell = useRef(-1);
  const [focus, setFocus] = useState(s.cells[0]);
  const xy = (cell: number) => [cell % s.cols * 100 + 50, Math.floor(cell / s.cols) * 100 + 50];
  const position = (e: { clientX: number; clientY: number }) => {
    const box = root.current!.getBoundingClientRect();
    return { x: (e.clientX - box.left) / box.width * s.cols, y: (e.clientY - box.top) / box.height * s.rows };
  };
  const cellAt = (p: { x: number; y: number }) => p.x >= 0 && p.y >= 0 && p.x < s.cols && p.y < s.rows ? Math.floor(p.y) * s.cols + Math.floor(p.x) : -1;
  const start = (e: PointerEvent<HTMLDivElement>) => {
    if (pointer.current !== null || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const p = position(e), cell = cellAt(p);
    if (!s.cells.includes(cell)) return;
    e.preventDefault();
    pointer.current = e.pointerId; previous.current = p; lastCell.current = cell;
    e.currentTarget.setPointerCapture(e.pointerId);
    setFocus(cell);
    root.current?.querySelector<HTMLButtonElement>(`[data-cell="${cell}"]`)?.focus({ preventScroll: true });
    dispatch({ type: 'begin', cell });
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (pointer.current !== e.pointerId || !previous.current) return;
    // Sample the actual pointer segment so quick straight drags don't skip intermediate squares.
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [];
    for (const event of events.length ? events : [e]) {
      const to = position(event), from = previous.current;
      const steps = Math.ceil(Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y)) * 12) || 1;
      for (let i = 1; i <= steps; i++) {
        const cell = cellAt({ x: from.x + (to.x - from.x) * i / steps, y: from.y + (to.y - from.y) * i / steps });
        if (cell < 0 || cell === lastCell.current) continue;
        lastCell.current = cell; dispatch({ type: 'extend', cell });
      }
      previous.current = to;
    }
  };
  const finish = (cancel = false) => {
    if (pointer.current === null) return;
    pointer.current = null; previous.current = null;
    dispatch({ type: cancel ? 'cancel' : 'end' });
  };
  useEffect(() => {
    const cancel = () => finish(true);
    window.addEventListener('blur', cancel);
    return () => window.removeEventListener('blur', cancel);
  });
  return <div className="flow-board" ref={root} style={{ '--flow-cols': s.cols, aspectRatio: `${s.cols}/${s.rows}` } as CSSProperties}
    onPointerDown={start} onPointerMove={move} onPointerUp={() => finish()} onPointerCancel={() => finish(true)} onLostPointerCapture={() => finish(true)}>
    <svg viewBox={`0 0 ${s.cols * 100} ${s.rows * 100}`} aria-hidden="true">
      <defs><pattern id="flow-fabric" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M0 1 H10 M1 0 V10" stroke="#9b8867" strokeWidth=".6" opacity=".13" /></pattern></defs>
      {Array.from({ length: s.cols * s.rows }, (_, c) => {
        const [x,y] = xy(c), usable = s.cells.includes(c);
        return <g key={c}><rect x={x - 49} y={y - 49} width="98" height="98" rx="12" fill={usable ? (c % 2 ? '#fff5dd' : '#f8ebcf') : '#cdd6b6'} stroke={usable ? '#dfc9a3' : '#b1bd9a'} strokeWidth="2" />
          {!usable && <path d={`M${x-15} ${y-8} q15 -12 30 0 M${x-15} ${y+8} q15 12 30 0`} fill="none" stroke="#a2af8a" strokeWidth="3" />}</g>;
      })}
      <rect width="100%" height="100%" fill="url(#flow-fabric)" />
      {game.paths.map((p, color) => <g key={color} style={{ color: THREADS[color].color }} data-thread={color}>
        {p.length > 1 && <><polyline points={p.map(c => xy(c).join(',')).join(' ')} fill="none" stroke="#b49c79" strokeWidth="24" strokeLinejoin="round" strokeLinecap="round" opacity=".25" transform="translate(0 3)" /><polyline className="flow-thread" points={p.map(c => xy(c).join(',')).join(' ')} fill="none" stroke="currentColor" strokeWidth="19" strokeLinejoin="round" strokeLinecap="round" /><polyline points={p.map(c => xy(c).join(',')).join(' ')} fill="none" stroke="#fff7e7" strokeWidth="2" strokeDasharray="3 6" strokeLinecap="round" opacity=".6" /></>}
        {p.slice(1,-1).filter(c => buttonAt(s,c) < 0).map(c => <g key={c} style={{ color: '#fff9ec' }}><ThreadMark color={color} x={xy(c)[0]} y={xy(c)[1]} scale={.42} /></g>)}
        {p.length > 1 && !connected(s, game.paths, color) && <circle cx={xy(p.at(-1)!)[0]} cy={xy(p.at(-1)!)[1]} r="13" fill="currentColor" stroke="#fff8e4" strokeWidth="4" />}
      </g>)}
      {s.pairs.map((p, color) => <g key={color} style={{ color: THREADS[color].color }}>
        {p.via.map(c => <g key={c}><circle cx={xy(c)[0]} cy={xy(c)[1]} r="29" fill="#fff5dd" stroke="currentColor" strokeWidth="4" strokeDasharray="4 4" /><ThreadMark color={color} x={xy(c)[0]} y={xy(c)[1]} scale={1.25} />{game.paths[color].includes(c) && <circle cx={xy(c)[0]} cy={xy(c)[1]} r="36" fill="none" stroke="currentColor" strokeWidth="3" />}</g>)}
        {p.ends.map(c => <g key={c}><circle cx={xy(c)[0]} cy={xy(c)[1]+3} r="28" fill="#b9a78a" opacity=".5" /><circle cx={xy(c)[0]} cy={xy(c)[1]} r="28" fill="currentColor" stroke="#fff7e7" strokeWidth="4" /><g style={{ color: '#fff9ed' }}><ThreadMark color={color} x={xy(c)[0]} y={xy(c)[1]} scale={1.4} /></g>{connected(s, game.paths, color) && <path d={`M${xy(c)[0]+15} ${xy(c)[1]-22} l5 5 10 -12`} fill="none" stroke="#254b36" strokeWidth="4" strokeLinecap="round" />}</g>)}
      </g>)}
    </svg>
    <div className="flow-grid" role="group" aria-label="색실 판: 같은 색과 무늬의 단추를 이어요" lang="ko">
      {Array.from({ length: s.cols * s.rows }, (_, cell) => {
        const end = endpointAt(s,cell), via = buttonAt(s,cell), owner = ownerAt(game.paths,cell), color = Math.max(end,via,owner);
        const description = end >= 0 ? `${THREADS[end].name} 단추` : via >= 0 ? `${THREADS[via].name} 고리` : owner >= 0 ? `${THREADS[owner].name} 실` : '빈칸';
        return <button key={cell} type="button" data-cell={cell} data-color={owner} tabIndex={cell === focus ? 0 : -1} disabled={!s.cells.includes(cell)}
          aria-label={`${Math.floor(cell / s.cols)+1}행 ${cell%s.cols+1}열 ${s.cells.includes(cell) ? description : '천 조각'}`}
          aria-pressed={color >= 0 && game.active === color} onFocus={() => setFocus(cell)}
          onKeyDown={e => {
            const direction = ['ArrowUp','ArrowRight','ArrowDown','ArrowLeft'].indexOf(e.key);
            if (direction >= 0) {
              e.preventDefault();
              const next = cell + [-s.cols,1,s.cols,-1][direction];
              if (next >= 0 && next < s.cols*s.rows && (direction % 2 === 0 || Math.floor(next/s.cols) === Math.floor(cell/s.cols)) && s.cells.includes(next)) root.current?.querySelector<HTMLButtonElement>(`[data-cell="${next}"]`)?.focus();
            }
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dispatch({ type:'begin', cell }); dispatch({ type:'end' }); }
          }} onClick={e => { if (e.detail === 0) { dispatch({ type:'begin', cell }); dispatch({ type:'end' }); } }} />;
      })}
    </div>
  </div>;
}
