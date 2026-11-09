import { type CSSProperties, type KeyboardEvent, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { CHIMNEY, TrainArt } from './art/TrainArt';
import { makePuff, useLook } from './look';
import { PLAZA, type PlazaId, type Layout, type Run, MAP_W, isPlaza, poseOn, rerouteTo, runLength, standAt } from './routeLayout';
import { play } from './sound';
import { Emblem, type WorldCard } from './WorldSelect';

export interface StationInfo extends WorldCard {
  /** Today's puzzle of this world: none, waiting to be played, or cleared. */
  daily: 'none' | 'open' | 'done';
}

interface Props {
  layout: Layout;
  stations: StationInfo[];
  /** The place picked last (the train starts there). */
  focus: string;
  onFocus: (id: string) => void;
  /** Go into a world, or open a plaza building. */
  onEnter: (id: string) => void;
  onBack: () => void;
  /** "강바람 철도 2-4" when there is something to continue. */
  continueText: string | null;
  continueResume: boolean;
  onContinue: () => void;
  /** Garage: new looks not seen yet. Board: today's puzzles still to play, and the best streak going. */
  newLooks: number;
  dailyOpen: number;
  dailyDone: number;
  totalStars: number;
}

/** Map units per second the train runs at. */
const SPEED = 420;
const TRAIN_SCALE = 0.48;

const reduced = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** The plaza buildings, drawn standing on 0,0 (their front at the siding). */
function Building({ id }: { id: PlazaId }) {
  if (id === 'garage')
    return (
      <g>
        <path d="M-30 -6 V-38 L0 -56 L30 -38 V-6 Z" fill="#E9E1D2" stroke="#8A6A4C" strokeWidth={2.5} strokeLinejoin="round" />
        <path d="M-34 -36 L0 -58 L34 -36" stroke="#2E6F8E" strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M-17 -6 V-26 Q0 -40 17 -26 V-6 Z" fill="#2E4A5C" />
        <path d="M-8 -30 l6 6 m-3 -9 a6 6 0 1 0 6 6" stroke="#F6C443" strokeWidth={3} fill="none" strokeLinecap="round" />
      </g>
    );
  if (id === 'board')
    return (
      <g>
        <rect x={-4} y={-22} width={8} height={18} fill="#8A6A4C" />
        <rect x={-34} y={-58} width={68} height={40} rx={6} fill="#C99A5E" stroke="#8A6A4C" strokeWidth={2.5} />
        <rect x={-28} y={-53} width={24} height={30} rx={2} fill="#FFFBF2" transform="rotate(-4 -16 -38)" />
        <rect x={2} y={-52} width={26} height={22} rx={2} fill="#FFE1EC" transform="rotate(3 15 -41)" />
        <path d="M-24 -44 H-10 M-24 -38 H-12 M-24 -32 H-14" stroke="#C2B19A" strokeWidth={2} strokeLinecap="round" />
        <circle cx={-16} cy={-52} r={2.5} fill="#E5584F" />
        <circle cx={15} cy={-50} r={2.5} fill="#3A7FC2" />
      </g>
    );
  return (
    <g>
      <rect x={-3} y={-24} width={6} height={20} fill="#5D6271" />
      <path d="M-20 -26 V-48 Q-20 -62 0 -62 Q20 -62 20 -48 V-26 Z" fill="#E5584F" stroke="#B83E37" strokeWidth={2.5} strokeLinejoin="round" />
      <rect x={-12} y={-50} width={24} height={5} rx={2.5} fill="#7A2420" />
      <path d="M-9 -38 H9 L0 -31 Z" fill="none" stroke="#FFFBF2" strokeWidth={2} strokeLinejoin="round" />
    </g>
  );
}

/** Two rails on sleepers along an SVG path. */
function Track({ d, state }: { d: string; state: 'open' | 'locked' | 'fresh' }) {
  if (state === 'locked') return <path d={d} className="route-track-locked" />;
  return (
    <g className={state === 'fresh' ? 'route-fresh' : undefined}>
      <path d={d} className="route-sleepers" />
      <path d={d} className="route-rails" />
      <path d={d} className="route-rails-gap" />
    </g>
  );
}

const pressKeys = (e: KeyboardEvent, f: () => void) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();
  f();
};

export function RouteMap({ layout, stations, focus, onFocus, onEnter, onBack, continueText, continueResume, onContinue, newLooks, dailyOpen, dailyDone, totalStars }: Props) {
  const { smoke } = useLook();
  const trainRef = useRef<SVGGElement>(null);
  const smokeRef = useRef<SVGGElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const byId = useMemo(() => Object.fromEntries(stations.map((s) => [s.id, s])), [stations]);
  // The train's run and how far along it is: kept outside React, so the run never re-renders the map.
  const run = useRef<Run>(standAt(layout, layout.stops[focus] ? focus : 'board'));
  const at = useRef(0);
  const frame = useRef(0);

  const place = () => {
    const p = poseOn(run.current, at.current);
    // Standing still where the map opened: along the siding in the plaza, else facing its station.
    if (run.current.pts.length === 1) p.angle = isPlaza(run.current.marks[0].id) ? 0 : Math.PI / 2;
    trainRef.current?.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${((p.angle * 180) / Math.PI).toFixed(1)}) scale(${TRAIN_SCALE})`);
    return p;
  };
  useLayoutEffect(() => {
    // Facing down the line it came from is fine at rest: point it along the track below the stop.
    place();
  }, []);

  // Drive to the focused place whenever it changes.
  useEffect(() => {
    const target = focus;
    if (!layout.stops[target]) return;
    const last = run.current.marks.at(-1);
    if (last?.id === target && at.current >= runLength(run.current)) return;
    run.current = rerouteTo(layout, run.current, at.current, target);
    at.current = 0;
    // Keep the place the train is heading for on screen.
    const el = scrollRef.current;
    const svg = el?.querySelector('svg');
    if (el && svg) {
      const scale = svg.getBoundingClientRect().width / MAP_W;
      const y = layout.stops[target][1] * scale;
      if (y < el.scrollTop + 40 || y > el.scrollTop + el.clientHeight - 80) el.scrollTo({ top: Math.max(0, y - el.clientHeight * 0.4), behavior: reduced() ? 'auto' : 'smooth' });
    }
    cancelAnimationFrame(frame.current);
    const total = runLength(run.current);
    if (reduced() || total < 1) {
      at.current = total;
      place();
      return;
    }
    let prev = performance.now();
    let puffs = 0;
    let next = 0;
    const tick = (now: number) => {
      at.current = Math.min(total, at.current + ((now - prev) / 1000) * SPEED);
      prev = now;
      const p = place();
      if (now >= next && smokeRef.current) {
        next = now + 160;
        const cx = p.x + Math.cos(p.angle) * CHIMNEY.x * TRAIN_SCALE;
        const cy = p.y + Math.sin(p.angle) * CHIMNEY.x * TRAIN_SCALE;
        smokeRef.current.appendChild(makePuff(smoke, cx, cy, puffs++));
        if (puffs % 3 === 1) play('chuff');
      }
      if (at.current < total) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [focus, layout]);

  // Bring the focused place into view once, when the map opens.
  useEffect(() => {
    const el = scrollRef.current;
    const p = layout.stops[focus];
    if (!el || !p) return;
    const svg = el.querySelector('svg');
    const scale = svg ? svg.getBoundingClientRect().width / MAP_W : 1;
    el.scrollTop = Math.max(0, p[1] * scale - el.clientHeight * 0.4);
  }, []);

  const pick = (id: string) => {
    if (id === focus) {
      const s = byId[id];
      if (isPlaza(id) || (s && s.state !== 'locked' && s.state !== 'soon')) onEnter(id);
      else play('deny');
      return;
    }
    play('pickup');
    onFocus(id);
  };

  const sel = byId[focus];
  const plaza = isPlaza(focus) ? focus : null;
  const locked = (s: StationInfo) => s.state === 'locked' || s.state === 'soon';

  return (
    <main className="route">
      <header className="select-head route-head">
        <button className="icon-btn" onClick={onBack} aria-label="타이틀로">
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M15 5 L8 12 L15 19" />
          </svg>
        </button>
        <h1>다음 정거장은?</h1>
        <span className="route-stars" aria-label={`모은 별 ${totalStars}개`}>
          ★ {totalStars}
        </span>
      </header>

      <div className="route-scroll" ref={scrollRef}>
        <svg className="route-map" viewBox={`0 0 ${MAP_W} ${layout.height}`} role="group" aria-label="노선도">
          <rect width={MAP_W} height={layout.height} fill="#F3E8D2" />
          {/* The plaza, paved. */}
          <rect x={14} y={14} width={MAP_W - 28} height={140} rx={22} fill="#E9DCC2" />
          <text x={MAP_W / 2} y={36} textAnchor="middle" className="route-plaza-name">
            중앙역 광장
          </text>
          {stations.map((s) => {
            const [x, y] = layout.discs[s.id];
            return <circle key={`blob-${s.id}`} cx={x} cy={y} r={58} fill={locked(s) ? '#D8CDB8' : s.color} opacity={locked(s) ? 0.25 : 0.14} />;
          })}

          {layout.edges.map((e) => {
            const s = byId[e.b];
            const state = s ? (locked(s) ? 'locked' : s.fresh ? 'fresh' : 'open') : 'open';
            return <Track key={`${e.a}-${e.b}`} d={e.track} state={state} />;
          })}

          {(Object.keys(PLAZA) as PlazaId[]).map((id) => {
            const [x, y] = layout.stops[id];
            const badge = id === 'garage' && newLooks > 0 ? `NEW ${newLooks}` : id === 'board' && dailyOpen > 0 ? `${dailyOpen}` : null;
            return (
              <g
                key={id}
                className={`route-place${focus === id ? ' picked' : ''}`}
                transform={`translate(${x} ${y - 24})`}
                role="button"
                tabIndex={0}
                aria-label={`${PLAZA[id].title}: ${PLAZA[id].sub}${badge ? `, ${id === 'board' ? `오늘의 퍼즐 ${badge}개` : '새 꾸미기'}` : ''}`}
                onClick={() => pick(id)}
                onKeyDown={(e) => pressKeys(e, () => pick(id))}
              >
                <rect x={-44} y={-70} width={88} height={84} fill="transparent" />
                <Building id={id} />
                <text y={2} textAnchor="middle" className="route-place-name">
                  {PLAZA[id].title}
                </text>
                {badge && (
                  <g transform="translate(26 -58)">
                    <rect x={badge.length > 2 ? -26 : -11} y={-10} width={badge.length > 2 ? 52 : 22} height={20} rx={10} fill="#E5584F" />
                    <text y={5} textAnchor="middle" className="route-badge">
                      {badge}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {stations.map((s) => {
            const [x, y] = layout.discs[s.id];
            const off = locked(s);
            return (
              <g
                key={s.id}
                className={`route-station ${s.state}${focus === s.id ? ' picked' : ''}${s.fresh ? ' fresh' : ''}`}
                transform={`translate(${x} ${y})`}
                style={{ '--world': s.color } as CSSProperties}
                role="button"
                tabIndex={0}
                aria-label={`${s.title}${off ? `, 잠김. ${s.lockNote ?? ''}` : `, 별 ${s.stars}/${s.maxStars}`}${s.fresh ? ', 새로 열림' : ''}${s.state === 'conquered' ? ', 여행 완료' : ''}`}
                onClick={() => pick(s.id)}
                onKeyDown={(e) => pressKeys(e, () => pick(s.id))}
              >
                <rect x={-50} y={-STOP_HIT} width={100} height={STOP_HIT + 70} fill="transparent" />
                {focus === s.id && <circle r={36} className="route-ring" />}
                <circle r={28} className="route-disc" />
                <g opacity={off ? 0.4 : 1}>
                  <Emblem kind={s.emblem} size={38} />
                </g>
                {off && (
                  <g transform="translate(16 14)">
                    <circle r={10} fill="#8A7D6B" />
                    <rect x={-5} y={-2} width={10} height={8} rx={2} fill="#FFFBF2" />
                    <path d="M-3 -2 V-4 A3 3 0 0 1 3 -4 V-2" stroke="#FFFBF2" strokeWidth={1.8} fill="none" />
                  </g>
                )}
                {s.state === 'conquered' && (
                  <path d="M-14 -40 L-14 -30 L14 -30 L14 -40 L7 -34 L0 -42 L-7 -34 Z" fill="#F6C443" stroke="#C9921A" strokeWidth={1.5} strokeLinejoin="round" transform="translate(0 6)" />
                )}
                {s.daily === 'open' && (
                  <g transform="translate(-22 -18)">
                    <circle r={9} fill="#EE8E3E" />
                    <rect x={-5} y={-4} width={10} height={9} rx={2} fill="#FFFBF2" />
                    <rect x={-5} y={-4} width={10} height={3} fill="#C9721E" />
                  </g>
                )}
                {s.fresh && (
                  <g transform="translate(22 -24)">
                    <rect x={-17} y={-9} width={34} height={18} rx={9} fill="#E5584F" />
                    <text y={4} textAnchor="middle" className="route-badge">
                      NEW
                    </text>
                  </g>
                )}
                <text y={46} textAnchor="middle" className="route-name">
                  {s.title}
                </text>
                <text y={62} textAnchor="middle" className="route-sub">
                  {off ? '🔒 잠김' : `★ ${s.stars}/${s.maxStars}`}
                </text>
              </g>
            );
          })}

          <g ref={smokeRef} />
          <g ref={trainRef} className="route-train" pointerEvents="none">
            <TrainArt />
          </g>
        </svg>
      </div>

      <div className="route-panel">
        <div className="route-card" aria-live="polite">
          {plaza ? (
            <>
              <div className="route-card-text">
                <strong>{PLAZA[plaza].title}</strong>
                <span>
                  {plaza === 'board'
                    ? dailyOpen + dailyDone > 0
                      ? `오늘의 퍼즐 ${dailyDone}/${dailyOpen + dailyDone} 완료`
                      : '오늘의 퍼즐이 여기 모여요'
                    : plaza === 'garage'
                      ? newLooks > 0
                        ? `새 꾸미기가 ${newLooks}개 있어요!`
                        : '내 기차를 꾸며요'
                      : '기록을 코드로 지켜요'}
                </span>
              </div>
              <button className="primary" onClick={() => onEnter(plaza)}>
                {plaza === 'board' ? '보러 가기' : plaza === 'garage' ? '꾸미러 가기' : '열기'}
              </button>
            </>
          ) : sel ? (
            <>
              <span className="route-card-emblem" style={{ '--world': sel.color } as CSSProperties}>
                <Emblem kind={sel.emblem} />
              </span>
              <div className="route-card-text">
                <strong>{sel.title}</strong>
                <span>{locked(sel) ? `🔒 ${sel.lockNote ?? '아직 잠겨 있어요'}` : sel.state === 'conquered' ? `여행 완료! ★ ${sel.stars}/${sel.maxStars}` : sel.blurb}</span>
              </div>
              {!locked(sel) && (
                <button className="primary" onClick={() => onEnter(sel.id)}>
                  놀러 가기
                </button>
              )}
            </>
          ) : null}
        </div>
        {continueText && (
          <button className="route-continue" onClick={onContinue}>
            <span aria-hidden>▶</span> {continueResume ? '이어하기' : '다음 퍼즐'} · {continueText}
          </button>
        )}
      </div>
    </main>
  );
}

/** How far above the disc the tap area reaches (covers the stop where the train waits). */
const STOP_HIT = 72;
