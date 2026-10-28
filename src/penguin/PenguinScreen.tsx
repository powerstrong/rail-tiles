import { type Intro, IntroCard } from '../ui/IntroCard';
import { type CSSProperties, useEffect, useRef, useState } from 'react';
import type { Dir } from '../engine/dir';
import { type Stars, TWO_STAR_SLACK, starsFor } from '../engine/stars';
import { StarRow } from '../ui/StageSelect';
import { isMuted, play, setMuted } from '../ui/sound';
import { sample, timeline } from './animate';
import { PENGUIN_COLORS, PenguinArt } from './IceArt';
import { ICE_CELL, IceBoard } from './IceBoard';
import type { PenguinStage, Push } from './model';
import { type IceState, initialState, isWon, slide } from './slide';
import { hintFrom } from './solver';

interface Props {
  stage: PenguinStage;
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

const DIR_LABEL = ['위', '오른쪽', '아래', '왼쪽'];

export function PenguinScreen({ stage, hasNext, bestStars, intro, onBack, onNext, onCleared, clearNote }: Props) {
  const [showIntro, setShowIntro] = useState(!!intro && bestStars === 0);
  const [state, setState] = useState<IceState>(() => initialState(stage));
  const [history, setHistory] = useState<IceState[]>([]);
  const [moves, setMoves] = useState(0);
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false);
  const [won, setWon] = useState(false);
  const [earned, setEarned] = useState<Stars>(1);
  const [hinted, setHinted] = useState(false);
  const [hint, setHint] = useState<{ push: Push; at: string } | null>(null);
  const [liveFish, setLiveFish] = useState(0);
  const [liveBroken, setLiveBroken] = useState(0);
  const [toast, setToast] = useState<{ text: string; n: number } | null>(null);
  const [muted, setMutedState] = useState(isMuted);
  const penguinRefs = useRef<(SVGGElement | null)[]>([]);
  const frame = useRef(0);
  const counter = useRef(0);
  const timers = useRef<number[]>([]);

  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      timers.current.forEach(clearTimeout);
    },
    [],
  );
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  const say = (text: string) => setToast({ text, n: ++counter.current });
  const stateTag = `${state.pos.join(',')}|${state.fish}|${state.broken}`;
  const shownHint = hint && hint.at === stateTag ? hint.push : null;
  const fishLeft = stage.fish.length - popcount(busy ? liveFish : state.fish);

  const place = (k: number, x: number, y: number, s: number) =>
    penguinRefs.current[k]?.setAttribute('transform', `translate(${(x * ICE_CELL).toFixed(1)} ${(y * ICE_CELL).toFixed(1)}) scale(${s.toFixed(3)})`);

  const push = (p: Push) => {
    if (busy || won) return;
    const r = slide(stage, state, p);
    if (r.outcome === 'blocked') {
      play('bump');
      say(`그쪽(${DIR_LABEL[p.dir]})으로는 갈 수 없어요.`);
      return;
    }
    if (r.outcome === 'spin') {
      play('bump');
      say('해류가 빙글빙글 돌기만 해요.');
      return;
    }
    const from = state.pos[p.penguin];
    const { keys, events, duration } = timeline(stage, from, r.beats);
    setBusy(true);
    setSelected(p.penguin);
    setLiveFish(state.fish);
    setLiveBroken(state.broken);
    play('slide');
    let next = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = (now - t0) / 1000;
      const at = sample(keys, t);
      place(p.penguin, at.x, at.y, at.s);
      while (next < events.length && events[next].at <= t) {
        const e = events[next++];
        if (e.kind === 'fish') {
          play('pickup');
          setLiveFish((f) => f | (1 << e.index));
        } else if (e.kind === 'crack') setLiveBroken((b) => b | (1 << e.index));
        else if (e.kind === 'igloo') play('igloo');
        else if (e.kind === 'turn') play('swish');
        else if (e.kind === 'snow') play('erase');
        else if (e.kind === 'fall') play('splash');
      }
      if (t < duration) {
        frame.current = requestAnimationFrame(tick);
        return;
      }
      if (r.outcome === 'fell') {
        // Splash, then the penguin pops back where it was: a fall costs nothing.
        timers.current.push(
          window.setTimeout(() => {
            const c = state.pos[p.penguin];
            place(p.penguin, (c % stage.width) + 0.5, Math.floor(c / stage.width) + 0.5, 1);
            setBusy(false);
            say('풍덩! 바다에 빠졌어요. 다른 길을 찾아봐요.');
          }, 250),
        );
        return;
      }
      play('bump');
      const after = r.state;
      const c = after.pos[p.penguin];
      place(p.penguin, (c % stage.width) + 0.5, Math.floor(c / stage.width) + 0.5, 1);
      setHistory((h) => [...h, state]);
      setState(after);
      const n = moves + 1;
      setMoves(n);
      setBusy(false);
      if (isWon(stage, after)) {
        const stars = starsFor(n, stage.par, hinted);
        setEarned(stars);
        setWon(true);
        onCleared(stage.id, stars);
        play('arrive');
        timers.current.push(window.setTimeout(() => play('pop'), 600));
        (['star1', 'star2', 'star3'] as const).slice(0, stars).forEach((sfx, i) => {
          timers.current.push(window.setTimeout(() => play(sfx), 1700 + i * 250));
        });
      }
    };
    frame.current = requestAnimationFrame(tick);
  };

  const undoMove = () => {
    if (busy || won || history.length === 0) return;
    setState(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
    setMoves((m) => m - 1);
    play('rotate');
  };
  const restart = (keepHint = false) => {
    if (busy) return;
    setState(initialState(stage));
    setHistory([]);
    setMoves(0);
    setWon(false);
    if (!keepHint) {
      setHinted(false);
      setHint(null);
    }
    play('erase');
  };
  const showHint = () => {
    if (busy || won) return;
    const h = hintFrom(stage, state);
    if (!h) {
      say('이 상태에서는 이길 수 없어요. 되돌리기를 눌러 보세요.');
      return;
    }
    setHinted(true);
    setHint({ push: h, at: stateTag });
    setSelected(h.penguin);
    play('pickup');
  };

  const onTap = (cell: number) => {
    const k = state.pos.indexOf(cell);
    if (k >= 0) {
      setSelected(k);
      play('rotate');
      return;
    }
    // Tapping a spot in line with the chosen penguin pushes it that way.
    const at = state.pos[selected];
    const [ax, ay, bx, by] = [at % stage.width, Math.floor(at / stage.width), cell % stage.width, Math.floor(cell / stage.width)];
    if (ax === bx) push({ penguin: selected, dir: by < ay ? 0 : 2 });
    else if (ay === by) push({ penguin: selected, dir: bx > ax ? 1 : 3 });
  };
  const onSwipe = (from: number, dir: Dir) => {
    const k = state.pos.indexOf(from);
    push({ penguin: k >= 0 ? k : selected, dir });
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
      push({ penguin: selected, dir: dir as Dir });
    } else if (['1', '2', '3'].includes(e.key) && Number(e.key) <= stage.penguins.length) setSelected(Number(e.key) - 1);
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

  return (
    <div className="game world-ice">
      <header className="game-head">
        <button className="icon-btn" onClick={onBack} aria-label="스테이지 목록">
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M15 5 L8 12 L15 19" />
          </svg>
        </button>
        <div className="game-title">
          <span className="stage-no">{stage.label ?? `STAGE ${stage.number}`}</span>
          <h1>{stage.title}</h1>
        </div>
        <div className="head-actions">
          <button className="icon-btn" onClick={toggleMute} aria-label={muted ? '소리 켜기' : '소리 끄기'} aria-pressed={muted}>
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M4 9.5 H7.5 L12 5.5 V18.5 L7.5 14.5 H4 Z" />
              {muted ? <path d="M16 9.5 L21 14.5 M21 9.5 L16 14.5" /> : <path d="M15.5 9 Q17.5 12 15.5 15 M18 6.5 Q22 12 18 17.5" />}
            </svg>
          </button>
          <button className="icon-btn" onClick={undoMove} disabled={busy || won || history.length === 0} aria-label="되돌리기">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M9 7 L4 12 L9 17 M4 12 H14 A6 6 0 0 1 14 24" transform="translate(1 -3)" />
            </svg>
          </button>
          <button className="icon-btn" onClick={() => restart(true)} disabled={busy || moves === 0} aria-label="처음으로">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M19 12 A7 7 0 1 1 16.5 6.6 M17 2.5 V7 H12.5" />
            </svg>
          </button>
        </div>
      </header>

      <p className="tip">{stage.tip}</p>

      <div className="board-wrap">
        <IceBoard
          stage={stage}
          pos={state.pos}
          fish={busy ? liveFish : state.fish}
          broken={busy ? liveBroken : state.broken}
          selected={selected}
          won={won}
          hint={busy ? null : shownHint}
          guide={stage.id === 'ice-first-slide' && moves === 0 && !busy && !won ? stage.solution[0] : null}
          penguinRefs={penguinRefs}
          onTap={onTap}
          onSwipe={onSwipe}
          locked={busy || won}
        />
        {toast && (
          <div key={toast.n} className="toast" role="status">
            {toast.text}
          </div>
        )}
      </div>

      <div className="status-row">
        <button className="hint-btn" onClick={showHint} disabled={busy || won} aria-label="힌트 보기">
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M9 18 H15 M10 21 H14 M12 3 A6 6 0 0 0 8 13.5 C8.8 14.3 9 15 9 16 H15 C15 15 15.2 14.3 16 13.5 A6 6 0 0 0 12 3 Z" />
          </svg>
          힌트
        </button>
        <div className="status" aria-live="polite">
          <span>
            {stage.fish.length > 0 && <span className="riders">물고기 {fishLeft}마리 남음 · </span>}
            밀기 <b>{moves}</b>번 ·{' '}
            <span className="par">
              ★★★ {stage.par} · ★★ {stage.par + TWO_STAR_SLACK}번 이하
            </span>
            {hinted && <span className="hinted"> · 힌트 사용(최대 ★★)</span>}
          </span>
        </div>
      </div>

      <div className="dock ice-dock">
        {stage.penguins.length > 1 && (
          <div className="penguin-pick-row" role="radiogroup" aria-label="펭귄 고르기">
            {stage.penguins.map((_, k) => (
              <button
                key={k}
                role="radio"
                aria-checked={selected === k}
                aria-label={`펭귄 ${k + 1}`}
                className={`tool penguin-chip ${selected === k ? 'selected' : ''}`}
                style={{ '--chip': PENGUIN_COLORS[k] } as CSSProperties}
                onClick={() => setSelected(k)}
                disabled={busy || won}
              >
                <svg viewBox="-45 -50 90 100" aria-hidden>
                  <PenguinArt color={PENGUIN_COLORS[k]} />
                </svg>
              </button>
            ))}
          </div>
        )}
        <div className="dpad" aria-label="미끄러지기">
          {([0, 3, 1, 2] as Dir[]).map((d) => (
            <button key={d} className={`dpad-btn dpad-${d}`} onClick={() => push({ penguin: selected, dir: d })} disabled={busy || won} aria-label={`${DIR_LABEL[d]}으로 밀기`}>
              <svg viewBox="0 0 24 24" aria-hidden style={{ transform: `rotate(${d * 90}deg)` }}>
                <path d="M12 5 L19 14 H5 Z" />
              </svg>
            </button>
          ))}
        </div>
      </div>

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
            <h2>{hasNext || clearNote ? '도착 성공!' : '얼음 나라 정복!'}</h2>
            <p className="result-sub">
              밀기 {moves}번 · ★★★ {stage.par}번 · ★★ {stage.par + TWO_STAR_SLACK}번
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

function popcount(n: number): number {
  let c = 0;
  for (let v = n; v; v &= v - 1) c++;
  return c;
}
