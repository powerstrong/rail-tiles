import { type CSSProperties, type KeyboardEvent, type ReactNode, useEffect, useId, useState } from 'react';
import { act, degrees, DIRS, floodRegion, location, neighbor, type Stage, type State } from './model';
import { runs } from './solver';
import { withTo } from '../ui/korean';
import './lab-board.css';

export interface LabBoardProps {
  stage: Stage;
  state: State;
  onAction: (action: number) => void;
  hint: number | null;
  disabled: boolean;
}

const SYMBOLS = ['●', '◆', '▲', '■', '♥'];
const COLORS = ['#d86464', '#e8bd45', '#4c9c7a', '#5488c4', '#9d73b4'];
const COLOR_NAMES = ['빨강', '노랑', '초록', '파랑', '보라'];
const ARROWS = ['↑', '→', '↓', '←'];
const DIRECTIONS = ['위', '오른쪽', '아래', '왼쪽'];
const boardStyle = (stage: Stage): CSSProperties => ({ '--lb-cols': stage.cols, '--lb-rows': stage.rows } as CSSProperties);

/** Small SVG toys are deliberately shared by the boards, not external image assets. */
function Toy({ kind, blue = false }: { kind: 'acorn' | 'squirrel' | 'bunny' | 'home' | 'sprout' | 'bush' | 'lamp' | 'moonstone' | 'flower' | 'bee' | 'hive' | 'candy'; blue?: boolean }) {
  return <svg className={`lb-toy lb-toy-${kind}`} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    {kind === 'acorn' && <>
      <path d="M18 25 Q14 44 32 55 Q50 44 46 25Z" fill="#b9753d" stroke="#80512f" strokeWidth="2.5" />
      <path d="M16 28 Q12 13 31 13 Q51 13 49 28Z" fill="#76533e" />
      <path d="M33 15 Q32 8 39 6" fill="none" stroke="#76533e" strokeWidth="4" strokeLinecap="round" />
      <path d="M24 20 l3 3 m6-5 3 3 m6-1 3 3" stroke="#a48561" strokeWidth="2" strokeLinecap="round" />
      <path d="M24 32 Q20 39 27 45" fill="none" stroke="#e9ac66" strokeWidth="3" strokeLinecap="round" />
    </>}
    {kind === 'squirrel' && <>
      <path d="M42 52 C68 53 66 18 50 14 C36 8 34 26 46 30 C53 32 53 40 44 40" fill="#c47839" stroke="#94582f" strokeWidth="2" />
      <ellipse cx="29" cy="46" rx="15" ry="13" fill="#d9914d" />
      <ellipse cx="27" cy="46" rx="9" ry="10" fill="#f9d4a3" />
      <path d="M14 20 L14 7 L26 14 M33 14 L42 7 L42 23" fill="#d9914d" stroke="#94582f" strokeWidth="2" strokeLinejoin="round" />
      <ellipse cx="28" cy="27" rx="18" ry="15" fill="#e5a360" />
      <ellipse cx="28" cy="33" rx="11" ry="8" fill="#ffe3bd" />
      <circle cx="20" cy="24" r="2.3" fill="#423b33" /><circle cx="36" cy="24" r="2.3" fill="#423b33" />
      <path d="M25 30 Q28 35 31 30" fill="#6d4734" /><path d="M25 37 Q28 40 31 37" fill="none" stroke="#6d4734" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M14 47 L23 44 M37 44 L43 48" stroke="#94582f" strokeWidth="3" strokeLinecap="round" />
    </>}
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
    {kind === 'sprout' && <>
      <ellipse cx="32" cy="49" rx="20" ry="7" fill="#b9cba0" /><path d="M32 48 V26" stroke="#4e8351" strokeWidth="4" strokeLinecap="round" />
      <path d="M31 36 Q7 36 12 17 Q32 15 31 36Z" fill="#75aa63" stroke="#4e8351" strokeWidth="2" /><path d="M33 30 Q35 8 54 14 Q57 31 33 30Z" fill="#91bd74" stroke="#4e8351" strokeWidth="2" />
    </>}
    {kind === 'bush' && <>
      <ellipse cx="32" cy="52" rx="24" ry="6" fill="#748e69" opacity=".25" />
      <path d="M13 49 C-1 37 10 23 20 27 C12 5 39 1 43 22 C58 14 68 40 52 49Z" fill="#86a17a" stroke="#6a8865" strokeWidth="2" />
      <path d="M17 39 Q25 29 32 35 M37 22 Q34 30 39 35 M42 42 Q48 35 54 38" fill="none" stroke="#a9be91" strokeWidth="3" strokeLinecap="round" />
    </>}
    {kind === 'lamp' && <>
      <path d="M26 17 V10 Q32 4 38 10 V17 M25 52 H39" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <rect x="15" y="16" width="34" height="35" rx="12" fill="currentColor" opacity=".22" />
      <path d="M18 19 H46 L50 45 Q32 56 14 45Z" fill="currentColor" opacity=".35" stroke="currentColor" strokeWidth="2" />
      <path d="M32 24 L35 32 L43 34 L35 37 L32 45 L29 37 L21 34 L29 32Z" fill="currentColor" />
    </>}
    {kind === 'moonstone' && <>
      <path d="M13 45 L10 29 L23 14 L43 13 L54 32 L47 49 L27 55Z" fill="#d6daee" stroke="#878aa9" strokeWidth="2" strokeLinejoin="round" />
      <path d="M10 29 L32 33 L43 13 M32 33 L27 55 M32 33 L54 32" fill="none" stroke="#abb2ce" strokeWidth="2" />
      <path d="M23 24 L28 21" stroke="#fff9ed" strokeWidth="3" strokeLinecap="round" />
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
    {kind === 'candy' && <>
      <path d="M15 26 L5 20 L7 43 L17 38 M49 26 L59 20 L57 43 L47 38" fill="#e6a2b6" stroke="#af718a" strokeWidth="2" strokeLinejoin="round" />
      <path d="M16 21 Q32 15 48 21 L48 43 Q32 49 16 43Z" fill="#f6d5df" stroke="#af718a" strokeWidth="2" />
      <path d="M25 20 L20 45 M37 19 L32 46 M48 22 L43 45" stroke="#e9b2c3" strokeWidth="5" />
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

function Dpad({ stage, state, hint, disabled, onAction }: LabBoardProps) {
  return <div className="lb-dpad" role="group" aria-label="방향 조작">
    {[0, 3, 2, 1].map(d => <button key={d} type="button" className={`lb-direction lb-direction-${d}${hint === d ? ' lb-hint' : ''}`} onClick={() => onAction(d)} disabled={disabled || !act(stage, state, d)} aria-label={`${withTo(DIRECTIONS[d])} 움직이기`}>
      <span aria-hidden="true">{ARROWS[d]}</span>
    </button>)}
    <span className="lb-dpad-heart" aria-hidden="true">✦</span>
  </div>;
}

function MovementBoard(props: LabBoardProps) {
  const { stage, state, onAction, disabled, hint } = props;
  const twin = stage.kind === 'twins';
  const [large, setLarge] = useState(false);
  const floors = twin ? [stage.terrain!, stage.terrain2!] : [stage.terrain!];
  const handleKey = (e: KeyboardEvent) => {
    if (disabled || e.altKey || e.ctrlKey || e.metaKey) return;
    const d = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'].indexOf(e.key);
    if (d >= 0) { e.preventDefault(); if (!e.repeat) onAction(d); }
  };
  const hintNext = hint !== null ? act(stage, state, hint) : null;
  const count = stage.goal.filter(goal => state.slice(1).includes(goal)).length;
  return <div className={`lb-movement ${twin ? 'lb-twins' : 'lb-acorn'}${large ? ' lb-twins-large' : ''}`} onKeyDown={handleKey} tabIndex={0} aria-label={`${twin ? '두 토끼' : '다람쥐'} 게임판. 방향키 또는 아래 화살표 버튼으로 움직여요.`}>
    {twin ? <div className="lb-board-note"><span>↕ 함께</span><span>↔ 서로 반대로</span></div> : <div className="lb-board-note">심은 도토리 <b>{count} / {stage.goal.length}</b></div>}
    {twin && <div className="lb-view-options"><button type="button" className="lb-view-toggle" aria-label={large ? '두 숲 나란히 보기' : '숲 크게 보기'} aria-pressed={large} onClick={() => setLarge(value => !value)}>{large ? '↔ 두 숲 나란히 보기' : '⊕ 숲 크게 보기'}</button></div>}
    <div className="lb-forest-pair">
      {floors.map((floor, board) => <div className={`lb-forest-side lb-forest-side-${board}`} key={board}>
        {twin && <p className="lb-forest-name">{board === 0 ? '루루의 숲' : '라라의 거울 숲'}</p>}
        <div className="lb-grid lb-forest-grid" style={boardStyle(stage)} role="group" aria-label={twin ? `${board === 0 ? '루루' : '라라'}의 숲` : '도토리 정원'}>
          {floor.map((open, cell) => {
            const player = state[twin ? board : 0] === cell;
            const goal = twin ? stage.goal[board] === cell : stage.goal.includes(cell);
            const box = !twin && state.slice(1).includes(cell);
            const hintedHere = hintNext !== null && (twin
              ? hintNext[board] !== state[board] && hintNext[board] === cell
              : hintNext[0] === cell);
            const d = DIRS.findIndex((_, d) => neighbor(stage, state[0], d) === cell);
            const canMove = !twin && open && d >= 0 && !!act(stage, state, d);
            const label = `${location(stage, cell)}, ${!open ? '나무 울타리' : player ? twin ? `${board === 0 ? '루루' : '라라'}${goal ? ', 집에 도착' : ''}` : '다람쥐 모모' : box ? `도토리${goal ? ', 심었어요' : ''}` : goal ? twin ? '토끼 집' : '새싹 자리' : '숲길'}`;
            return <Tile key={cell} label={label} onClick={canMove ? () => onAction(d) : undefined} disabled={disabled} className={`${!open ? 'lb-bush-cell' : 'lb-forest-cell'}${goal ? ' lb-goal-cell' : ''}${canMove ? ' lb-step-cell' : ''}${hintedHere ? ' lb-hint' : ''}`}>
              {!open ? <Toy kind="bush" /> : <>
                {goal && <div className={`lb-tile-backdrop${player || box ? ' lb-under-piece' : ''}`}><Toy kind={twin ? 'home' : 'sprout'} blue={board === 1} /></div>}
                {box && <Toy kind="acorn" />}
                {player && <Toy kind={twin ? 'bunny' : 'squirrel'} blue={board === 1} />}
                {goal && (twin ? player : box) && <span className="lb-cell-check" aria-hidden="true">✓</span>}
                {!goal && !box && !player && <span className="lb-grass" aria-hidden="true">⌁</span>}
              </>}
            </Tile>;
          })}
        </div>
      </div>)}
    </div>
    <Dpad {...props} />
    <p className="lb-caption">{twin ? '한 버튼으로 두 친구가 함께 움직여요.' : '모모 옆의 길을 누르거나 화살표로 움직여요.'}</p>
  </div>;
}

function LightsBoard({ stage, state, onAction, hint, disabled }: LabBoardProps) {
  const [preview, setPreview] = useState<number | null>(null);
  const over = preview ?? hint;
  const affected = over === null ? [] : [over, ...DIRS.map((_, d) => neighbor(stage, over, d))];
  return <div className="lb-lights">
    <div className="lb-board-note">깨어난 친구 <b>{state.filter(Boolean).length} / {state.length}</b></div>
    <div className="lb-lantern-frame">
      <span className="lb-festival-string" aria-hidden="true" />
      <div className="lb-grid lb-lantern-grid" style={boardStyle(stage)} role="group" aria-label="반딧불 등">
        {state.map((on, cell) => <button key={cell} type="button" className={`lb-tile lb-lantern-cell${on ? ' lb-lantern-on' : ''}${affected.includes(cell) ? ' lb-lantern-preview' : ''}${hint === cell ? ' lb-hint' : ''}`} aria-label={`${location(stage, cell)}, ${on ? '켜진 등' : '꺼진 등'}. 누르면 이 등과 상하좌우 등이 바뀌어요.`} aria-pressed={!!on} onClick={() => onAction(cell)} disabled={disabled} onPointerEnter={() => setPreview(cell)} onPointerLeave={() => setPreview(null)} onFocus={() => setPreview(cell)} onBlur={() => setPreview(null)}>
          <Toy kind="lamp" /><span className="lb-lamp-state">{on ? 'ON' : 'OFF'}</span>
        </button>)}
      </div>
    </div>
    <p className="lb-caption">선택한 등과 십자 모양 이웃이 함께 바뀌어요.</p>
  </div>;
}

function CoralBoard({ stage, state, onAction, hint, disabled }: LabBoardProps) {
  const region = floodRegion(stage, state);
  const palette = [...new Set(stage.start)].sort((a, b) => a - b);
  return <div className="lb-coral">
    <div className="lb-board-note">물감이가 만난 산호 <b>{region.size} / {state.length}</b></div>
    <div className="lb-ocean-frame">
      <div className="lb-grid lb-coral-grid" style={boardStyle(stage)} role="group" aria-label={`산호초. 왼쪽 위에서 ${region.size}칸까지 연결됐어요.`}>
        {state.map((color, cell) => <div className={`lb-tile lb-coral-cell${region.has(cell) ? ' lb-coral-owned' : ''}`} style={{ '--lb-color': COLORS[color] } as CSSProperties} key={cell} role="img" aria-label={`${location(stage, cell)}, ${COLOR_NAMES[color]} ${SYMBOLS[color]}${region.has(cell) ? ', 연결됨' : ''}`}>
          <span className="lb-coral-shape" aria-hidden="true">{SYMBOLS[color]}</span>
          {cell === 0 && <span className="lb-coral-start" aria-hidden="true">⚑</span>}
        </div>)}
      </div>
      <div className="lb-sea-floor" aria-hidden="true"><span>⌁</span><span>✧</span><span>⌁</span></div>
    </div>
    <div className="lb-palette" role="group" aria-label="퍼뜨릴 색 고르기" style={{ gridTemplateColumns: `repeat(${palette.length}, minmax(0, 1fr))` }}>
      {palette.map(i => <button key={i} type="button" className={`lb-color-button${state[0] === i ? ' lb-color-current' : ''}${hint === i ? ' lb-hint' : ''}`} style={{ '--lb-color': COLORS[i] } as CSSProperties} onClick={() => onAction(i)} disabled={disabled || state[0] === i} aria-label={`${COLOR_NAMES[i]} ${SYMBOLS[i]}로 물들이기${state[0] === i ? ', 현재 색' : ''}`}>
        <span className="lb-color-swatch" aria-hidden="true">{SYMBOLS[i]}</span><span>{COLOR_NAMES[i]}</span>
      </button>)}
    </div>
    <p className="lb-caption">깃발에서 이어진 산호가 선택한 색으로 자라나요.</p>
  </div>;
}

function CloudBoard({ stage, state, onAction, hint, disabled }: LabBoardProps) {
  const [large, setLarge] = useState(false);
  const clue = (line: number[]) => runs(line).length ? runs(line) : [0];
  const rowClues = Array.from({ length: stage.rows }, (_, y) => clue(stage.goal.slice(y * stage.cols, (y + 1) * stage.cols)));
  const colClues = Array.from({ length: stage.cols }, (_, x) => clue(Array.from({ length: stage.rows }, (_, y) => stage.goal[y * stage.cols + x])));
  const rowDone = (y: number) => runs(state.slice(y * stage.cols, (y + 1) * stage.cols)).join(',') === runs(stage.goal.slice(y * stage.cols, (y + 1) * stage.cols)).join(',');
  const colDone = (x: number) => runs(Array.from({ length: stage.rows }, (_, y) => state[y * stage.cols + x])).join(',') === runs(Array.from({ length: stage.rows }, (_, y) => stage.goal[y * stage.cols + x])).join(',');
  return <div className="lb-cloud">
    <div className="lb-view-options"><button type="button" className="lb-view-toggle" aria-label={large ? '자수판 한눈에 보기' : '자수 칸 크게 보기'} aria-pressed={large} onClick={() => setLarge(value => !value)}>{large ? '⊖ 한눈에 보기' : '⊕ 칸 크게 보기'}</button></div>
    {large && <p className="lb-scroll-note">칸이 커졌어요. 자수판을 좌우로 밀어 볼 수 있어요.</p>}
    <div className="lb-cloud-scroll" tabIndex={large ? 0 : undefined} role="region" aria-label={large ? '확대한 자수판. 좌우로 밀어 볼 수 있어요.' : '자수판'}>
    <div className={`lb-cloud-board${large ? ' lb-cloud-large' : ''}`} style={boardStyle(stage)} role="group" aria-label="숫자 단서로 무늬를 찾는 자수판">
      <span className="lb-clue-corner" aria-hidden="true">🧵</span>
      {colClues.map((numbers, x) => <div key={`c${x}`} className={`lb-clue lb-clue-col${colDone(x) ? ' lb-clue-met' : ''}`} aria-label={`${x + 1}열 세로 단서 ${numbers.join(', ')}`}>
        {numbers.map((n, i) => <span key={i}>{n}</span>)}
      </div>)}
      {Array.from({ length: stage.rows }, (_, y) => <div className="lb-cloud-row" key={y}>
        <div className={`lb-clue lb-clue-row${rowDone(y) ? ' lb-clue-met' : ''}`} aria-label={`${y + 1}행 가로 단서 ${rowClues[y].join(', ')}`}>{rowClues[y].join(' · ')}</div>
        {state.slice(y * stage.cols, (y + 1) * stage.cols).map((value, x) => {
          const cell = y * stage.cols + x;
          return <Tile key={cell} label={`${location(stage, cell)}, ${['아직 모르는 칸', '수놓은 칸', '빈칸 표시'][value]}. 누르면 ${['수놓기', '빈칸 표시', '지우기'][value]}`} onClick={() => onAction(cell * 3 + (value + 1) % 3)} disabled={disabled} className={`lb-stitch-cell lb-stitch-${value}${hint !== null && Math.floor(hint / 3) === cell ? ' lb-hint' : ''}`}>
            <span aria-hidden="true">{value === 1 ? '✦' : value === 2 ? '×' : ''}</span>
          </Tile>;
        })}
      </div>)}
    </div></div>
    <div className="lb-stitch-legend" aria-hidden="true"><span><i className="lb-legend-filled">✦</i> 수놓기</span><span><i>×</i> 빈칸 표시</span><span>한 번 더 누르면 지워져요</span></div>
    <details className="lb-example"><summary>숫자 읽는 법을 볼까요?</summary><p>예를 들어 <b>2 · 1</b>은 두 칸을 이어 수놓고, <b>한 칸 이상 띄운 뒤</b> 한 칸을 수놓으라는 뜻이에요.</p><span className="lb-clue-example" aria-label="수놓은 두 칸, 빈칸, 수놓은 한 칸">✦ ✦ <em>×</em> ✦</span></details>
  </div>;
}

function BalanceBoard({ stage, state, onAction, hint, disabled }: LabBoardProps) {
  const weights = stage.weights!;
  const left = weights.reduce((n, w, i) => n + (state[i] === 1 ? w : 0), 0);
  const fixed = stage.target ?? 0;
  const right = fixed + weights.reduce((n, w, i) => n + (state[i] === 2 ? w : 0), 0);
  const resting = state.filter(n => n === 0).length;
  const tilt = Math.max(-8, Math.min(8, (right - left) * 1.25));
  const pan = (side: 1 | 2) => <div className={`lb-pan lb-pan-${side}`}>
    <p className="lb-pan-label">{side === 1 ? '왼쪽 접시' : '오른쪽 접시'}</p>
    <div className="lb-pan-bowl">
      <div className="lb-pan-candies">
        {side === 2 && fixed > 0 && <span className="lb-fixed-weight" aria-label={`고정 추 ${fixed}`}><small>고정</small>{fixed}</span>}
        {weights.flatMap((w, i) => state[i] === side ? [<span key={i} className="lb-pan-candy" aria-label={`${i + 1}번 별사탕, 무게 ${w}`}>{w}</span>] : [])}
        {state.every(n => n !== side) && !(side === 2 && fixed > 0) && <span className="lb-pan-empty">아직 비었어요</span>}
      </div>
    </div>
    <div className="lb-pan-total">합 <strong>{side === 1 ? left : right}</strong></div>
  </div>;
  return <div className="lb-balance">
    <div className="lb-scale" style={{ '--lb-tilt': `${tilt}deg` } as CSSProperties}>
      <div className="lb-scale-stand" aria-hidden="true"><span /><i /></div>
      <div className="lb-scale-beam" aria-hidden="true" />
      <div className="lb-scale-pans">{pan(1)}{pan(2)}</div>
      <div className={`lb-scale-equals${left === right ? ' lb-scale-even' : ''}`} aria-label={left === right ? '두 접시의 무게가 같아요' : `${left > right ? '왼쪽' : '오른쪽'}이 ${Math.abs(left - right)}만큼 무거워요`}>{left === right ? '=' : left > right ? '>' : '<'}</div>
    </div>
    <p className="lb-board-note">쟁반에 남은 별사탕 <b>{resting}개</b>{fixed > 0 && <span className="lb-fixed-note">오른쪽 고정 추 {fixed}</span>}</p>
    <div className="lb-candy-tray" role="group" aria-label="별사탕을 눌러 접시로 옮기기">
      {weights.map((weight, i) => <button key={i} type="button" className={`lb-candy-card lb-candy-side-${state[i]}${hint !== null && Math.floor(hint / 3) === i ? ' lb-hint' : ''}`} onClick={() => onAction(i * 3 + (state[i] + 1) % 3)} disabled={disabled} aria-label={`${i + 1}번 별사탕, 무게 ${weight}, 현재 ${['쟁반', '왼쪽 접시', '오른쪽 접시'][state[i]]}. 누르면 ${['왼쪽 접시', '오른쪽 접시', '쟁반'][state[i]]}으로 옮겨요.`}>
        <span className="lb-candy-index">{i + 1}번</span><span className="lb-candy-art"><Toy kind="candy" /><b>{weight}</b></span><span className="lb-candy-location">{['쟁반', '← 왼쪽', '오른쪽 →'][state[i]]}</span>
      </button>)}
    </div>
    <p className="lb-caption">카드를 누를 때마다 왼쪽 → 오른쪽 → 쟁반으로 옮겨요.</p>
  </div>;
}

function MoonBoard({ stage, state, onAction, hint, disabled }: LabBoardProps) {
  const [picked, setPicked] = useState<number | null>(null);
  useEffect(() => { setPicked(hint === null ? null : Math.floor(hint / state.length)); }, [hint, state]);
  const legal = state.map((_, to) => picked !== null && !!act(stage, state, picked * state.length + to));
  const choose = (cell: number) => {
    if (state[cell]) { setPicked(picked === cell ? null : cell); return; }
    if (picked !== null) onAction(picked * state.length + cell);
  };
  return <div className="lb-moon">
    <div className="lb-board-note">남은 달돌 <b>{state.filter(Boolean).length}개</b><span>마지막 달돌은 ★ 위에</span></div>
    <div className="lb-moon-frame"><div className="lb-grid lb-moon-grid" style={boardStyle(stage)} role="group" aria-label="달돌 도약판">
      {state.map((stone, cell) => {
        const active = !!stage.terrain![cell], goal = cell === stage.goal[0];
        return <Tile key={cell} label={`${location(stage, cell)}, ${!active ? '달 바깥' : stone ? '달돌' : '빈자리'}${goal ? ', 마지막 별 자리' : ''}${picked === cell ? ', 선택함' : ''}${legal[cell] ? ', 여기로 도약 가능' : ''}`} onClick={active ? () => choose(cell) : undefined} disabled={disabled || (!stone && !legal[cell])} selected={picked === cell} className={`lb-moon-cell${!active ? ' lb-void' : ''}${picked === cell ? ' lb-picked' : ''}${legal[cell] ? ' lb-landing' : ''}${goal ? ' lb-star-cell' : ''}${hint !== null && (Math.floor(hint / state.length) === cell || hint % state.length === cell) ? ' lb-hint' : ''}`}>
          {goal && <span className="lb-moon-star" aria-hidden="true">★</span>}{stone ? <Toy kind="moonstone" /> : active && <span className="lb-moon-hole" aria-hidden="true">{legal[cell] ? '↓' : '·'}</span>}
        </Tile>;
      })}
    </div></div>
    <p className="lb-caption" aria-live="polite">{picked === null ? '먼저 움직일 달돌을 골라 주세요.' : legal.some(Boolean) ? '반짝이는 빈칸을 누르면 달돌이 폴짝 뛰어요.' : '이 달돌은 지금 뛸 수 없어요. 다른 달돌을 골라 보세요.'}</p>
  </div>;
}

function MosaicBoard({ stage, state, onAction, hint, disabled }: LabBoardProps) {
  const key = (e: KeyboardEvent) => {
    if (disabled || e.altKey || e.ctrlKey || e.metaKey) return;
    const d = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'].indexOf(e.key);
    if (d >= 0) {
      e.preventDefault();
      const cell = neighbor(stage, state.indexOf(0), d);
      if (cell >= 0 && !e.repeat) onAction(cell);
    }
  };
  return <div className="lb-mosaic" onKeyDown={key} tabIndex={0} aria-label="모자이크 게임판. 방향키로 빈칸을 움직이거나 빈칸 옆 조각을 누르세요.">
    <div className="lb-grid lb-mosaic-grid" style={boardStyle(stage)} role="group" aria-label="별빛 번호 조각">
      {state.map((number, cell) => <Tile key={cell} label={`${location(stage, cell)}, ${number ? `${number}번 조각${act(stage, state, cell) ? ', 빈칸으로 옮기기' : ''}` : '빈칸'}`} onClick={number ? () => onAction(cell) : undefined} disabled={disabled || !act(stage, state, cell)} className={`lb-mosaic-cell${number === 0 ? ' lb-mosaic-blank' : ''}${number === stage.goal[cell] && number > 0 ? ' lb-mosaic-home' : ''}${hint === cell ? ' lb-hint' : ''}`} style={{ '--lb-piece': number } as CSSProperties}>
        {number > 0 ? <><span className="lb-piece-star" aria-hidden="true">✦</span><strong>{number}</strong></> : <span className="lb-blank-dots" aria-hidden="true">· · ·</span>}
      </Tile>)}
    </div>
    <p className="lb-caption">빈칸 바로 옆 조각을 누르세요. 방향키도 쓸 수 있어요.</p>
    <details className="lb-example lb-mosaic-example"><summary>완성 그림 보기</summary><div className="lb-mini-mosaic" style={boardStyle(stage)} aria-label="완성 순서">{stage.goal.map((number, i) => <span className={number ? '' : 'lb-mini-blank'} key={i}>{number || '빈칸'}</span>)}</div></details>
  </div>;
}

function BeeBoard({ stage, state, onAction, hint, disabled }: LabBoardProps) {
  const last = state.at(-1)!;
  const flowers = stage.terrain!.filter(Boolean).length;
  const points = state.map(cell => `${cell % stage.cols * 64 + 32},${Math.floor(cell / stage.cols) * 64 + 32}`).join(' ');
  return <div className="lb-bee">
    <div className="lb-board-note">인사한 꽃길 <b>{state.length} / {flowers}</b><span>벌집은 맨 마지막에</span></div>
    <div className="lb-bee-frame">
      <svg className="lb-flower-path" viewBox={`0 0 ${stage.cols * 64} ${stage.rows * 64}`} aria-hidden="true"><polyline points={points} /></svg>
      <div className="lb-grid lb-bee-grid" style={boardStyle(stage)} role="group" aria-label="한 번씩 방문하는 꽃길">
        {stage.terrain!.map((open, cell) => {
          const visited = state.includes(cell), goal = stage.goal[0] === cell, legal = !!act(stage, state, cell);
          return <Tile key={cell} label={`${location(stage, cell)}, ${!open ? '풀밭, 길 없음' : cell === last ? '꿀벌 보리' : goal ? '벌집, 맨 마지막에 도착해요' : visited ? '인사한 꽃길' : '아직 방문하지 않은 꽃'}${legal ? ', 여기로 날아가기' : ''}`} onClick={open && !visited ? () => onAction(cell) : undefined} disabled={disabled || !legal} className={`lb-bee-cell${!open ? ' lb-bee-grass' : ''}${visited ? ' lb-bee-visited' : ''}${legal ? ' lb-bee-next' : ''}${hint === cell ? ' lb-hint' : ''}`}>
            {cell === last ? <Toy kind="bee" /> : goal ? <Toy kind="hive" /> : open && !visited ? <Toy kind="flower" /> : open ? <span className="lb-flower-visited" aria-hidden="true">✓</span> : <span className="lb-grass" aria-hidden="true">⌁</span>}
            {cell === stage.start[0] && <span className="lb-start-marker" aria-hidden="true">출발</span>}
          </Tile>;
        })}
      </div>
    </div>
    <p className="lb-caption">테두리가 반짝이는 이웃 꽃으로 날아가 보세요.</p>
  </div>;
}

function BridgesBoard({ stage, state, onAction, hint, disabled }: LabBoardProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [note, setNote] = useState('섬 하나를 누르고, 이어 줄 이웃 섬을 눌러요.');
  const pattern = useId().replace(/:/g, '');
  const counts = degrees(stage, state);
  const hintEdge = hint === null ? null : Math.floor(hint / 3);
  useEffect(() => { setSelected(null); }, [state, hint]);
  const xy = (cell: number) => [cell % stage.cols * 64 + 32, Math.floor(cell / stage.cols) * 64 + 32];
  const choose = (i: number) => {
    if (selected === null) { setSelected(i); setNote(`${i + 1}번 섬을 골랐어요. 이어 줄 이웃 섬을 눌러요.`); return; }
    if (selected === i) { setSelected(null); setNote('선택을 풀었어요. 섬 하나를 골라 주세요.'); return; }
    const edge = stage.edges!.findIndex(([a, b]) => a === selected && b === i || a === i && b === selected);
    if (edge < 0) { setSelected(i); setNote('같은 가로·세로줄의 이웃 섬끼리 이을 수 있어요. 새 섬을 골랐어요.'); return; }
    const next = (state[edge] + 1) % 3;
    if (!act(stage, state, edge * 3 + next)) { setNote('다리가 서로 교차해요. 먼저 가로막는 다리를 지워 보세요.'); return; }
    setNote(next ? `${selected + 1}번과 ${i + 1}번 섬 사이에 다리 ${next}개를 놓았어요.` : '두 섬 사이의 다리를 지웠어요.');
    onAction(edge * 3 + next); setSelected(null);
  };
  return <div className="lb-bridges">
    <div className="lb-board-note">숫자를 맞춘 섬 <b>{counts.filter((n, i) => n === stage.islands![i].need).length} / {counts.length}</b><span>모든 섬을 하나로 이어요</span></div>
    <div className="lb-pond" style={{ aspectRatio: `${stage.cols} / ${stage.rows}` }} role="group" aria-label="수달의 연못 다리">
      <svg className="lb-pond-lines" viewBox={`0 0 ${stage.cols * 64} ${stage.rows * 64}`} aria-hidden="true">
        <defs><pattern id={`pond-${pattern}`} width="64" height="64" patternUnits="userSpaceOnUse"><path d="M6 18 q7-7 14 0 t14 0" fill="none" stroke="#91c8c1" strokeWidth="1.5" opacity=".5" /></pattern></defs>
        <rect width="100%" height="100%" fill={`url(#pond-${pattern})`} />
        {stage.edges!.map(([a, b], edge) => {
          const [x1, y1] = xy(stage.islands![a].at), [x2, y2] = xy(stage.islands![b].at);
          const count = state[edge], horizontal = y1 === y2;
          const picked = selected === a || selected === b;
          return <g key={edge} className={`${hintEdge === edge ? 'lb-hint-bridge' : ''}`}>
            {count === 0 && (picked || hintEdge === edge) && <line x1={x1} x2={x2} y1={y1} y2={y2} className="lb-bridge-possible" />}
            {Array.from({ length: count }, (_, k) => {
              const offset = count === 2 ? k * 10 - 5 : 0;
              return <g key={k}><line x1={x1 + (horizontal ? 0 : offset)} x2={x2 + (horizontal ? 0 : offset)} y1={y1 + (horizontal ? offset : 0)} y2={y2 + (horizontal ? offset : 0)} className="lb-bridge-shadow" /><line x1={x1 + (horizontal ? 0 : offset)} x2={x2 + (horizontal ? 0 : offset)} y1={y1 + (horizontal ? offset : 0)} y2={y2 + (horizontal ? offset : 0)} className="lb-bridge-plank" /></g>;
            })}
          </g>;
        })}
      </svg>
      {stage.islands!.map((island, i) => {
        const [x, y] = xy(island.at);
        const atHint = hintEdge !== null && stage.edges![hintEdge].includes(i);
        const done = counts[i] === island.need;
        return <button key={i} type="button" className={`lb-island${selected === i ? ' lb-picked' : ''}${done ? ' lb-island-done' : ''}${counts[i] > island.need ? ' lb-island-over' : ''}${atHint ? ' lb-hint' : ''}`} style={{ left: `${x / (stage.cols * 64) * 100}%`, top: `${y / (stage.rows * 64) * 100}%` }} onClick={() => choose(i)} disabled={disabled} aria-pressed={selected === i} aria-label={`${i + 1}번 섬, 필요한 다리 ${island.need}개, 현재 ${counts[i]}개${done ? ', 숫자를 맞췄어요' : ''}`}>
          <span className="lb-island-id">{i + 1}번</span><strong>{island.need}</strong><span className="lb-island-count">{counts[i]} / {island.need}{done ? ' ✓' : ''}</span>
        </button>;
      })}
    </div>
    <p className="lb-caption lb-bridge-note" aria-live="polite">{note}</p>
    <div className="lb-bridge-key"><span><i /> 다리 1개</span><span><i className="lb-key-double" /> 다리 2개</span><span>한 번 더 이으면 지워요</span></div>
  </div>;
}

/** Controlled board: history, persistence, completion and asynchronous hints belong to LabScreen. */
export function LabBoard(props: LabBoardProps) {
  switch (props.stage.kind) {
    case 'acorn': case 'twins': return <MovementBoard {...props} />;
    case 'lights': return <LightsBoard {...props} />;
    case 'coral': return <CoralBoard {...props} />;
    case 'cloud': return <CloudBoard {...props} />;
    case 'balance': return <BalanceBoard {...props} />;
    case 'moon': return <MoonBoard {...props} />;
    case 'mosaic': return <MosaicBoard {...props} />;
    case 'bee': return <BeeBoard {...props} />;
    case 'bridges': return <BridgesBoard {...props} />;
  }
}
