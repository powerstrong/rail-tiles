import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { type Stars, TWO_STAR_SLACK, starsFor } from '../engine/stars';
import { type Intro, IntroCard } from '../ui/IntroCard';
import { StarRow } from '../ui/StageSelect';
import { type Sfx, isMuted, play, setMuted } from '../ui/sound';
import { useFitBoard } from '../ui/useFitBoard';
import { GiftIcon, PITCH, SLOT } from './CargoArt';
import { CargoBoard, type Drop, type Leaving, type LineView } from './CargoBoard';
import { type CargoStage, KINDS, type Kind, type Move } from './model';
import { nextMoveBy, useWinMap } from './useWinMap';
import { type YardState, initialState, isWon, keyOf, move, movesFrom, phases, tiedUp, whyNot } from './yard';

interface Props {
  stage: CargoStage;
  hasNext: boolean;
  allCleared: boolean;
  bestStars: number;
  intro?: Intro;
  onBack: () => void;
  onNext: () => void;
  onCleared: (id: string, stars: Stars) => void;
  clearNote?: string;
}

/** One move of the game: the yard, the wagons' ids in line order, and the gifts sent so far. */
interface Entry {
  s: YardState;
  ids: number[];
  sent: Kind[];
}

const DROP_MS = 340;
const LEAVE_MS = 640;
const CHAIN_SFX: Sfx[] = ['depart', 'star1', 'star2', 'star3'];

/** Korean object particle for a gift name (을/를). */
const obj = (name: string) => {
  const c = name.charCodeAt(name.length - 1) - 0xac00;
  return c >= 0 && c % 28 ? '을' : '를';
};

export function CargoScreen({ stage, hasNext, allCleared, bestStars, intro, onBack, onNext, onCleared, clearNote }: Props) {
  const gameRef = useFitBoard<HTMLDivElement>();
  const bonus = stage.chain !== undefined;
  const goal = stage.chain ?? 0;
  const tallest = Math.max(...stage.sizes);
  const first = (): Entry => ({ s: initialState(stage), ids: stage.sizes.map((_, i) => i), sent: [] });
  const [showIntro, setShowIntro] = useState(!!intro && bestStars === 0);
  const [history, setHistory] = useState<Entry[]>(() => [first()]);
  const now = history[history.length - 1];
  const moves = history.length - 1;
  const [selected, setSelected] = useState<number | null>(null);
  const [anim, setAnim] = useState<{ view: LineView; drop: Drop | null; leaving: Leaving | null } | null>(null);
  const [trips, setTrips] = useState(0);
  const [flash, setFlash] = useState<{ wagon: number; n: number } | null>(null);
  const [won, setWon] = useState(false);
  /** The last train has left and the clear card is on its way: nothing may change the yard now. */
  const [ending, setEnding] = useState(false);
  const [earned, setEarned] = useState<Stars>(1);
  const [hinted, setHinted] = useState(false);
  const [hint, setHint] = useState<{ m: Move; at: string } | null>(null);
  const [toast, setToast] = useState<{ text: string; n: number } | null>(null);
  const [muted, setMutedState] = useState(isMuted);
  const timers = useRef<number[]>([]);
  const counter = useRef(0);
  const nextId = useRef(stage.sizes.length);

  const winMap = useWinMap(stage);
  const key = useMemo(() => keyOf(now.s), [now]);
  const busy = anim !== null || ending;
  const stuck = !!winMap && !isWon(stage, now.s) && !winMap.has(key);
  const shownHint = hint && hint.at === key && !busy ? hint.m : null;
  const boardKinds = stage.board;
  const done = boardKinds.length - now.s.left.length;
  const nextKind = now.s.left.length ? (Number(now.s.left[0]) as Kind) : null;
  const blocked = boardKinds.length > 0 && nextKind !== null && tiedUp(now.s.w[0], now.s.sizes[0]) && Number(now.s.w[0][0]) !== nextKind;

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);
  const say = (text: string) => setToast({ text, n: ++counter.current });
  const later = (ms: number, f: () => void) => timers.current.push(window.setTimeout(f, ms));

  const view: LineView = anim?.view ?? { w: now.s.w, sizes: now.s.sizes, ids: now.ids, left: now.s.left };
  const locked = busy || won || showIntro;

  const finish = (entry: Entry) => {
    setHistory((h) => [...h, entry]);
    setAnim(null);
    if (!isWon(stage, entry.s)) return;
    const n = moves + 1;
    setEnding(true);
    later(250, () => {
      const stars = starsFor(n, stage.par, hinted);
      setEarned(stars);
      setWon(true);
      setEnding(false);
      onCleared(stage.id, stars);
      play('arrive');
      later(600, () => play('pop'));
      (['star1', 'star2', 'star3'] as const).slice(0, stars).forEach((sfx, i) => later(1700 + i * 250, () => play(sfx)));
    });
  };

  const doMove = (m: Move) => {
    const [a, b] = m;
    const ph = phases(stage, now.s, m)!;
    const step = move(stage, now.s, m)!;
    const fromLen = now.s.w[a].length;
    const toLen = now.s.w[b].length;
    const drop: Drop = { to: b, n: ph.carried, dx: (a - b) * PITCH, dy: (toLen - (fromLen - ph.carried)) * SLOT, key: ++counter.current };
    setSelected(null);
    setAnim({ view: { w: ph.landed.w, sizes: ph.landed.sizes, ids: now.ids, left: ph.landed.left }, drop, leaving: null });
    play('place');
    let ids = now.ids;
    let line: LineView = { w: ph.landed.w, sizes: ph.landed.sizes, ids, left: ph.landed.left };
    ph.after.forEach((st, k) => {
      later(DROP_MS + k * LEAVE_MS, () => {
        const leaving: Leaving = { id: ids[0], w: line.w[0], size: line.sizes[0], key: ++counter.current };
        ids = [...ids.slice(1), nextId.current++];
        line = { w: st.w, sizes: st.sizes, ids, left: st.left };
        setAnim({ view: line, drop: null, leaving });
        play(CHAIN_SFX[Math.min(k, CHAIN_SFX.length - 1)]);
        if (k === 0) later(120, () => play('chuff'));
        if (k === 1) say('줄줄이 출발! 🚂🚂');
        if (k >= 2) say(`줄줄이 출발! ${'🚂'.repeat(k + 1)}`);
      });
    });
    const total = ph.after.length ? DROP_MS + ph.after.length * LEAVE_MS : DROP_MS;
    later(total, () => {
      if (ph.after.length) setTrips((t) => t + 1);
      finish({ s: step.next, ids, sent: [...now.sent, ...step.departed.map((d) => d.kind)] });
    });
  };

  const tap = (i: number) => {
    if (locked) return;
    const s = now.s;
    if (selected === null) {
      if (!s.w[i].length) {
        play('bump');
        say('빈 화차예요. 선물이 실린 화차를 먼저 골라요.');
      } else if (tiedUp(s.w[i], s.sizes[i])) {
        play('bump');
        setFlash({ wagon: i, n: ++counter.current });
        say(i === 0 && blocked ? `리본으로 묶여서 꺼낼 수 없어요. 전광판 다음 차례는 ${KINDS[nextKind!].name}예요!` : '리본으로 묶여서 꺼낼 수 없어요. 자기 차례가 오면 떠나요!');
      } else {
        setSelected(i);
        play('pickup');
      }
      return;
    }
    if (i === selected) {
      setSelected(null);
      play('rotate');
      return;
    }
    const why = whyNot(s, [selected, i]);
    if (!why) {
      doMove([selected, i]);
      return;
    }
    play('deny');
    if (why === 'full') say('그 화차는 꽉 찼어요.');
    else if (why === 'kind') say(`같은 선물 위나 빈 화차에만 내려놓을 수 있어요.`);
  };

  const undo = () => {
    if (busy || won || moves === 0) return;
    setHistory((h) => h.slice(0, -1));
    setSelected(null);
    play('rotate');
  };
  const restart = (keepHint = false) => {
    if (anim || ending) return;
    setHistory([first()]);
    setSelected(null);
    setWon(false);
    if (!keepHint) {
      setHinted(false);
      setHint(null);
    }
    play('erase');
  };
  const showHint = () => {
    if (locked || stuck || !winMap) return;
    const m = nextMoveBy(stage, winMap, now.s);
    if (!m) return;
    setHinted(true);
    setSelected(null);
    setHint({ m, at: key });
    play('pickup');
  };

  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  keyRef.current = (e: KeyboardEvent) => {
    if (showIntro || won) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      undo();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const d = Number(e.key);
    if (d >= 1 && d <= now.s.w.length) {
      e.preventDefault();
      tap(d - 1);
    } else if (e.key === 'Escape' && selected !== null) {
      setSelected(null);
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

  const guide = stage.number === 1 && moves < stage.solution.length && !won && !showIntro && !hinted ? stage.solution[moves] : null;
  const chainSoFar = Math.max(now.s.chain, 0);
  const stuckText = stuck ? stuckReason(stage, now.s, goal) : '';

  return (
    <div className="game world-cargo" ref={gameRef}>
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
          <button className="icon-btn" onClick={undo} disabled={busy || won || moves === 0} aria-label="되돌리기">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M9 7 L4 12 L9 17 M4 12 H14 A6 6 0 0 1 14 24" transform="translate(1 -3)" />
            </svg>
          </button>
          <button className="icon-btn" onClick={() => restart(true)} disabled={busy || won || moves === 0} aria-label="처음으로">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M19 12 A7 7 0 1 1 16.5 6.6 M17 2.5 V7 H12.5" />
            </svg>
          </button>
        </div>
      </header>

      {stuck && !busy ? (
        <p className="tip cargo-stuck" role="status">
          {stuckText}
        </p>
      ) : bonus ? (
        <div className="robot-bar cargo-bar" aria-live="polite">
          <span className="cargo-bar-icon" aria-hidden>
            🎉
          </span>
          <div className="robot-text">
            <strong>{chainSoFar >= goal ? `${goal}대 줄줄이 성공! 이제 남은 선물을 보내요.` : `축제 기차! 한 번에 ${goal}대를 줄줄이 출발시켜요.`}</strong>
            <div className="battery" aria-label={`줄줄이 출발 ${chainSoFar}대 / ${goal}대`}>
              {Array.from({ length: goal }, (_, k) => (
                <i key={k} className={k < chainSoFar ? 'on' : ''} />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <p className="tip">{stage.tip}</p>
      )}

      {boardKinds.length > 0 && (
        <div className="cargo-departures" aria-label={nextKind !== null ? `출발 전광판: 다음은 ${KINDS[nextKind].name}` : '출발 전광판: 모두 출발'}>
          <span className="cargo-departures-title">출발</span>
          <ol>
            {boardKinds.map((k, i) => (
              <li key={i} className={i < done ? 'gone' : i === done ? 'now' : ''}>
                <svg viewBox="-24 -24 48 48" aria-hidden>
                  <GiftIcon kind={k} />
                  {i < done && <path d="M-12 1 L-3 10 L14 -9" stroke="#2F9A4B" strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
                </svg>
              </li>
            ))}
          </ol>
          <span className="cargo-departures-next">{nextKind !== null ? `${KINDS[nextKind].to}행` : '모두 출발!'}</span>
        </div>
      )}

      <div className="board-wrap">
        <CargoBoard
          flash={flash}
          view={view}
          tallest={tallest}
          selected={busy ? null : selected}
          hint={shownHint ?? (selected === null && !busy ? guide : null)}
          drop={anim?.drop ?? null}
          leaving={anim?.leaving ?? null}
          trips={trips}
          blocked={blocked && !busy}
          won={won}
          locked={locked}
          onTap={tap}
        />
        {toast && (
          <div key={toast.n} className="toast" role="status">
            {toast.text}
          </div>
        )}
      </div>

      <div className="cargo-sent" aria-label={`보낸 선물 ${now.sent.length}칸`}>
        {bonus && (
          <span className={`cargo-goal${chainSoFar >= goal ? ' done' : ''}`}>
            🎉 줄줄이 {chainSoFar}/{goal}대
          </span>
        )}
        {now.sent.length === 0 ? (
          <span className="cargo-sent-empty">
            {selected !== null ? `${KINDS[Number(now.s.w[selected].slice(-1)) as Kind].name}${obj(KINDS[Number(now.s.w[selected].slice(-1)) as Kind].name)} 어디로 옮길까요?` : '화차를 눌러 맨 위 선물을 들어요.'}
          </span>
        ) : (
          now.sent.map((k, i) => (
            <svg key={i} viewBox="-24 -24 48 48" className="cargo-sent-car" aria-hidden style={{ '--i': i } as CSSProperties}>
              <rect x={-22} y={-20} width={44} height={36} rx={7} fill={KINDS[k].dark} />
              <rect x={-19} y={-17} width={38} height={30} rx={5} fill="#FFFBF2" />
              <g transform="translate(0 -2) scale(0.62)">
                <GiftIcon kind={k} />
              </g>
            </svg>
          ))
        )}
      </div>

      <div className="status-row">
        <button className="hint-btn" onClick={showHint} disabled={locked || stuck || !winMap} aria-label="힌트 보기">
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M9 18 H15 M10 21 H14 M12 3 A6 6 0 0 0 8 13.5 C8.8 14.3 9 15 9 16 H15 C15 15 15.2 14.3 16 13.5 A6 6 0 0 0 12 3 Z" />
          </svg>
          힌트
        </button>
        <div className="status" aria-live="polite">
          <span>
            크레인 <b>{moves}</b>번 ·{' '}
            <span className="par">
              ★★★ {stage.par} · ★★ {stage.par + TWO_STAR_SLACK}번 이하
            </span>
            {hinted && <span className="hinted"> · 힌트 사용(최대 ★★)</span>}
          </span>
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
            <h2>{!hasNext && allCleared && !clearNote ? '선물 화물역 여행 완료!' : stage.boss ? '보스 격파!' : '선물 배달 출발!'}</h2>
            <p className="result-sub">
              크레인 {moves}번 · ★★★ {stage.par}번 · ★★ {stage.par + TWO_STAR_SLACK}번
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


/** One line on why the yard can no longer be cleared, for the stuck message. */
function stuckReason(stage: CargoStage, s: YardState, goal: number): string {
  const back = ' ↶ 되돌려 볼까요?';
  const next = s.left.length ? (Number(s.left[0]) as Kind) : null;
  if (stage.board.length && next !== null && tiedUp(s.w[0], s.sizes[0]) && Number(s.w[0][0]) !== next) return `앗, 맨 앞 화차가 전광판 차례와 달라요! 지금은 ${KINDS[next].name} 차례예요.${back}`;
  if (goal && s.w.every((w) => !w.length)) return `선물은 다 보냈지만 ${goal}대 줄줄이 출발은 아직이에요! ↶ 되돌리기나 ↻ 처음으로를 눌러 봐요.`;
  if (!movesFrom(s).length) return `앗, 더 옮길 수 있는 곳이 없어요!${back}`;
  if (stage.board.length) {
    for (let k = 0; k < 6; k++) {
      const left = s.w.join('').split(String(k)).length - 1;
      if (left && !s.left.includes(String(k))) return `${KINDS[k].name} 기차는 이제 없는데 ${KINDS[k].name}${obj(KINDS[k].name)} 다 못 보냈어요!${back}`;
    }
  }
  if (s.w.some((w, i) => i > 0 && tiedUp(w, s.sizes[i]))) return `리본 화차들이 자리를 차지해서 더 정리할 수 없어요.${back}`;
  return `앗, 이대로는 선물을 다 보낼 수 없어요!${back}`;
}
