import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { type Stars, TWO_STAR_SLACK, starsFor } from '../engine/stars';
import { type Intro, IntroCard } from '../ui/IntroCard';
import { useLook } from '../ui/look';
import { StarRow } from '../ui/StageSelect';
import { isMuted, play, setMuted } from '../ui/sound';
import { type Blocked, DepotBoard } from './DepotBoard';
import { type DepotStage, GONE, type Move } from './model';
import { type DepotState, type Run, addRun, applyMove, canMove, dropRun, initialState, isWon, openRun, reach, stateKey } from './slide';
import { hintFrom } from './solver';

interface Props {
  stage: DepotStage;
  hasNext: boolean;
  bestStars: number;
  /** "New thing" card for a stage that brings in a mechanic. */
  intro?: Intro;
  onBack: () => void;
  onNext: () => void;
  onCleared: (id: string, stars: Stars) => void;
  /** Extra line on the clear card (e.g. the daily streak). */
  clearNote?: string;
}

const LEAVE_MS = 650;

export function DepotScreen({ stage, hasNext, bestStars, intro, onBack, onNext, onCleared, clearNote }: Props) {
  const look = useLook();
  const bonus = stage.limit !== undefined;
  const limit = stage.limit ?? 0;
  const [showIntro, setShowIntro] = useState(!!intro && bestStars === 0);
  const [state, setState] = useState<DepotState>(() => initialState(stage));
  const [runs, setRuns] = useState<Run[]>([]);
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false);
  const [won, setWon] = useState(false);
  const [late, setLate] = useState(false);
  const [earned, setEarned] = useState<Stars>(1);
  const [hinted, setHinted] = useState(false);
  const [hint, setHint] = useState<{ move: Move; at: string } | null>(null);
  const [toast, setToast] = useState<{ text: string; n: number } | null>(null);
  const [muted, setMutedState] = useState(isMuted);
  const counter = useRef(0);
  const timers = useRef<number[]>([]);
  const moves = runs.length;

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const say = (text: string) => setToast({ text, n: ++counter.current });
  const key = stateKey(state);
  const shownHint = hint && hint.at === key ? hint.move : null;

  const commit = (m: Move) => {
    if (busy || won || late) return;
    if (!canMove(stage, state, m)) {
      play('bump');
      return;
    }
    const open = openRun(runs);
    const sameRun = !!open && open.vehicle === m.vehicle;
    if (bonus && !sameRun && runs.length >= limit) {
      // Out of moves: the departure time has passed.
      play('deny');
      setLate(true);
      return;
    }
    const next = applyMove(state, m);
    const nextRuns = addRun(runs, state, m);
    setRuns(nextRuns);
    setState(next);
    setSelected(m.vehicle);
    play(m.to === GONE ? 'depart' : 'slide');
    if (isWon(stage, next)) {
      setBusy(true);
      const n = nextRuns.length;
      timers.current.push(
        window.setTimeout(() => {
          const stars = starsFor(n, stage.par, hinted);
          setEarned(stars);
          setWon(true);
          setBusy(false);
          onCleared(stage.id, stars);
          play('arrive');
          timers.current.push(window.setTimeout(() => play('pop'), 600));
          (['star1', 'star2', 'star3'] as const).slice(0, stars).forEach((sfx, i) => {
            timers.current.push(window.setTimeout(() => play(sfx), 1700 + i * 250));
          });
        }, LEAVE_MS),
      );
    } else if (m.to === GONE) {
      // One locomotive is out; pick the next one still in the yard.
      const other = stage.vehicles.findIndex((v, i) => v.kind === 'loco' && next[i] !== GONE);
      if (other >= 0) setSelected(other);
    }
  };

  const undoMove = () => {
    if (busy || won || bonus || runs.length === 0) return;
    setState(runs[runs.length - 1].before);
    setRuns(dropRun);
    play('rotate');
  };
  const restart = (keepHint = false) => {
    if (busy) return;
    setState(initialState(stage));
    setRuns([]);
    setWon(false);
    setLate(false);
    setSelected(0);
    if (!keepHint) {
      setHinted(false);
      setHint(null);
    }
    play('erase');
  };
  const showHint = () => {
    if (busy || won || late) return;
    // Knowing the run in progress, the hint counts moves exactly as the screen does.
    const m = hintFrom(stage, state, openRun(runs));
    if (!m) return;
    setHinted(true);
    setHint({ move: m, at: key });
    setSelected(m.vehicle);
    play('pickup');
  };

  const select = (v: number) => {
    setSelected(v);
    play('rotate');
  };
  const tapCell = (cell: number) => {
    // A tap in line with the chosen vehicle rolls it there, as far as the way is clear.
    const v = stage.vehicles[selected];
    if (!v || state[selected] === GONE) return;
    const x = cell % stage.width;
    const y = Math.floor(cell / stage.width);
    if ((v.horizontal ? y : x) !== v.line) return;
    const p = v.horizontal ? x : y;
    const at = state[selected];
    const want = p < at ? p : p - v.len + 1;
    const r = reach(stage, state, selected);
    const to = Math.max(r.min, Math.min(r.max, want));
    if (to === at) play('bump');
    else commit({ vehicle: selected, to });
  };
  const blocked = (why: Blocked) => {
    if (why === 'barrier') {
      play('deny');
      say('차단기가 닫혀 있어요. 다른 차를 노란 버튼 위에 세워 두면 열려요.');
    } else play('bump');
  };

  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  keyRef.current = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      undoMove();
      return;
    }
    const dir = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'].indexOf(e.key);
    if (dir >= 0) {
      e.preventDefault();
      const v = stage.vehicles[selected];
      if (!v || state[selected] === GONE || v.horizontal !== (dir === 1 || dir === 3)) {
        play('bump');
        return;
      }
      const step = dir === 1 || dir === 2 ? 1 : -1;
      const r = reach(stage, state, selected);
      const to = state[selected] + step;
      if (to >= r.min && to <= r.max) commit({ vehicle: selected, to });
      else if (r.canLeave && v.exit === dir) commit({ vehicle: selected, to: GONE });
      else play('bump');
      return;
    }
    // Letters pick a vehicle: r and b the locomotives, A, B, … the wagons.
    const pick = stage.vehicles.findIndex((v, i) => state[i] !== GONE && v.glyph === e.key);
    const wagon = stage.vehicles.findIndex((v, i) => state[i] !== GONE && v.kind !== 'loco' && v.glyph === e.key.toUpperCase());
    if (pick >= 0) select(pick);
    else if (wagon >= 0) select(wagon);
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const toggleMute = () => {
    setMuted(!muted);
    setMutedState(!muted);
  };
  const left = limit - moves;

  return (
    <div className="game world-depot">
      <header className="game-head">
        <button className="icon-btn" onClick={onBack} aria-label="스테이지 목록">
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M15 5 L8 12 L15 19" />
          </svg>
        </button>
        <div className="game-title">
          <span className="stage-no">
            {stage.label ?? `STAGE ${stage.number}`}
            {bonus && <span className="tag tag-bonus">보너스</span>}
          </span>
          <h1>{stage.title}</h1>
        </div>
        <div className="head-actions">
          <button className="icon-btn" onClick={toggleMute} aria-label={muted ? '소리 켜기' : '소리 끄기'} aria-pressed={muted}>
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M4 9.5 H7.5 L12 5.5 V18.5 L7.5 14.5 H4 Z" />
              {muted ? <path d="M16 9.5 L21 14.5 M21 9.5 L16 14.5" /> : <path d="M15.5 9 Q17.5 12 15.5 15 M18 6.5 Q22 12 18 17.5" />}
            </svg>
          </button>
          {!bonus && (
            <button className="icon-btn" onClick={undoMove} disabled={busy || won || moves === 0} aria-label="되돌리기">
              <svg viewBox="0 0 24 24" aria-hidden>
                <path d="M9 7 L4 12 L9 17 M4 12 H14 A6 6 0 0 1 14 24" transform="translate(1 -3)" />
              </svg>
            </button>
          )}
          <button className="icon-btn" onClick={() => restart(true)} disabled={busy || (moves === 0 && !late)} aria-label="처음으로">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M19 12 A7 7 0 1 1 16.5 6.6 M17 2.5 V7 H12.5" />
            </svg>
          </button>
        </div>
      </header>

      {bonus ? (
        <div className="robot-bar depot-bar" aria-live="polite">
          <svg viewBox="-50 -50 100 100" className="robot-face" aria-hidden>
            <circle r={40} fill="#fff" stroke="#2E6F8E" strokeWidth={8} />
            <path d="M0 -24 V0 L16 10" stroke="#2E3445" strokeWidth={7} fill="none" strokeLinecap="round" />
            <circle r={5} fill="#E5584F" />
          </svg>
          <div className="robot-text">
            <strong>{won ? '제시간에 출발!' : late ? '출발 시각이 지났어요…' : `출발 시각! ${limit}번 안에 기관차를 내보내요.`}</strong>
            <div className="battery" aria-label={`남은 이동 ${Math.max(0, left)}번`}>
              {Array.from({ length: limit }, (_, k) => (
                <i key={k} className={k < left || won ? 'on' : ''} />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <p className="tip">{stage.tip}</p>
      )}

      <div className="board-wrap">
        <DepotBoard
          stage={stage}
          state={state}
          look={look}
          selected={selected}
          won={won}
          hint={busy ? null : shownHint}
          guide={stage.id === 'dp-first-push' && moves === 0 && !won ? stage.solution[0] : null}
          locked={busy || won || late}
          onMove={commit}
          onSelect={select}
          onTapCell={tapCell}
          onBlocked={blocked}
        />
        {toast && (
          <div key={toast.n} className="toast" role="status">
            {toast.text}
          </div>
        )}
      </div>

      <div className="status-row">
        <button className="hint-btn" onClick={showHint} disabled={busy || won || late} aria-label="힌트 보기">
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M9 18 H15 M10 21 H14 M12 3 A6 6 0 0 0 8 13.5 C8.8 14.3 9 15 9 16 H15 C15 15 15.2 14.3 16 13.5 A6 6 0 0 0 12 3 Z" />
          </svg>
          힌트
        </button>
        <div className="status" aria-live="polite">
          <span>
            이동 <b>{moves}</b>번 ·{' '}
            <span className="par">
              ★★★ {stage.par} · ★★ {stage.par + TWO_STAR_SLACK}번 이하
            </span>
            {hinted && <span className="hinted"> · 힌트 사용(최대 ★★)</span>}
          </span>
        </div>
      </div>

      {late && (
        <div className="overlay" role="dialog" aria-label="출발 시각이 지났어요">
          <div className="result-card">
            <p className="result-kicker">보너스 스테이지</p>
            <h2>출발 시각이 지났어요!</h2>
            <p className="result-sub">이동 {limit}번을 다 썼어요. 다시 해 볼까요? (실패해도 괜찮아요)</p>
            <div className="result-actions">
              <button className="primary" onClick={() => restart(false)} autoFocus>
                다시 도전
              </button>
              <button className="secondary" onClick={onBack}>
                스테이지 목록
              </button>
            </div>
          </div>
        </div>
      )}

      {won && (
        <div className="overlay" role="dialog" aria-label="스테이지 클리어">
          <div className="result-card">
            <div className="confetti" aria-hidden>
              {Array.from({ length: 18 }, (_, i) => (
                <i key={i} style={{ '--i': i } as CSSProperties} />
              ))}
            </div>
            <button className="icon-btn result-close" onClick={onBack} aria-label="스테이지 목록으로">
              <svg viewBox="0 0 24 24" aria-hidden>
                <path d="M6 6 L18 18 M18 6 L6 18" />
              </svg>
            </button>
            <p className="result-kicker">{stage.label}</p>
            <StarRow count={earned} className="result-stars" />
            <h2>{hasNext || clearNote ? '출발 성공!' : '차고지 정복!'}</h2>
            <p className="result-sub">
              이동 {moves}번 · ★★★ {stage.par}번 · ★★ {stage.par + TWO_STAR_SLACK}번
              {earned < 3 && !hinted && (
                <>
                  <br />
                  {stage.par}번 만에 도전해 보세요!
                </>
              )}
              {hinted && (
                <>
                  <br />
                  힌트 없이 처음부터 다시 하면 ★★★에 도전할 수 있어요.
                </>
              )}
              {clearNote && (
                <>
                  <br />
                  <strong className="clear-note">{clearNote}</strong>
                </>
              )}
              {bestStars > earned && (
                <>
                  <br />
                  최고 기록: 별 {bestStars}개
                </>
              )}
            </p>
            <div className="result-actions">
              {hasNext ? (
                <button className="primary" onClick={onNext} autoFocus>
                  다음 스테이지
                </button>
              ) : (
                <button className="primary" onClick={onBack} autoFocus>
                  스테이지 목록
                </button>
              )}
              <div className="result-retry">
                <button className="secondary" onClick={() => restart(false)}>
                  처음부터 다시
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showIntro && intro && <IntroCard intro={intro} onClose={() => setShowIntro(false)} />}
    </div>
  );
}
