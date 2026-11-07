import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { type Stars, TWO_STAR_SLACK, starsFor } from '../engine/stars';
import { type Intro, IntroCard } from '../ui/IntroCard';
import { StarRow } from '../ui/StageSelect';
import { isMuted, play, setMuted } from '../ui/sound';
import { ClockBoard } from './ClockBoard';
import { ClockFace } from './ClockArt';
import { type Action, type ClockStage, REST } from './model';
import { explore, nextAction } from './solver';
import { type ClockState, act, blockUp, cellOf, initialState, isWon, reversedOf, turnOf, whyNot } from './tick';
import { useFitBoard } from '../ui/useFitBoard';

interface Props {
  stage: ClockStage;
  hasNext: boolean;
  /** Every other stage of the world is cleared, so clearing this one finishes the world. */
  allCleared: boolean;
  bestStars: number;
  /** "New thing" card for a stage that brings in a mechanic. */
  intro?: Intro;
  onBack: () => void;
  onNext: () => void;
  onCleared: (id: string, stars: Stars) => void;
  /** Extra line on the clear card (e.g. the daily streak). */
  clearNote?: string;
}

/** One tick of the tower: the state, plus how far the hands and the mouse have turned on screen. */
interface Tick {
  s: ClockState;
  /** Quarter turns of the hands so far (back for reversed ticks), so they never spin the long way. */
  spin: number;
  /** The mouse's heading in quarter turns, also kept unwrapped. */
  facing: number;
}

const DIR_LABEL = ['위로', '오른쪽으로', '아래로', '왼쪽으로'];

export function ClockScreen({ stage, hasNext, allCleared, bestStars, intro, onBack, onNext, onCleared, clearNote }: Props) {
  const gameRef = useFitBoard<HTMLDivElement>();
  const bonus = stage.limit !== undefined;
  const limit = stage.limit ?? 0;
  const [showIntro, setShowIntro] = useState(!!intro && bestStars === 0);
  const [history, setHistory] = useState<Tick[]>(() => [{ s: initialState(stage), spin: 0, facing: 0 }]);
  const now = history[history.length - 1];
  const ticks = history.length - 1;
  const [busy, setBusy] = useState(false);
  const [won, setWon] = useState(false);
  const [late, setLate] = useState(false);
  const [earned, setEarned] = useState<Stars>(1);
  const [hinted, setHinted] = useState(false);
  const [hint, setHint] = useState<{ a: Action; at: ClockState } | null>(null);
  const [toast, setToast] = useState<{ text: string; n: number } | null>(null);
  const [muted, setMutedState] = useState(isMuted);
  const timers = useRef<number[]>([]);
  const counter = useRef(0);

  // Every state the tower can be in from the start, mapped once: hints, and dead ends at a glance.
  const graph = useMemo(() => explore(stage), [stage]);
  const stuck = !isWon(stage, now.s) && !graph.toWin.has(now.s);
  const shownHint = hint && hint.at === now.s ? hint.a : null;

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);
  const say = (text: string) => setToast({ text, n: ++counter.current });

  const go = (a: Action) => {
    if (busy || won || late || showIntro) return;
    const next = act(stage, now.s, a);
    if (next < 0) {
      const why = whyNot(stage, now.s, a);
      if (why === 'block') {
        play('deny');
        say(a === REST ? '여기는 다음 똑딱에 블록이 올라와요! 비켜야 해요.' : '그 칸은 다음 똑딱에 블록이 올라와요.');
      } else if (why === 'hand') {
        play('deny');
        say(a === REST ? '시계 바늘이 이리로 와요! 비켜야 해요.' : '시계 바늘이 지나갈 자리예요.');
      } else play('bump');
      return;
    }
    const spin = now.spin + (reversedOf(now.s) ? -1 : 1);
    // Turn the mouse the short way round to face its step.
    const facing = a === REST ? now.facing : now.facing + ((((a - now.facing) % 4) + 5) % 4) - 1;
    setHistory((h) => [...h, { s: next, spin, facing }]);
    if (a !== REST && stage.tiles[cellOf(next)].t === 'lever') play('swish');
    else play(a === REST ? 'rotate' : 'place');
    if (isWon(stage, next)) {
      setBusy(true);
      const n = ticks + 1;
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
        }, 550),
      );
    } else if (bonus && ticks + 1 >= limit) {
      // The midnight bell rings.
      setBusy(true);
      timers.current.push(
        window.setTimeout(() => {
          setBusy(false);
          setLate(true);
          play('deny');
        }, 400),
      );
    }
  };

  const undo = () => {
    if (busy || won || bonus || ticks === 0) return;
    setHistory((h) => h.slice(0, -1));
    play('rotate');
  };
  const restart = (keepHint = false) => {
    if (busy) return;
    setHistory([{ s: initialState(stage), spin: 0, facing: 0 }]);
    setWon(false);
    setLate(false);
    if (!keepHint) {
      setHinted(false);
      setHint(null);
    }
    play('erase');
  };
  const showHint = () => {
    if (busy || won || late || stuck) return;
    const a = nextAction(graph, now.s);
    if (a === null) return;
    setHinted(true);
    setHint({ a, at: now.s });
    play('pickup');
  };

  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  keyRef.current = (e: KeyboardEvent) => {
    // A card is open: its buttons take Enter and Space themselves.
    if (showIntro || won || late) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      undo();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const arrow = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'].indexOf(e.key);
    const letter = ['w', 'd', 's', 'a'].indexOf(e.key.toLowerCase());
    const d = arrow >= 0 ? arrow : letter;
    if (d >= 0) {
      e.preventDefault();
      go(d as Action);
    } else if (e.key === ' ' || e.key === '.' || e.key === 'Enter') {
      e.preventDefault();
      // A focused button would otherwise take the same key as a click as well (some browsers).
      if (document.activeElement instanceof HTMLButtonElement) document.activeElement.blur();
      go(REST);
    }
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
  const left = limit - ticks;
  const locked = busy || won || late;
  const colors = ([0, 1] as const).filter((c) => stage.tiles.some((t) => t.t === 'block' && t.color === c));
  const nextTurn = (turnOf(now.s) + (reversedOf(now.s) ? 3 : 1)) & 3;

  return (
    <div className="game world-clock" ref={gameRef}>
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
            {stage.boss && <span className="tag tag-boss">보스</span>}
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
            <button className="icon-btn" onClick={undo} disabled={locked || ticks === 0} aria-label="되돌리기">
              <svg viewBox="0 0 24 24" aria-hidden>
                <path d="M9 7 L4 12 L9 17 M4 12 H14 A6 6 0 0 1 14 24" transform="translate(1 -3)" />
              </svg>
            </button>
          )}
          <button className="icon-btn" onClick={() => restart(true)} disabled={busy || (ticks === 0 && !late)} aria-label="처음으로">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M19 12 A7 7 0 1 1 16.5 6.6 M17 2.5 V7 H12.5" />
            </svg>
          </button>
        </div>
      </header>

      {bonus ? (
        <div className="robot-bar clock-bar" aria-live="polite">
          <svg viewBox="-50 -50 100 100" className="robot-face" aria-hidden>
            <ClockFace hour={Math.min(12, Math.round((ticks / Math.max(1, limit)) * 12))} />
          </svg>
          <div className="robot-text">
            <strong>{won ? '종이 울리기 전에 도착!' : late ? '댕~ 자정의 종이 울렸어요…' : `자정의 종! ${limit}번 안에 문까지 가요.`}</strong>
            <div className="battery" aria-label={`남은 똑딱 ${Math.max(0, left)}번`}>
              {Array.from({ length: limit }, (_, k) => (
                <i key={k} className={k < left || won ? 'on' : ''} />
              ))}
            </div>
          </div>
        </div>
      ) : stuck ? (
        <p className="tip clock-stuck" role="status">
          앗, 여기서는 문까지 갈 수 없어요! ↶ 되돌리기나 ↻ 처음으로를 눌러 봐요.
        </p>
      ) : (
        <p className="tip">{stage.tip}</p>
      )}

      <div className="board-wrap">
        <ClockBoard
          stage={stage}
          cell={cellOf(now.s)}
          turn={turnOf(now.s)}
          reversed={!!reversedOf(now.s)}
          spin={now.spin}
          facing={now.facing}
          won={won}
          hint={busy ? null : shownHint}
          guide={stage.number === 1 && ticks === 0 && !won && !showIntro ? stage.solution[0] : null}
          locked={locked}
          onAct={go}
        />
        {toast && (
          <div key={toast.n} className="toast" role="status">
            {toast.text}
          </div>
        )}
      </div>

      <div className="status-row">
        <button className="hint-btn" onClick={showHint} disabled={locked || stuck} aria-label="힌트 보기">
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M9 18 H15 M10 21 H14 M12 3 A6 6 0 0 0 8 13.5 C8.8 14.3 9 15 9 16 H15 C15 15 15.2 14.3 16 13.5 A6 6 0 0 0 12 3 Z" />
          </svg>
          힌트
        </button>
        <div className="status" aria-live="polite">
          <span>
            {colors.length > 0 && (
              <span className="clock-next">
                다음 똑딱:
                {colors.map((c) => (
                  <span key={c} className={`clock-next-${c}`}>
                    {' '}
                    <i aria-hidden /> {c === 0 ? '빨강' : '파랑'} {blockUp(c, nextTurn) ? '↑' : '↓'}
                  </span>
                ))}{' '}
                ·{' '}
              </span>
            )}
            똑딱 <b>{ticks}</b>번 ·{' '}
            <span className="par">
              ★★★ {stage.par} · ★★ {stage.par + TWO_STAR_SLACK}번 이하
            </span>
            {hinted && <span className="hinted"> · 힌트 사용(최대 ★★)</span>}
          </span>
        </div>
      </div>

      <div className="dock clock-dock">
        <div className="dpad space-dpad clock-dpad" aria-label="생쥐 움직이기">
          {([0, 3, 1, 2] as Action[]).map((d) => (
            <button key={d} className={`dpad-btn dpad-${d} ${shownHint === d && !busy ? 'hinted' : ''}`} onClick={() => go(d)} disabled={locked} aria-label={`${DIR_LABEL[d]} 한 칸`}>
              <svg viewBox="0 0 24 24" aria-hidden style={{ transform: `rotate(${d * 90}deg)` }}>
                <path d="M12 4 L20 14 H15 V20 H9 V14 H4 Z" />
              </svg>
            </button>
          ))}
        </div>
        <button className={`clock-rest ${shownHint === REST && !busy ? 'hinted' : ''}`} onClick={() => go(REST)} disabled={locked} aria-label="쉬기 (한 박자 기다리기)">
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M7 3 H17 M7 21 H17 M8 3 C8 8 12 10 12 12 C12 14 8 16 8 21 M16 3 C16 8 12 10 12 12 C12 14 16 16 16 21" />
          </svg>
          쉬기
        </button>
      </div>

      {late && (
        <div className="overlay" role="dialog" aria-label="자정의 종이 울렸어요">
          <div className="result-card">
            <p className="result-kicker">보너스 스테이지</p>
            <h2>댕~ 종이 울렸어요!</h2>
            <p className="result-sub">똑딱 {limit}번을 다 썼어요. 다시 해 볼까요? (실패해도 괜찮아요)</p>
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
            <h2>{!hasNext && allCleared && !clearNote ? '시계탑 여행 완료!' : stage.boss ? '보스 격파!' : '치즈 도착!'}</h2>
            <p className="result-sub">
              똑딱 {ticks}번 · ★★★ {stage.par}번 · ★★ {stage.par + TWO_STAR_SLACK}번
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
