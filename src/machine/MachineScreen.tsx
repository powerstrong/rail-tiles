import { type CSSProperties, memo, useEffect, useMemo, useRef, useState } from 'react';
import { type Stars, TWO_STAR_SLACK, starsFor } from '../engine/stars';
import { StarRow } from '../ui/StageSelect';
import { isMuted, play, setMuted } from '../ui/sound';
import { light } from './beam';
import { BEAM, BulbArt, DoorArt, FilterArt, FloorTile, LaserArt, MC, MirrorArt, RobotArt, SensorArt, WallArt } from './MachineArt';
import type { MachineStage } from './model';
import { hintLaser, solveLaser } from './solver';

const CELL = 100;
const PAD = 20;

interface Props {
  stage: MachineStage;
  hasNext: boolean;
  bestStars: number;
  onBack: () => void;
  onNext: () => void;
  onCleared: (id: string, stars: Stars) => void;
}

const Floor = memo(function Floor({ stage }: { stage: MachineStage }) {
  const w = stage.width * CELL;
  const h = stage.height * CELL;
  return (
    <g>
      <rect x={-PAD + 2} y={-PAD + 8} width={w + PAD * 2} height={h + PAD * 2} rx={24} fill={MC.frameDark} />
      <rect x={-PAD} y={-PAD} width={w + PAD * 2} height={h + PAD * 2} rx={24} fill={MC.frame} />
      {/* Hazard stripes along the top edge: this is a factory. */}
      <g opacity={0.9}>
        {Array.from({ length: Math.ceil((w + PAD * 2) / 28) }, (_, k) => (
          <path key={k} d={`M${-PAD + 10 + k * 28} ${-PAD + 4} l10 0 l-8 10 l-10 0 Z`} fill={k % 2 ? MC.hazard : MC.ink} />
        ))}
      </g>
      {stage.tiles.map((_, i) => (
        <g key={i} transform={`translate(${(i % stage.width) * CELL + 50} ${Math.floor(i / stage.width) * CELL + 50})`}>
          <FloorTile alt={(i + Math.floor(i / stage.width)) % 2 === 1} />
        </g>
      ))}
    </g>
  );
});

export function MachineScreen({ stage, hasNext, bestStars, onBack, onNext, onCleared }: Props) {
  const wins = useMemo(() => solveLaser(stage).wins, [stage]);
  const [config, setConfig] = useState(stage.start);
  const [spins, setSpins] = useState<number[]>(() => stage.devices.map(() => 0));
  const [history, setHistory] = useState<number[]>([]);
  const [taps, setTaps] = useState(0);
  const [won, setWon] = useState(false);
  const [drained, setDrained] = useState(false);
  const [earned, setEarned] = useState<Stars>(1);
  const [hinted, setHinted] = useState(false);
  const [hint, setHint] = useState<{ device: number; config: number } | null>(null);
  const [muted, setMutedState] = useState(isMuted);
  const timers = useRef<number[]>([]);
  /** Set the moment the last bulb lights, before the result card shows. */
  const finishing = useRef(false);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const bonus = stage.battery !== undefined;
  const battery = stage.battery ?? 0;
  const lighting = useMemo(() => light(stage, config), [stage, config]);
  const prevLit = useRef(lighting.litBulbs.size);
  useEffect(() => {
    if (lighting.litBulbs.size > prevLit.current) play('pickup');
    prevLit.current = lighting.litBulbs.size;
  }, [lighting]);

  const tap = (device: number) => {
    if (won || drained || finishing.current) return;
    if (!((stage.turnable >> device) & 1)) {
      play('bump');
      return;
    }
    const next = config ^ (1 << device);
    setHistory((h) => [...h, config]);
    setConfig(next);
    setSpins((s) => s.map((v, i) => (i === device ? v + 1 : v)));
    const n = taps + 1;
    setTaps(n);
    play('rotate');
    const l = light(stage, next);
    if (l.won) {
      finishing.current = true;
      const stars = starsFor(n, stage.par, hinted);
      setEarned(stars);
      onCleared(stage.id, stars);
      timers.current.push(
        window.setTimeout(() => {
          setWon(true);
          play('arrive');
          (['star1', 'star2', 'star3'] as const).slice(0, stars).forEach((sfx, i) => {
            timers.current.push(window.setTimeout(() => play(sfx), 1700 + i * 250));
          });
        }, 500),
      );
    } else if (bonus && n >= battery) {
      finishing.current = true;
      timers.current.push(
        window.setTimeout(() => {
          setDrained(true);
          play('crash');
        }, 400),
      );
    }
  };

  const undo = () => {
    if (won || drained || bonus || history.length === 0) return;
    const prev = history[history.length - 1];
    const changed = prev ^ config;
    setConfig(prev);
    setHistory((h) => h.slice(0, -1));
    setSpins((s) => s.map((v, i) => ((changed >> i) & 1 ? v - 1 : v)));
    setTaps((t) => t - 1);
    play('rotate');
  };
  const restart = (keepHint: boolean) => {
    setConfig(stage.start);
    setSpins(stage.devices.map(() => 0));
    setHistory([]);
    setTaps(0);
    setWon(false);
    setDrained(false);
    finishing.current = false;
    if (!keepHint) {
      setHinted(false);
      setHint(null);
    }
    play('erase');
  };
  const showHint = () => {
    if (won || drained) return;
    const d = hintLaser(stage, config, wins);
    if (d === null) return;
    setHinted(true);
    setHint({ device: d, config });
    play('pickup');
  };
  const toggleMute = () => {
    setMuted(!muted);
    setMutedState(!muted);
  };

  const w = stage.width * CELL;
  const h = stage.height * CELL;
  const shownHint = hint && hint.config === config ? hint.device : null;
  const left = battery - taps;

  return (
    <div className={`game world-machine ${stage.boss ? 'is-boss' : ''} ${bonus ? 'is-bonus' : ''}`}>
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
            <button className="icon-btn" onClick={undo} disabled={won || history.length === 0} aria-label="되돌리기">
              <svg viewBox="0 0 24 24" aria-hidden>
                <path d="M9 7 L4 12 L9 17 M4 12 H14 A6 6 0 0 1 14 24" transform="translate(1 -3)" />
              </svg>
            </button>
          )}
          <button className="icon-btn" onClick={() => restart(true)} disabled={taps === 0 || won} aria-label="처음으로">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M19 12 A7 7 0 1 1 16.5 6.6 M17 2.5 V7 H12.5" />
            </svg>
          </button>
        </div>
      </header>

      {bonus ? (
        <div className="robot-bar" aria-live="polite">
          <svg viewBox="-50 -60 100 110" className="robot-face" aria-hidden>
            <RobotArt mood={won ? 'happy' : drained ? 'sleep' : 'worried'} />
          </svg>
          <div className="robot-text">
            <strong>{won ? '충전 완료! 고마워!' : drained ? '배터리 방전…' : '배터리가 떨어지기 전에 전구를 모두 켜 줘!'}</strong>
            <div className="battery" aria-label={`배터리 ${Math.max(0, left)}칸`}>
              {Array.from({ length: battery }, (_, k) => (
                <i key={k} className={k < left || won ? 'on' : ''} />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <p className="tip">{stage.tip}</p>
      )}

      <div className="board-wrap">
        <svg className="board machine-board" viewBox={`${-PAD} ${-PAD} ${w + PAD * 2} ${h + PAD * 2 + 8}`} role="grid" aria-label={`${stage.width}×${stage.height} 레이저 공장`}>
          <Floor stage={stage} />
          {/* Beams under the devices, with a soft glow. */}
          <g pointerEvents="none" className="beams">
            {lighting.segments.map((s, k) => (
              <line key={`g${k}`} x1={s.x1 * CELL} y1={s.y1 * CELL} x2={s.x2 * CELL} y2={s.y2 * CELL} stroke={BEAM[s.color]} strokeWidth={22} strokeLinecap="round" opacity={0.25} />
            ))}
            {lighting.segments.map((s, k) => (
              <line key={`c${k}`} x1={s.x1 * CELL} y1={s.y1 * CELL} x2={s.x2 * CELL} y2={s.y2 * CELL} stroke={BEAM[s.color]} strokeWidth={7} strokeLinecap="round" />
            ))}
          </g>
          {stage.tiles.map((t, i) => {
            const x = (i % stage.width) * CELL + 50;
            const y = Math.floor(i / stage.width) * CELL + 50;
            if (t.t === 'floor') return null;
            const tappable = t.t === 'mirror' && !t.fixed;
            return (
              <g
                key={i}
                transform={`translate(${x} ${y})`}
                className={tappable ? 'tappable' : undefined}
                onClick={t.t === 'mirror' ? () => tap(t.device) : undefined}
                role={tappable ? 'button' : undefined}
                aria-label={tappable ? `거울 ${t.device + 1} 돌리기` : undefined}
              >
                {tappable && <rect x={-50} y={-50} width={100} height={100} fill="transparent" />}
                {t.t === 'wall' && <WallArt />}
                {t.t === 'laser' && <LaserArt dir={t.dir} color={t.color} />}
                {t.t === 'mirror' && (
                  <MirrorArt startBack={((stage.start >> t.device) & 1) === 1} spin={spins[t.device]} fixed={t.fixed} half={t.half} hint={shownHint === t.device} />
                )}
                {t.t === 'bulb' && <BulbArt need={t.need} lit={lighting.litBulbs.has(i)} />}
                {t.t === 'filter' && <FilterArt color={t.color} />}
                {t.t === 'sensor' && <SensorArt lit={lighting.lit.has(i)} />}
                {t.t === 'door' && <DoorArt open={lighting.doorsOpen} />}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="status-row">
        <button className="hint-btn" onClick={showHint} disabled={won || drained} aria-label="힌트 보기">
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M9 18 H15 M10 21 H14 M12 3 A6 6 0 0 0 8 13.5 C8.8 14.3 9 15 9 16 H15 C15 15 15.2 14.3 16 13.5 A6 6 0 0 0 12 3 Z" />
          </svg>
          힌트
        </button>
        <div className="status" aria-live="polite">
          <span>
            <span className="riders">
              전구 {lighting.litBulbs.size}/{stage.bulbs.length} ·{' '}
            </span>
            누르기 <b>{taps}</b>번 ·{' '}
            <span className="par">
              ★★★ {stage.par} · ★★ {stage.par + TWO_STAR_SLACK}번 이하
            </span>
            {hinted && <span className="hinted"> · 힌트 사용(최대 ★★)</span>}
          </span>
        </div>
      </div>

      {drained && (
        <div className="overlay" role="dialog" aria-label="배터리 방전">
          <div className="result-card">
            <p className="result-kicker">보너스 스테이지</p>
            <svg viewBox="-50 -60 100 110" className="robot-big" aria-hidden>
              <RobotArt mood="sleep" />
            </svg>
            <h2>배터리 방전!</h2>
            <p className="result-sub">로봇이 잠들었어요. 다시 해 볼까요? (실패해도 괜찮아요)</p>
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
            <h2>{bonus ? '로봇 구출 성공!' : stage.boss ? '보스 격파!' : hasNext ? '불이 켜졌어요!' : '로봇 공장 정복!'}</h2>
            <p className="result-sub">
              누르기 {taps}번 · ★★★ {stage.par}번 · ★★ {stage.par + TWO_STAR_SLACK}번
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
    </div>
  );
}
