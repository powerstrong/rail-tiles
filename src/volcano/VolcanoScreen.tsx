import { type CSSProperties, memo, useEffect, useMemo, useRef, useState } from 'react';
import { type Stars, TWO_STAR_SLACK, starsFor } from '../engine/stars';
import { type Intro, IntroCard } from '../ui/IntroCard';
import { StarRow } from '../ui/StageSelect';
import { isMuted, play, setMuted } from '../ui/sound';
import { type RaceState, flow, hintLava, isHot, placeable, raceStart, raceStep, solveLava, solveRace, spreadOnce } from './lava';
import { NO_LIMIT, type VolcanoStage, cellName } from './model';
import { CraterArt, EggArt, GrassTile, HotTile, HouseArt, LavaArt, RockArt, SeaArt, StoneArt, VO, VillagerArt } from './VolcanoArt';

const CELL = 100;
const PAD = 20;
const STEP_MS = 170;

interface Props {
  stage: VolcanoStage;
  hasNext: boolean;
  bestStars: number;
  intro?: Intro;
  onBack: () => void;
  onNext: () => void;
  onCleared: (id: string, stars: Stars) => void;
}

const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

const Ground = memo(function Ground({ stage }: { stage: VolcanoStage }) {
  const w = stage.width * CELL;
  const h = stage.height * CELL;
  return (
    <g>
      <defs>
        <radialGradient id="lava-glow">
          <stop offset="0" stopColor={VO.lavaHot} stopOpacity={0.55} />
          <stop offset="1" stopColor={VO.lavaDark} stopOpacity={0.35} />
        </radialGradient>
      </defs>
      <rect x={-PAD + 2} y={-PAD + 8} width={w + PAD * 2} height={h + PAD * 2} rx={26} fill={VO.frameDark} />
      <rect x={-PAD} y={-PAD} width={w + PAD * 2} height={h + PAD * 2} rx={26} fill={VO.frame} />
      <rect x={-PAD + 8} y={-PAD + 5} width={w + PAD * 2 - 16} height={5} rx={2.5} fill={VO.frameHi} />
      {stage.tiles.map((t, i) => (
        <g key={i} transform={`translate(${(i % stage.width) * CELL + 50} ${Math.floor(i / stage.width) * CELL + 50})`}>
          {t.t === 'sea' ? <SeaArt /> : t.t === 'grass' && isHot(stage, i) ? <HotTile /> : <GrassTile seed={hash(i)} />}
        </g>
      ))}
    </g>
  );
});

type Phase = 'build' | 'flow' | 'fail' | 'won';

export function VolcanoScreen({ stage, hasNext, bestStars, intro, onBack, onNext, onCleared }: Props) {
  const race = !!stage.race;
  const solutions = useMemo(() => (race ? [] : solveLava(stage).solutions), [stage, race]);
  const [stones, setStones] = useState<Set<number>>(() => new Set());
  const [phase, setPhase] = useState<Phase>('build');
  /** Lava arrival step per cell, for the eruption being shown. */
  const [times, setTimes] = useState<number[] | null>(null);
  const [step, setStep] = useState(0);
  const [failNote, setFailNote] = useState('');
  const [earned, setEarned] = useState<Stars>(1);
  const [hinted, setHinted] = useState(false);
  const [hint, setHint] = useState<{ cell: number; remove: boolean } | null>(null);
  const [muted, setMutedState] = useState(isMuted);
  const [showIntro, setShowIntro] = useState(!!intro && bestStars === 0);
  // Race stages: where the lava is now, and when each cell was reached (for the pop-in).
  const [raceState, setRaceState] = useState<RaceState>(() => raceStart(stage));
  const [born, setBorn] = useState<Map<number, number>>(() => new Map());
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (ms: number, f: () => void) => timers.current.push(window.setTimeout(f, ms));

  const used = race ? raceState.stones.size : stones.size;
  const shownStones = race ? raceState.stones : stones;

  const win = (n: number) => {
    const stars = starsFor(n, stage.par, hinted);
    setEarned(stars);
    onCleared(stage.id, stars);
    later(700, () => {
      setPhase('won');
      play('arrive');
      (['star1', 'star2', 'star3'] as const).slice(0, stars).forEach((sfx, i) => later(1700 + i * 250, () => play(sfx)));
    });
  };

  // ------------------------------------------------------------------ calm stages

  const tapCell = (cell: number) => {
    if (phase !== 'build') return;
    if (race) return raceTap(cell);
    if (!placeable(stage, cell)) {
      play('bump');
      return;
    }
    setStones((s) => {
      const n = new Set(s);
      if (n.has(cell)) {
        n.delete(cell);
        play('erase');
      } else {
        n.add(cell);
        play('pop');
      }
      return n;
    });
  };

  const erupt = () => {
    if (phase !== 'build' || race) return;
    const f = flow(stage, stones);
    const last = Math.max(...f.time);
    setTimes(f.time);
    setStep(0);
    setPhase('flow');
    setHint(null);
    play('swish');
    for (let t = 1; t <= last; t++) {
      later(t * STEP_MS, () => {
        setStep(t);
        const hit = stage.houses.some((h) => f.time[h] === t);
        const hatch = stage.eggs.some((e) => f.time[e] === t);
        play(hit ? 'crash' : hatch ? 'thanks' : 'slide');
      });
    }
    later(last * STEP_MS + 350, () => {
      if (f.won) win(stones.size);
      else {
        setFailNote(f.burned.length ? '앗! 집에 용암이 닿았어요.' : '알이 아직 차가워요. 용암이 알까지 가야 해요.');
        setPhase('fail');
      }
    });
  };

  const cool = () => {
    timers.current.forEach(clearTimeout);
    setTimes(null);
    setStep(0);
    setPhase('build');
  };

  // ------------------------------------------------------------------ race stages

  const raceTap = (cell: number) => {
    const r = raceStep(stage, raceState, cell);
    if (!r) {
      play('bump');
      return;
    }
    play('pop');
    const turn = r.state.stones.size;
    setRaceState(r.state);
    setBorn((b) => new Map([...b, ...r.spread.map((c) => [c, turn] as [number, number])]));
    setHint(null);
    if (r.spread.length) later(120, () => play('slide'));
    if (r.burned) {
      setPhase('flow');
      later(200, () => play('crash'));
      later(900, () => {
        setFailNote('앗! 집에 용암이 닿았어요.');
        setPhase('fail');
      });
    } else if (r.safe) {
      setPhase('flow');
      // The trapped lava fills up its pocket, then the village cheers.
      let s = r.state;
      let k = 0;
      for (;;) {
        const next = spreadOnce(stage, s);
        if (!next.spread.length) break;
        k++;
        const wave = next.spread;
        const at = turn + k;
        later(k * STEP_MS, () => setBorn((b) => new Map([...b, ...wave.map((c) => [c, at] as [number, number])])));
        s = next.state;
      }
      later(k * STEP_MS, () => win(turn));
    }
  };

  const restart = (keepHint: boolean) => {
    timers.current.forEach(clearTimeout);
    setStones(new Set());
    setRaceState(raceStart(stage));
    setBorn(new Map());
    setTimes(null);
    setStep(0);
    setPhase('build');
    if (!keepHint) {
      setHinted(false);
      setHint(null);
    }
    play('erase');
  };

  const showHint = () => {
    if (phase !== 'build') return;
    let h: { cell: number; remove: boolean } | null = null;
    if (race) {
      const r = solveRace(stage, raceState);
      if (r.first?.length) h = { cell: r.first[0], remove: false };
    } else h = hintLava(solutions, stones);
    if (!h) return;
    setHinted(true);
    setHint(h);
    play('pickup');
  };

  const toggleMute = () => {
    setMuted(!muted);
    setMutedState(!muted);
  };

  // What is lit up right now.
  const lavaAt = (cell: number): { on: boolean; fresh: boolean } => {
    if (race) {
      const b = born.get(cell);
      return b === undefined ? { on: false, fresh: false } : { on: true, fresh: true };
    }
    if (!times || times[cell] <= 0 || times[cell] > step) return { on: false, fresh: false };
    return { on: true, fresh: true };
  };
  const reached = (cell: number) => (race ? raceState.lava.has(cell) || born.has(cell) : !!times && times[cell] >= 0 && times[cell] <= step);
  const burning = stage.houses.some(reached);
  const erupting = race || phase === 'flow' || phase === 'fail';

  const w = stage.width * CELL;
  const h = stage.height * CELL;
  const shownHint = hint && (hint.remove ? shownStones.has(hint.cell) : !shownStones.has(hint.cell)) ? hint : null;

  return (
    <div className={`game world-volcano ${stage.boss ? 'is-boss' : ''} ${race ? 'is-bonus' : ''}`}>
      <header className="game-head">
        <button className="icon-btn" onClick={onBack} aria-label="스테이지 목록">
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M15 5 L8 12 L15 19" />
          </svg>
        </button>
        <div className="game-title">
          <span className="stage-no">
            {stage.label}
            {stage.boss && <span className="tag tag-boss">보스</span>}
            {race && <span className="tag tag-bonus">보너스</span>}
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
          <button className="icon-btn" onClick={() => restart(true)} disabled={used === 0 || phase === 'won'} aria-label="처음으로">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M19 12 A7 7 0 1 1 16.5 6.6 M17 2.5 V7 H12.5" />
            </svg>
          </button>
        </div>
      </header>

      {race ? (
        <div className="robot-bar lava-bar" aria-live="polite">
          <svg viewBox="-40 -48 80 86" className="robot-face" aria-hidden>
            <VillagerArt mood={phase === 'won' ? 'happy' : burning ? 'sad' : 'worried'} />
          </svg>
          <div className="robot-text">
            <strong>{phase === 'won' ? '살았다! 고마워!' : burning ? '앗, 뜨거워!' : '용암이 흘러와요! 돌을 하나 놓을 때마다 용암이 한 칸씩 번져요.'}</strong>
          </div>
        </div>
      ) : (
        <p className="tip">{stage.tip}</p>
      )}

      <div className="board-wrap">
        <svg className="board volcano-board" viewBox={`${-PAD} ${-PAD} ${w + PAD * 2} ${h + PAD * 2 + 8}`} role="grid" aria-label={`${stage.width}×${stage.height} 화산 섬`}>
          <Ground stage={stage} />
          {stage.tiles.map((t, i) => {
            const x = (i % stage.width) * CELL + 50;
            const y = Math.floor(i / stage.width) * CELL + 50;
            const lava = lavaAt(i);
            const tappable = phase === 'build' && placeable(stage, i) && !(race && raceState.lava.has(i));
            return (
              <g
                key={i}
                transform={`translate(${x} ${y})`}
                onClick={() => tapCell(i)}
                className={tappable ? 'tappable' : undefined}
                role={tappable ? 'button' : undefined}
                aria-label={tappable ? `${shownStones.has(i) ? '돌 치우기' : '돌 놓기'} ${cellName(stage, i)}` : undefined}
              >
                <rect x={-50} y={-50} width={100} height={100} fill="transparent" />
                {lava.on && t.t !== 'house' && <LavaArt fresh={lava.fresh} />}
                {t.t === 'rock' && <RockArt />}
                {t.t === 'crater' && <CraterArt volume={t.volume === NO_LIMIT ? null : t.volume} erupting={erupting} />}
                {t.t === 'house' && <HouseArt burned={reached(i)} />}
                {t.t === 'egg' && <EggArt hatched={reached(i)} />}
                {shownStones.has(i) && <StoneArt />}
                {shownHint?.cell === i && (
                  <circle r={40} fill="none" stroke={shownHint.remove ? '#E5584F' : '#F6C443'} strokeWidth={7} strokeDasharray={shownHint.remove ? '10 8' : undefined} className="mirror-hint" />
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="status-row">
        <button className="hint-btn" onClick={showHint} disabled={phase !== 'build'} aria-label="힌트 보기">
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M9 18 H15 M10 21 H14 M12 3 A6 6 0 0 0 8 13.5 C8.8 14.3 9 15 9 16 H15 C15 15 15.2 14.3 16 13.5 A6 6 0 0 0 12 3 Z" />
          </svg>
          힌트
        </button>
        <div className="status" aria-live="polite">
          <span>
            {stage.eggs.length > 0 && (
              <span className="riders">
                알 {stage.eggs.filter(reached).length}/{stage.eggs.length} ·{' '}
              </span>
            )}
            돌 <b>{used}</b>개 ·{' '}
            <span className="par">
              ★★★ {stage.par} · ★★ {stage.par + TWO_STAR_SLACK}개 이하
            </span>
            {hinted && <span className="hinted"> · 힌트 사용(최대 ★★)</span>}
          </span>
        </div>
      </div>

      {!race && (
        <div className="erupt-row">
          {phase === 'fail' ? (
            <button className="erupt-btn cool" onClick={cool} autoFocus>
              {failNote} 다시 해 볼까요?
            </button>
          ) : (
            <button className="erupt-btn" onClick={erupt} disabled={phase !== 'build'}>
              <svg viewBox="-50 -50 100 100" aria-hidden>
                <CraterArt volume={null} erupting={phase === 'flow'} />
              </svg>
              분출!
            </button>
          )}
        </div>
      )}

      {race && phase === 'fail' && (
        <div className="overlay" role="dialog" aria-label="대피 실패">
          <div className="result-card">
            <p className="result-kicker">보너스 스테이지</p>
            <svg viewBox="-40 -48 80 86" className="robot-big" aria-hidden>
              <VillagerArt mood="sad" />
            </svg>
            <h2>집이 탔어요!</h2>
            <p className="result-sub">용암이 더 빨랐어요. 다시 해 볼까요? (실패해도 괜찮아요)</p>
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

      {phase === 'won' && (
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
            <h2>{race ? '마을 대피 성공!' : stage.boss ? '보스 격파!' : hasNext ? '마을을 지켰어요!' : '화산 섬 정복!'}</h2>
            <p className="result-sub">
              돌 {used}개 · ★★★ {stage.par}개 · ★★ {stage.par + TWO_STAR_SLACK}개
              {earned < 3 && !hinted && (
                <>
                  <br />
                  돌 {stage.par}개로 도전해 보세요!
                </>
              )}
              {hinted && (
                <>
                  <br />
                  힌트 없이 처음부터 다시 하면 ★★★에 도전할 수 있어요.
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
