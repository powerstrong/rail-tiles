import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createEditor, eraseRail, placeBlock, placeRail, remaining, replaceRail, resetBoard, rotateRail, undo, usedCount } from '../engine/editor';
import { type Pose, traceToPath } from '../engine/geometry';
import { RAIL_KINDS, type RailKind, normalizeRot } from '../engine/rail';
import { type FailReason, type Trace, simulate } from '../engine/simulate';
import { type Placement, type Stage, cellAt, cellKey } from '../engine/stage';
import { type Stars, starsFor } from '../engine/stars';
import { type SwitchStates, initialSwitches } from '../engine/step';
import { CELL, RailPieceArt } from './art/TrackArt';
import { CHIMNEY } from './art/TrainArt';
import { Board, type Flash, type Tool } from './Board';
import { StarRow } from './StageSelect';
import { isMuted, play, setMuted } from './sound';
import { poseTransform, runTrain } from './trainRunner';

const KIND_LABEL: Record<RailKind, string> = { straight: '직선', curve: '곡선', cross: '교차' };

const FAIL_TEXT: Record<FailReason, string> = {
  out_of_bounds: '선로가 게임판 밖으로 이어져 있어요.',
  no_track: '선로가 중간에 끊겨 있어요.',
  blocked: '장애물에 가로막혔어요.',
  misaligned: '레일 방향이 맞지 않아요.',
  goal_wrong_side: '도착역 입구와 방향이 맞지 않아요.',
  tunnel_wrong_side: '터널 입구가 아닌 쪽으로 들어갔어요.',
  start_reentry: '기차가 출발역으로 되돌아왔어요.',
  missed_waypoint: '아직 태우지 못한 승객이 있어요.',
  loop: '기차가 같은 길을 끝없이 맴돌아요.',
};

const TRAIN_SPEED = 2.6;

type Mode = 'edit' | 'running' | 'result';

interface Props {
  stage: Stage;
  hasNext: boolean;
  allCleared: boolean;
  /** Best rating so far for this stage (0 if never cleared). */
  bestStars: number;
  onBack: () => void;
  onNext: () => void;
  onCleared: (stageId: string, stars: Stars) => void;
}

function startPose(stage: Stage): Pose {
  return { x: stage.start.x + 0.5, y: stage.start.y + 0.5, angle: (stage.start.dir - 1) * 90, alpha: 1 };
}

function ToolIcon({ tool }: { tool: Tool }) {
  if (tool === 'eraser') {
    return (
      <svg viewBox="-50 -50 100 100" className="tool-icon" aria-hidden>
        <g transform="rotate(-35)">
          <rect x={-34} y={-20} width={68} height={40} rx={10} fill="#F7A6A0" />
          <rect x={-34} y={-20} width={26} height={40} rx={10} fill="#7A8FC2" />
          <rect x={-14} y={-20} width={6} height={40} fill="#7A8FC2" />
        </g>
      </svg>
    );
  }
  return (
    <svg viewBox="-50 -50 100 100" className="tool-icon" aria-hidden>
      <g transform="rotate(90)">
        <RailPieceArt kind={tool} />
      </g>
    </svg>
  );
}

export function GameScreen({ stage, hasNext, allCleared, bestStars, onBack, onNext, onCleared }: Props) {
  const [editor, setEditor] = useState(createEditor);
  const [tool, setTool] = useState<Tool>(() => RAIL_KINDS.find((k) => stage.inventory[k] > 0) ?? 'eraser');
  const [mode, setMode] = useState<Mode>('edit');
  const [result, setResult] = useState<Trace | null>(null);
  const [restPose, setRestPose] = useState(() => startPose(stage));
  const [flash, setFlash] = useState<Flash | null>(null);
  const [picked, setPicked] = useState<ReadonlySet<string>>(() => new Set());
  const [toast, setToast] = useState<{ text: string; n: number } | null>(null);
  const [bump, setBump] = useState<{ tool: Tool; n: number } | null>(null);
  const [muted, setMutedState] = useState(isMuted);
  const [hinted, setHinted] = useState(false);
  const [hintKey, setHintKey] = useState<string | null>(null);
  const [earned, setEarned] = useState<Stars>(1);
  const [switchStates, setSwitchStates] = useState<SwitchStates>(() => initialSwitches(stage));
  const trainRef = useRef<SVGGElement>(null);
  const smokeRef = useRef<SVGGElement>(null);
  const cancelRun = useRef<(() => void) | null>(null);
  const counter = useRef(0);
  const celebrationTimers = useRef<number[]>([]);

  const left = remaining(stage, editor.placed);
  const tools = useMemo<Tool[]>(() => [...RAIL_KINDS.filter((k) => stage.inventory[k] > 0), 'eraser'], [stage]);
  const running = mode === 'running';

  // The listed solution in driving order: a hint reveals its first tile the player hasn't matched yet.
  const solutionOrder = useMemo<Placement[]>(() => {
    const byKey = new Map(stage.solution.map((p) => [cellKey(p.x, p.y), p]));
    const trace = simulate(stage, Object.fromEntries([...byKey].map(([k, p]) => [k, p.rail])));
    return trace.steps.flatMap((st) => {
      const p = st.kind === 'rail' ? byKey.get(cellKey(st.x, st.y)) : undefined;
      return p ? [p] : [];
    });
  }, [stage]);
  const matches = (p: Placement) => {
    const r = editor.placed[cellKey(p.x, p.y)];
    return !!r && r.kind === p.rail.kind && normalizeRot(r.kind, r.rot) === normalizeRot(p.rail.kind, p.rail.rot);
  };
  const hint = hintKey ? (solutionOrder.find((p) => cellKey(p.x, p.y) === hintKey && !matches(p)) ?? null) : null;

  useEffect(
    () => () => {
      cancelRun.current?.();
      celebrationTimers.current.forEach(clearTimeout);
    },
    [],
  );

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  const say = (text: string) => setToast({ text, n: ++counter.current });
  const deny = (x: number, y: number, text?: string) => {
    play('deny');
    setFlash({ x, y, n: ++counter.current });
    if (text) say(text);
  };

  /** Any edit after a run puts the train back in the station and clears the result. */
  const applyEdit = useCallback(
    (next: typeof editor) => {
      if (next === editor) return false;
      setEditor(next);
      if (mode === 'result') {
        setMode('edit');
        setResult(null);
        setPicked(new Set());
        setSwitchStates(initialSwitches(stage));
        setRestPose(startPose(stage));
      }
      return true;
    },
    [editor, mode, stage],
  );

  const onCellClick = (x: number, y: number) => {
    if (running) return;
    const placedHere = editor.placed[cellKey(x, y)];
    const cell = cellAt(stage, x, y);
    if (tool === 'eraser') {
      if (placedHere) {
        if (applyEdit(eraseRail(editor, x, y))) play('erase');
      }
      else if (cell?.type === 'fixed') deny(x, y, '고정 레일은 지울 수 없어요.');
      return;
    }
    const noneLeft = () => {
      deny(x, y, `${KIND_LABEL[tool]} 레일이 더 없어요.`);
      setBump({ tool, n: ++counter.current });
    };
    if (placedHere) {
      // Same kind: rotate. Other kind: swap it out (the old piece is refunded).
      if (placedHere.kind === tool) {
        if (applyEdit(rotateRail(editor, x, y))) play('rotate');
      } else if (left[tool] <= 0) noneLeft();
      else if (applyEdit(replaceRail(stage, editor, x, y, tool))) play('place');
      return;
    }
    const block = placeBlock(stage, editor.placed, x, y, tool);
    if (block === 'none_left') {
      noneLeft();
      return;
    }
    if (block === 'not_empty') {
      deny(x, y, cell?.type === 'fixed' ? '고정 레일은 움직일 수 없어요.' : undefined);
      return;
    }
    if (applyEdit(placeRail(stage, editor, x, y, tool))) play('place');
  };

  const spawnPuff = (pose: Pose) => {
    const layer = smokeRef.current;
    if (!layer) return;
    const a = (pose.angle * Math.PI) / 180;
    const puff = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    puff.setAttribute('cx', (pose.x * CELL + Math.cos(a) * CHIMNEY.x).toFixed(1));
    puff.setAttribute('cy', (pose.y * CELL + Math.sin(a) * CHIMNEY.x).toFixed(1));
    puff.setAttribute('r', '7');
    puff.setAttribute('class', 'puff');
    puff.addEventListener('animationend', () => puff.remove());
    layer.appendChild(puff);
  };

  const start = () => {
    if (running) return;
    cancelRun.current?.();
    celebrationTimers.current.forEach(clearTimeout);
    celebrationTimers.current = [];
    const trace = simulate(stage, editor.placed);
    const path = traceToPath(trace.steps);
    // Passengers are picked up as the train passes the middle of their tile.
    const stops = new Set(stage.waypoints.map((p) => cellKey(p.x, p.y)));
    const pickups = trace.steps.flatMap((step, i) =>
      step.kind === 'rail' && stops.has(cellKey(step.x, step.y))
        ? [{ key: cellKey(step.x, step.y), at: path.stepMid[i] }]
        : [],
    );
    // Switches flip once the train has cleared them.
    const flips = trace.steps.flatMap((step, i) =>
      step.kind === 'rail' && step.toggle ? [{ ...step.toggle, at: path.stepMid[i] + 0.45 }] : [],
    );
    let nextPickup = 0;
    let nextFlip = 0;
    let puffs = 0;
    setResult(null);
    setPicked(new Set());
    setSwitchStates(initialSwitches(stage));
    setRestPose(startPose(stage));
    setMode('running');
    play('depart');
    cancelRun.current = runTrain(path, {
      speed: TRAIN_SPEED,
      brake: trace.success,
      onPose: (pose) => {
        trainRef.current?.setAttribute('transform', poseTransform(pose, CELL));
        trainRef.current?.setAttribute('opacity', pose.alpha.toFixed(3));
      },
      onPuff: (pose) => {
        if (pose.alpha < 0.6) return; // no smoke from inside a tunnel
        spawnPuff(pose);
        if (puffs++ % 2 === 1) play('chuff');
      },
      onAdvance: (dist) => {
        while (nextFlip < flips.length && flips[nextFlip].at <= dist) {
          const { key, to } = flips[nextFlip++];
          play('rotate');
          setSwitchStates((prev) => ({ ...prev, [key]: to }));
        }
        while (nextPickup < pickups.length && pickups[nextPickup].at <= dist) {
          const { key } = pickups[nextPickup++];
          play('pickup');
          setPicked((prev) => new Set(prev).add(key));
        }
      },
      onDone: (pose) => {
        cancelRun.current = null;
        setRestPose(pose);
        setResult(trace);
        setMode('result');
        play(trace.success ? 'arrive' : 'crash');
        if (trace.success) {
          const stars = starsFor(usedCount(editor.placed), stage.par, hinted);
          setEarned(stars);
          onCleared(stage.id, stars);
          // Ceremony first, then one ping per star as the result card shows them (see styles.css delays).
          celebrationTimers.current.push(window.setTimeout(() => play('pop'), 120));
          (['star1', 'star2', 'star3'] as const).slice(0, stars).forEach((sfx, i) => {
            celebrationTimers.current.push(window.setTimeout(() => play(sfx), 1850 + i * 250));
          });
        }
      },
    });
  };

  const doUndo = () => !running && applyEdit(undo(editor)) && play('rotate');
  const doReset = () => !running && applyEdit(resetBoard(editor)) && play('erase');
  const showHint = () => {
    if (running) return;
    const next = solutionOrder.find((p) => !matches(p));
    if (!next) {
      say('정답 레일은 모두 놓였어요. 출발해 보세요!');
      return;
    }
    setHinted(true);
    setHintKey(cellKey(next.x, next.y));
    play('pickup');
  };
  const toggleMute = () => {
    setMuted(!muted);
    setMutedState(!muted);
  };

  const keyHandler = useRef<(e: KeyboardEvent) => void>(() => {});
  keyHandler.current = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      doUndo();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const idx = ['1', '2', '3', '4'].indexOf(e.key);
    if (idx >= 0 && tools[idx]) setTool(tools[idx]);
    else if (e.key.toLowerCase() === 'e') setTool('eraser');
    else if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) start();
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => keyHandler.current(e);
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const failure = result && !result.success ? result.failure : null;
  const success = result?.success ?? false;

  return (
    <div className="game">
      <header className="game-head">
        <button className="icon-btn" onClick={onBack} aria-label="스테이지 목록">
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M15 5 L8 12 L15 19" />
          </svg>
        </button>
        <div className="game-title">
          <span className="stage-no">STAGE {stage.number}</span>
          <h1>{stage.title}</h1>
        </div>
        <div className="head-actions">
          <button className="icon-btn" onClick={toggleMute} aria-label={muted ? '소리 켜기' : '소리 끄기'} aria-pressed={muted}>
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M4 9.5 H7.5 L12 5.5 V18.5 L7.5 14.5 H4 Z" />
              {muted ? <path d="M16 9.5 L21 14.5 M21 9.5 L16 14.5" /> : <path d="M15.5 9 Q17.5 12 15.5 15 M18 6.5 Q22 12 18 17.5" />}
            </svg>
          </button>
          <button className="icon-btn" onClick={doUndo} disabled={running || editor.history.length === 0} aria-label="되돌리기">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M9 7 L4 12 L9 17 M4 12 H14 A6 6 0 0 1 14 24" transform="translate(1 -3)" />
            </svg>
          </button>
          <button className="icon-btn" onClick={doReset} disabled={running || usedCount(editor.placed) === 0} aria-label="모두 지우기">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M19 12 A7 7 0 1 1 16.5 6.6 M17 2.5 V7 H12.5" />
            </svg>
          </button>
        </div>
      </header>

      <p className="tip">{stage.tip}</p>

      <div className="board-wrap">
        <Board
          stage={stage}
          placed={editor.placed}
          editable={!running}
          tool={tool}
          showGhost={stage.ghostHint && mode === 'edit'}
          failure={failure}
          arrived={success}
          flash={flash}
          picked={picked}
          hint={mode === 'edit' ? hint : null}
          switchStates={switchStates}
          restPose={restPose}
          trainRef={trainRef}
          smokeRef={smokeRef}
          onCellClick={onCellClick}
        />
        {toast && (
          <div key={toast.n} className="toast" role="status">
            {toast.text}
          </div>
        )}
      </div>

      <div className="status-row">
        <button className="hint-btn" onClick={showHint} disabled={running} aria-label="힌트 보기">
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M9 18 H15 M10 21 H14 M12 3 A6 6 0 0 0 8 13.5 C8.8 14.3 9 15 9 16 H15 C15 15 15.2 14.3 16 13.5 A6 6 0 0 0 12 3 Z" />
          </svg>
          힌트
        </button>
        <div className={`status ${failure ? 'is-fail' : ''}`} aria-live="polite">
          {failure ? (
            <>
              <strong>앗!</strong> {FAIL_TEXT[failure.reason]}
            </>
          ) : running ? (
            <span>
              칙칙폭폭…
              {stage.waypoints.length > 0 && (
                <span className="riders">
                  {' '}
                  · 손님 {picked.size}/{stage.waypoints.length}
                </span>
              )}
            </span>
          ) : (
            <span>
              {stage.waypoints.length > 0 && <span className="riders">손님 {stage.waypoints.length}명 · </span>}
              레일 <b>{usedCount(editor.placed)}</b>개 · <span className="par">★★★ {stage.par}개 이하</span>
              {hinted && <span className="hinted"> · 힌트 사용(최대 ★★)</span>}
            </span>
          )}
        </div>
      </div>

      <div className="dock">
        <div className="tools" role="radiogroup" aria-label="도구">
          {tools.map((t, i) => {
            const count = t === 'eraser' ? null : left[t];
            return (
              <button
                key={t + (bump?.tool === t ? bump.n : '')}
                role="radio"
                aria-checked={tool === t}
                className={`tool ${tool === t ? 'selected' : ''} ${count === 0 ? 'empty' : ''} ${bump?.tool === t ? 'bump' : ''}`}
                onClick={() => setTool(t)}
                disabled={running}
                title={`${t === 'eraser' ? '지우개' : `${KIND_LABEL[t]} 레일`} (${i + 1})`}
              >
                <ToolIcon tool={t} />
                <span className="tool-label">{t === 'eraser' ? '지우개' : KIND_LABEL[t]}</span>
                {count !== null && <span className="count">{count}</span>}
              </button>
            );
          })}
        </div>
        <button className="go-btn" onClick={start} disabled={running}>
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M8 5 L19 12 L8 19 Z" />
          </svg>
          출발
        </button>
      </div>

      {success && (
        <div className="overlay" role="dialog" aria-label="스테이지 클리어">
          <div className="result-card">
            <div className="confetti" aria-hidden>
              {Array.from({ length: 18 }, (_, i) => (
                <i key={i} style={{ '--i': i } as CSSProperties} />
              ))}
            </div>
            <p className="result-kicker">STAGE {stage.number}</p>
            <StarRow count={earned} className="result-stars" />
            {!hasNext && allCleared ? (
              <>
                <h2>모든 노선 완성!</h2>
                <p className="result-sub">마지막 기차까지 무사히 도착했어요. 끝까지 함께해 줘서 고마워요!</p>
              </>
            ) : (
              <>
                <h2>도착 완료!</h2>
                <p className="result-sub">
                  레일 {usedCount(editor.placed)}개 사용 · ★★★ 목표 {stage.par}개
                  {earned < 3 && !hinted && (
                    <>
                      <br />
                      레일 {stage.par}개로 다시 도전해 보세요!
                    </>
                  )}
                  {bestStars > earned && (
                    <>
                      <br />
                      최고 기록: 별 {bestStars}개
                    </>
                  )}
                </p>
              </>
            )}
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
              <button
                className="secondary"
                onClick={() => {
                  setResult(null);
                  setMode('edit');
                  setPicked(new Set());
                  setSwitchStates(initialSwitches(stage));
                  setRestPose(startPose(stage));
                }}
              >
                다시 배치하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
