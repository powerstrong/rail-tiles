import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { ALL_DIRS, type Dir } from '../engine/dir';
import { type Stars, TWO_STAR_SLACK, starsFor } from '../engine/stars';
import { type Intro, IntroCard } from '../ui/IntroCard';
import { StarRow } from '../ui/StageSelect';
import { isMuted, play, setMuted } from '../ui/sound';
import { type SpaceState, after, initialState, isWon, press, stateKey } from './gravity';
import type { SpaceStage } from './model';
import { CapsuleArt } from './SpaceArt';
import { SpaceBoard } from './SpaceBoard';
import { hintFrom } from './solver';
import { useWinMap } from './useWinMap';
import { useFitBoard } from '../ui/useFitBoard';

interface Props {
  stage: SpaceStage;
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

/** How long each phase of a press (gravity, booster, wormhole) takes on screen. */
const PHASE_MS = 170;
const DIR_LABEL = ['위', '오른쪽', '아래', '왼쪽'];

export function SpaceScreen({ stage, hasNext, allCleared, bestStars, intro, onBack, onNext, onCleared, clearNote }: Props) {
  const gameRef = useFitBoard<HTMLDivElement>();
  const bonus = stage.limit !== undefined;
  const limit = stage.limit ?? 0;
  const [showIntro, setShowIntro] = useState(!!intro && bestStars === 0);
  /** Every state so far, the start first: undo pops one. */
  const [history, setHistory] = useState<SpaceState[]>(() => [initialState(stage)]);
  const state = history[history.length - 1];
  const presses = history.length - 1;
  const [shown, setShown] = useState<number[]>(() => initialState(stage));
  /** Bumps per capsule each time it comes out of a wormhole (replays the pop), and who just did. */
  const [warps, setWarps] = useState<number[]>(() => stage.capsules.map(() => 0));
  const [warping, setWarping] = useState<boolean[]>(() => stage.capsules.map(() => false));
  const [busy, setBusy] = useState(false);
  const [won, setWon] = useState(false);
  const [outOfAir, setOutOfAir] = useState(false);
  const [earned, setEarned] = useState<Stars>(1);
  const [hinted, setHinted] = useState(false);
  const [hint, setHint] = useState<{ dir: Dir; at: string } | null>(null);
  const [muted, setMutedState] = useState(isMuted);
  const timers = useRef<number[]>([]);
  /** Presses made while a booster or wormhole is still playing out: they wait their turn. */
  const queue = useRef<Dir[]>([]);
  const playingUntil = useRef(0);

  // Every layout the capsules can reach, mapped off the main thread once the stage is showing:
  // hints, and a word when the capsules can no longer dock.
  const winMap = useWinMap(stage);
  const key = stateKey(state);
  const stuck = !!winMap && !winMap.has(key);
  const shownHint = hint && hint.at === key ? hint.dir : null;

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    playingUntil.current = 0;
  };
  /** Stops everything, waiting presses too (undo, restart, leaving). */
  const stopAll = () => {
    clearTimers();
    queue.current = [];
  };
  useEffect(() => stopAll, []);
  /** Runs the next waiting press once the one before has played out. */
  const drain = () => {
    playingUntil.current = 0;
    const next = queue.current.shift();
    if (next === undefined) return;
    runRef.current(next);
    // A plain gravity press or a bump plays nothing out: give the screen a beat, then the rest.
    if (queue.current.length > 0 && playingUntil.current === 0) {
      playingUntil.current = performance.now() + PHASE_MS;
      timers.current.push(window.setTimeout(drain, PHASE_MS));
    }
  };

  const go = (d: Dir) => {
    if (busy || won || outOfAir || showIntro) return;
    if (performance.now() < playingUntil.current) {
      if (queue.current.length < 2) queue.current.push(d);
      return;
    }
    run(d);
  };
  const runRef = useRef(go);
  runRef.current = go;

  const run = (d: Dir) => {
    const p = press(stage, state, d);
    if (p.frames.length === 0) {
      play('bump');
      return;
    }
    if (bonus && presses >= limit) {
      play('deny');
      setOutOfAir(true);
      return;
    }
    // Play the press back phase by phase. A booster or wormhole takes a moment, and presses made
    // meanwhile wait for it (a plain gravity press is instant, so quick taps stay quick).
    clearTimers();
    p.frames.forEach((f, i) => {
      const show = () => {
        setShown(f.at);
        // Only the frame a capsule comes out of a wormhole snaps; every other move glides.
        setWarping(f.kind === 'warp' ? f.moved : stage.capsules.map(() => false));
        if (f.kind === 'warp') setWarps((w) => w.map((n, k) => (f.moved[k] ? n + 1 : n)));
        play(f.kind === 'gravity' ? 'slide' : f.kind === 'boost' ? 'swish' : 'pop');
      };
      if (i === 0) show();
      else timers.current.push(window.setTimeout(show, i * PHASE_MS));
    });
    if (p.frames.length > 1) {
      const wait = (p.frames.length - 1) * PHASE_MS + 60;
      playingUntil.current = performance.now() + wait;
      timers.current.push(window.setTimeout(drain, wait));
    }
    const next = p.next;
    setHistory((h) => [...h, next]);
    // A little chirp when a capsule settles onto its own dock (the win has its own fanfare).
    const docked = next.some((c, k) => c === stage.docks[k] && state[k] !== stage.docks[k]);
    if (docked && !isWon(stage, next)) timers.current.push(window.setTimeout(() => play('thanks'), p.frames.length * PHASE_MS));
    if (isWon(stage, next)) {
      setBusy(true);
      const n = presses + 1;
      timers.current.push(
        window.setTimeout(
          () => {
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
          },
          p.frames.length * PHASE_MS + 450,
        ),
      );
    } else if (bonus && presses + 1 >= limit) {
      // That was the last breath of air.
      setBusy(true);
      timers.current.push(
        window.setTimeout(
          () => {
            setBusy(false);
            setOutOfAir(true);
            play('deny');
          },
          p.frames.length * PHASE_MS + 350,
        ),
      );
    }
  };

  const undo = () => {
    if (busy || won || bonus || presses === 0) return;
    stopAll();
    const prev = history[history.length - 2];
    setHistory((h) => h.slice(0, -1));
    setShown(prev);
    setWarping(stage.capsules.map(() => false));
    play('rotate');
  };
  const restart = (keepHint = false) => {
    if (busy && !outOfAir) return;
    stopAll();
    setHistory([initialState(stage)]);
    setShown(initialState(stage));
    // New elements at the start: nobody glides back across the station.
    setWarps((w) => w.map((n) => n + 1));
    setWarping(stage.capsules.map(() => false));
    setBusy(false);
    setWon(false);
    setOutOfAir(false);
    if (!keepHint) {
      setHinted(false);
      setHint(null);
    }
    play('erase');
  };
  const showHint = () => {
    if (busy || won || outOfAir || stuck) return;
    const d = winMap ? nextPress(state) : hintFrom(stage, state);
    if (d === null) return;
    setHinted(true);
    setHint({ dir: d, at: key });
    play('pickup');
  };
  /** The press that brings the capsules one step closer to docking, from the mapped layouts. */
  const nextPress = (s: SpaceState): Dir | null => {
    const dist = winMap?.get(stateKey(s));
    if (!winMap || dist === undefined || dist === 0) return null;
    return ALL_DIRS.find((d) => winMap.get(stateKey(after(stage, s, d))) === dist - 1) ?? null;
  };

  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  keyRef.current = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      undo();
      return;
    }
    const arrow = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'].indexOf(e.key);
    const letter = ['w', 'd', 's', 'a'].indexOf(e.key.toLowerCase());
    const d = arrow >= 0 ? arrow : letter;
    if (d >= 0 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      go(d as Dir);
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
  const left = limit - presses;
  const docked = state.filter((c, k) => c === stage.docks[k]).length;
  const locked = busy || won || outOfAir;

  return (
    <div className="game world-space" ref={gameRef}>
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
            <button className="icon-btn" onClick={undo} disabled={locked || presses === 0} aria-label="되돌리기">
              <svg viewBox="0 0 24 24" aria-hidden>
                <path d="M9 7 L4 12 L9 17 M4 12 H14 A6 6 0 0 1 14 24" transform="translate(1 -3)" />
              </svg>
            </button>
          )}
          <button className="icon-btn" onClick={() => restart(true)} disabled={busy || (presses === 0 && !outOfAir)} aria-label="처음으로">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M19 12 A7 7 0 1 1 16.5 6.6 M17 2.5 V7 H12.5" />
            </svg>
          </button>
        </div>
      </header>

      {bonus ? (
        <div className="robot-bar space-bar" aria-live="polite">
          <svg viewBox="-50 -56 100 106" className="robot-face" aria-hidden>
            <CapsuleArt capsule={0} docked={won} />
          </svg>
          <div className="robot-text">
            <strong>{won ? '무사히 도킹!' : outOfAir ? '산소가 다 떨어졌어요…' : `산소가 부족해! ${limit}번 안에 모두 도킹해요.`}</strong>
            <div className="battery" aria-label={`남은 산소 ${Math.max(0, left)}번`}>
              {Array.from({ length: limit }, (_, k) => (
                <i key={k} className={k < left || won ? 'on' : ''} />
              ))}
            </div>
          </div>
        </div>
      ) : stuck ? (
        <p className="tip space-stuck" role="status">
          앗, 이대로는 도킹할 수 없어요! ↶ 되돌리기나 ↻ 처음으로를 눌러 봐요.
        </p>
      ) : (
        <p className="tip">{stage.tip}</p>
      )}

      <div className="board-wrap">
        <SpaceBoard
          stage={stage}
          shown={shown}
          warps={warps}
          warping={warping}
          won={won}
          hint={busy ? null : shownHint}
          guide={stage.number === 1 && presses === 0 && !won && !showIntro ? stage.solution[0] : null}
          locked={locked}
          onPress={go}
        />
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
            {stage.capsules.length > 1 && (
              <span className="riders">
                도킹 {docked}/{stage.capsules.length} ·{' '}
              </span>
            )}
            중력 <b>{presses}</b>번 ·{' '}
            <span className="par">
              ★★★ {stage.par} · ★★ {stage.par + TWO_STAR_SLACK}번 이하
            </span>
            {hinted && <span className="hinted"> · 힌트 사용(최대 ★★)</span>}
          </span>
        </div>
      </div>

      <div className="dock space-dock">
        <div className="dpad space-dpad" aria-label="중력 버튼">
          {([0, 3, 1, 2] as Dir[]).map((d) => (
            <button key={d} className={`dpad-btn dpad-${d} ${shownHint === d && !busy ? 'hinted' : ''}`} onClick={() => go(d)} disabled={locked} aria-label={`중력 ${DIR_LABEL[d]}`}>
              <svg viewBox="0 0 24 24" aria-hidden style={{ transform: `rotate(${d * 90}deg)` }}>
                <path d="M12 4 L20 14 H15 V20 H9 V14 H4 Z" />
              </svg>
            </button>
          ))}
        </div>
      </div>

      {outOfAir && (
        <div className="overlay" role="dialog" aria-label="산소가 다 떨어졌어요">
          <div className="result-card">
            <p className="result-kicker">보너스 스테이지</p>
            <h2>산소가 다 떨어졌어요!</h2>
            <p className="result-sub">중력 버튼 {limit}번을 다 썼어요. 다시 해 볼까요? (실패해도 괜찮아요)</p>
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
            <h2>{!hasNext && allCleared && !clearNote ? '우주 정거장 여행 완료!' : stage.boss ? '보스 격파!' : '도킹 성공!'}</h2>
            <p className="result-sub">
              중력 {presses}번 · ★★★ {stage.par}번 · ★★ {stage.par + TWO_STAR_SLACK}번
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
