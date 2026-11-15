import { type CSSProperties, type KeyboardEvent, type ReactNode, useRef, useState } from 'react';
import { act, location, type Stage, type State } from './model';
import { withTo } from '../ui/korean';
import { ArrowFlower } from './bee50/ArrowFlower';
import './lab-board.css';

export interface LabBoardProps {
  stage: Stage;
  state: State;
  onAction: (action: number) => void;
  hint: number | null;
  disabled: boolean;
  previousState?: State;
  lastAction?: number | null;
}

const ARROWS = ['↑', '→', '↓', '←'];
const DIRECTIONS = ['위', '오른쪽', '아래', '왼쪽'];
const boardStyle = (stage: Stage): CSSProperties => ({ '--lb-cols': stage.cols, '--lb-rows': stage.rows } as CSSProperties);

/** Small SVG toys are deliberately shared by the boards, not external image assets. */
function Toy({ kind, blue = false }: { kind: 'bunny' | 'home' | 'bush' | 'flower' | 'bee' | 'hive'; blue?: boolean }) {
  return <svg className={`lb-toy lb-toy-${kind}`} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    {kind === 'bunny' && <>
      <ellipse cx="22" cy="16" rx="7" ry="14" fill={blue ? '#d9e8f5' : '#fff8ee'} stroke="#807b8b" strokeWidth="1.8" transform="rotate(-9 22 16)" />
      <ellipse cx="42" cy="16" rx="7" ry="14" fill={blue ? '#d9e8f5' : '#fff8ee'} stroke="#807b8b" strokeWidth="1.8" transform="rotate(9 42 16)" />
      <path d="M22 7 L23 23 M42 7 L41 23" stroke="#eeb7c0" strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="32" cy="46" rx="15" ry="13" fill={blue ? '#d9e8f5' : '#fff8ee'} stroke="#807b8b" strokeWidth="1.8" />
      <ellipse cx="32" cy="33" rx="21" ry="17" fill={blue ? '#e7f1f8' : '#fffaf3'} stroke="#807b8b" strokeWidth="1.8" />
      <circle cx="24" cy="31" r="2" fill="#514754" /><circle cx="40" cy="31" r="2" fill="#514754" />
      <circle cx="19" cy="38" r="3.4" fill="#efb8bb" /><circle cx="45" cy="38" r="3.4" fill="#efb8bb" />
      <path d="M29 36 L32 39 L35 36" fill="#d38a9a" /><path d="M28 42 Q32 45 36 42" stroke="#826274" fill="none" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M19 49 Q32 54 45 49" fill="none" stroke={blue ? '#5488c4' : '#ac78a1'} strokeWidth="5" strokeLinecap="round" />
    </>}
    {kind === 'home' && <>
      <path d="M13 29 L32 13 L51 29 V55 H13Z" fill={blue ? '#b8d3e7' : '#ead0dd'} stroke={blue ? '#5985a7' : '#99738d'} strokeWidth="2" strokeLinejoin="round" />
      <path d="M8 30 L32 8 L56 30" fill="none" stroke={blue ? '#5985a7' : '#99738d'} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M24 55 V41 Q32 31 40 41 V55" fill="#fff9ea" /><path d="M27 24 Q32 18 37 24 Q37 28 32 31 Q27 28 27 24" fill="#fff9ea" />
    </>}
    {kind === 'bush' && <>
      <ellipse cx="32" cy="52" rx="24" ry="6" fill="#748e69" opacity=".25" />
      <path d="M13 49 C-1 37 10 23 20 27 C12 5 39 1 43 22 C58 14 68 40 52 49Z" fill="#86a17a" stroke="#6a8865" strokeWidth="2" />
      <path d="M17 39 Q25 29 32 35 M37 22 Q34 30 39 35 M42 42 Q48 35 54 38" fill="none" stroke="#a9be91" strokeWidth="3" strokeLinecap="round" />
    </>}
    {kind === 'flower' && <>
      <path d="M31 53 V34 M31 47 Q14 47 17 37 Q29 35 31 47 M32 43 Q45 31 50 40 Q47 50 32 47" fill="#8cba74" stroke="#5a8b59" strokeWidth="2" strokeLinecap="round" />
      {[0, 72, 144, 216, 288].map(a => <ellipse key={a} cx="32" cy="18" rx="8" ry="11" fill="#f4d6d4" stroke="#db9c9f" strokeWidth="1.3" transform={`rotate(${a} 32 28)`} />)}
      <circle cx="32" cy="28" r="7.5" fill="#f2c85c" stroke="#bd9651" strokeWidth="1.5" />
    </>}
    {kind === 'bee' && <>
      <ellipse cx="25" cy="22" rx="11" ry="14" fill="#e9f7f8" stroke="#a4c8cc" strokeWidth="1.8" transform="rotate(-35 25 22)" />
      <ellipse cx="43" cy="22" rx="11" ry="14" fill="#e9f7f8" stroke="#a4c8cc" strokeWidth="1.8" transform="rotate(35 43 22)" />
      <ellipse cx="34" cy="39" rx="22" ry="16" fill="#efc65f" stroke="#9a773d" strokeWidth="2" />
      <path d="M31 25 Q26 39 31 53 M41 25 Q36 39 41 53" fill="none" stroke="#8e6a38" strokeWidth="6" />
      <ellipse cx="17" cy="36" rx="12" ry="13" fill="#f6d784" stroke="#9a773d" strokeWidth="1.8" />
      <circle cx="13" cy="34" r="2.1" fill="#58452f" /><path d="M10 40 Q15 44 19 40" fill="none" stroke="#58452f" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M13 24 L9 17 M22 24 L25 17" stroke="#8e6a38" strokeWidth="2" strokeLinecap="round" />
    </>}
    {kind === 'hive' && <>
      <path d="M19 20 Q32 2 45 20 L53 48 Q32 62 11 48Z" fill="#e6b95d" stroke="#a87d3e" strokeWidth="2" />
      <path d="M18 25 H46 M15 34 H49 M12 43 H52" fill="none" stroke="#b78a47" strokeWidth="2.5" />
      <path d="M25 52 V41 Q32 32 39 41 V52" fill="#795b37" />
      <path d="M32 10 V4 H45" stroke="#7b9152" strokeWidth="3" strokeLinecap="round" />
    </>}
  </svg>;
}

function Tile({ children, label, onClick, disabled, className = '', selected, style }: {
  children?: ReactNode; label: string; onClick?: () => void; disabled?: boolean;
  className?: string; selected?: boolean; style?: CSSProperties;
}) {
  if (!onClick) return <div className={`lb-tile ${className}`} style={style} role="img" aria-label={label}>{children}</div>;
  return <button type="button" className={`lb-tile ${className}`} aria-label={label} aria-pressed={selected} onClick={onClick} disabled={disabled} style={style}>{children}</button>;
}

function Dpad({ stage, state, hint, disabled, onAction, onPreview }: LabBoardProps & { onPreview: (dir: number) => void }) {
  return <div className="lb-dpad" role="group" aria-label="방향 조작">
    {[0, 3, 2, 1].map(d => <button key={d} type="button" className={`lb-direction lb-direction-${d}${hint === d ? ' lb-hint' : ''}`} onFocus={() => onPreview(d)} onPointerEnter={() => onPreview(d)} onClick={() => onAction(d)} disabled={disabled || !act(stage, state, d)} aria-label={`${withTo(DIRECTIONS[d])} 움직이기`}>
      <span aria-hidden="true">{ARROWS[d]}</span>
      <small className="lb-paired-arrows" aria-hidden="true">🐰{ARROWS[d]} 🐰{ARROWS[d % 2 ? (d + 2) % 4 : d]}</small>
    </button>)}
    <span className="lb-dpad-heart" aria-hidden="true">✦</span>
  </div>;
}

function MovementBoard(props: LabBoardProps) {
  const { stage, state, onAction, disabled, hint, previousState, lastAction } = props;
  const [previewDir, setPreviewDir] = useState(stage.number === 2 ? 1 : 0);
  const preview = act(stage, state, previewDir) ?? state;
  const [large, setLarge] = useState(false);
  const floors = [stage.terrain!, stage.terrain2!];
  const handleKey = (e: KeyboardEvent) => {
    if (disabled || e.altKey || e.ctrlKey || e.metaKey) return;
    const d = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'].indexOf(e.key);
    if (d >= 0) { e.preventDefault(); if (!e.repeat) onAction(d); }
  };
  const hintNext = hint !== null ? act(stage, state, hint) : null;
  return <div className={`lb-movement lb-twins${large ? ' lb-twins-large' : ''}`} onKeyDown={handleKey} tabIndex={0} aria-label={`두 토끼 게임판. 방향키 또는 아래 화살표 버튼으로 움직여요.`}>
    <div className="lb-board-note"><span>↕ 함께</span><span>↔ 서로 반대로</span></div>
    <div className="lb-view-options"><button type="button" className="lb-view-toggle" aria-label={large ? '두 숲 나란히 보기' : '숲 크게 보기'} aria-pressed={large} onClick={() => setLarge(value => !value)}>{large ? '↔ 두 숲 나란히 보기' : '⊕ 숲 크게 보기'}</button></div>
    <p className="lb-home-rule">집에 있어도 다음 버튼에 다시 움직여요. 두 집에 함께 도착하면 완성이에요.</p>
    <div className="lb-forest-pair">
      {floors.map((floor, board) => <div className={`lb-forest-side lb-forest-side-${board}`} key={board}>
        <p className="lb-forest-name">{board === 0 ? '루루의 숲' : '라라의 거울 숲'}</p>
        <p className="lb-rabbit-preview">다음 {ARROWS[board === 1 && previewDir % 2 ? (previewDir + 2) % 4 : previewDir]} {preview[board] === state[board] ? '벽 앞에서 쉬어요' : '한 칸 움직여요'}</p>
        <div className="lb-grid lb-forest-grid" style={boardStyle(stage)} role="group" aria-label={`${board === 0 ? '루루' : '라라'}의 숲`}>
          {floor.map((open, cell) => {
            const player = state[board] === cell;
            const goal = stage.goal[board] === cell;
            const hintedHere = hintNext !== null && hintNext[board] !== state[board] && hintNext[board] === cell;
            const label = `${location(stage, cell)}, ${!open ? '나무 울타리' : player ? `${board === 0 ? '루루' : '라라'}${goal ? ', 집에 도착' : ''}` : goal ? '토끼 집' : '숲길'}`;
            return <Tile key={cell} label={label} disabled={disabled} className={`${!open ? 'lb-bush-cell' : 'lb-forest-cell'}${goal ? ' lb-goal-cell' : ''}${hintedHere ? ' lb-hint' : ''}${preview[board] !== state[board] && preview[board] === cell ? ' lb-preview-cell' : ''}`}>
              {!open ? <Toy kind="bush" /> : <>
                {goal && <div className={`lb-tile-backdrop${player ? ' lb-under-piece' : ''}`}><Toy kind="home" blue={board === 1} /></div>}
                {player && <Toy kind="bunny" blue={board === 1} />}
                {goal && player && <span className="lb-cell-check" aria-hidden="true">✓</span>}
                {!goal && !player && <span className="lb-grass" aria-hidden="true">⌁</span>}
              </>}
            </Tile>;
          })}
        </div>
      </div>)}
    </div>
    {previousState && lastAction != null && <p className="lb-rabbit-reaction" role="status">{[0, 1].map(i => `${i === 0 ? '루루' : '라라'}: ${previousState[i] === state[i] ? '벽에 막혀 쉬었어요' : '한 칸 움직였어요'}`).join(' · ')}</p>}
    <Dpad {...props} onPreview={setPreviewDir} />
    <p className="lb-caption">한 버튼으로 두 친구가 함께 움직여요.</p>
  </div>;
}

function BeeBoard({ stage, state, onAction, hint, disabled }: LabBoardProps) {
  const last = state.at(-1)!;
  const flowers = stage.terrain!.filter(Boolean).length;
  const remaining = flowers - state.length - 1;
  const drag = useRef<{ pointer: number; cell: number | null; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const points = state.map(cell => `${cell % stage.cols * 64 + 32},${Math.floor(cell / stage.cols) * 64 + 32}`).join(' ');
  const cellAt = (x: number, y: number) => {
    const tile = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-bee-cell]');
    return tile ? Number(tile.dataset.beeCell) : null;
  };
  const visit = (cell: number | null) => {
    if (!drag.current || drag.current.cell === cell) return;
    drag.current.cell = cell;
    drag.current.moved = true;
    // No interpolation: a skipped cell is rejected by the same adjacency rule as a tap.
    if (cell !== null) onAction(cell);
  };
  return <div className="lb-bee">
    {stage.number >= 31 && <p className="lb-bee-discovery">{stage.arrows
      ? '➜ 화살표 꽃에서는 화살표 쪽으로 나가요. 들어오는 쪽은 자유! 되짚기도 돼요.'
      : '두 꽃밭 사이 작은 길! 건너기 전에 이쪽 꽃을 모두 만나 볼까요?'}</p>}
    <div className="lb-board-note">인사한 꽃길 <b>{state.length} / {flowers}</b><span>{remaining > 0 ? `벌집 🔒 남은 꽃을 먼저 (${remaining}송이)` : '벌집으로 돌아가요'}</span></div>
    <div className="lb-bee-frame">
      <svg className="lb-flower-path" viewBox={`0 0 ${stage.cols * 64} ${stage.rows * 64}`} aria-hidden="true"><polyline points={points} /></svg>
      <div className="lb-grid lb-bee-grid" style={boardStyle(stage)} role="group" aria-label="한 번씩 방문하는 꽃길"
        onPointerDown={e => {
          if (disabled || !e.isPrimary || e.button !== 0) return;
          suppressClick.current = false;
          const cell = cellAt(e.clientX, e.clientY);
          drag.current = { pointer: e.pointerId, cell, moved: false };
          e.currentTarget.setPointerCapture(e.pointerId);
          if (cell !== null && cell !== last) onAction(cell);
        }}
        onPointerMove={e => { if (drag.current?.pointer === e.pointerId && !disabled) visit(cellAt(e.clientX, e.clientY)); }}
        onPointerUp={e => {
          if (drag.current?.pointer !== e.pointerId) return;
          suppressClick.current = true;
          drag.current = null;
        }}
        onPointerCancel={() => { drag.current = null; suppressClick.current = true; }}
        onLostPointerCapture={() => { drag.current = null; }}>
        {stage.terrain!.map((open, cell) => {
          const visited = state.includes(cell), goal = stage.goal[0] === cell, legal = !!act(stage, state, cell);
          const retrace = state.length > 1 && state[state.length - 2] === cell;
          const arrow = stage.arrows?.[cell];
          return <button type="button" key={cell} data-bee-cell={cell}
            aria-label={`${location(stage, cell)}, ${!open ? '풀밭, 길 없음' : cell === last ? '꿀벌 보리' : goal ? remaining > 0 ? '벌집 잠김, 남은 꽃을 먼저' : '벌집, 마지막에 도착해요' : retrace ? '직전 꽃, 누르면 끝 한 칸 지우기' : visited ? '인사한 꽃길' : '아직 방문하지 않은 꽃'}${arrow !== undefined ? `, 화살표 꽃 ${ARROWS[arrow]} ${withTo(DIRECTIONS[arrow])}만 나가기` : ''}${legal ? ', 여기로 날아가기' : ''}`}
            onClick={e => { if (e.detail === 0 || !suppressClick.current) onAction(cell); suppressClick.current = false; }}
            disabled={disabled || !open} aria-disabled={!legal}
            className={`lb-tile lb-bee-cell${!open ? ' lb-bee-grass' : ''}${visited ? ' lb-bee-visited' : ''}${legal ? ' lb-bee-next' : ''}${retrace ? ' lb-bee-retrace' : ''}${hint === cell ? ' lb-hint' : ''}`}>
            {cell === last ? <Toy kind="bee" /> : goal ? <Toy kind="hive" /> : open && !visited ? arrow !== undefined ? <ArrowFlower direction={arrow} /> : <Toy kind="flower" /> : open ? <span className="lb-flower-visited" aria-hidden="true">{retrace ? '↶' : '✓'}</span> : <span className="lb-grass" aria-hidden="true">⌁</span>}
            {arrow !== undefined && visited && <ArrowFlower direction={arrow} badge />}
            {cell === stage.start[0] && <span className="lb-start-marker" aria-hidden="true">출발</span>}
            {goal && remaining > 0 && <span className="lb-hive-lock" aria-hidden="true">🔒 남은 꽃을 먼저</span>}
          </button>;
        })}
      </div>
    </div>
    <p className="lb-caption">이웃 꽃을 누르거나 한 칸씩 이어요. 직전 꽃으로 되짚으면 끝 한 칸이 지워져요.</p>
  </div>;
}

export function LabBoard(props: LabBoardProps) {
  return props.stage.kind === 'twins' ? <MovementBoard {...props} /> : <BeeBoard {...props} />;
}
