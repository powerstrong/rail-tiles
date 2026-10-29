import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { CHIMNEY, TrainArt } from './art/TrainArt';
import { C } from './art/palette';
import { LOOK_ITEMS, type LookItem, SLOTS, type TrainLook, makePuff, nextUnlock, unlockedItems } from './look';

interface Props {
  look: TrainLook;
  stars: number;
  /** Items unlocked as of the last visit: anything beyond gets a NEW badge. */
  seen: number;
  onChange: (look: TrainLook) => void;
  onBack: () => void;
}

const SMOKE_ICON: Record<string, string> = {
  'smoke-cloud': '☁️',
  'smoke-heart': '💗',
  'smoke-star': '⭐',
  'smoke-note': '🎵',
  'smoke-bubble': '🫧',
  'smoke-rainbow': '🌈',
  'smoke-sparkle': '✨',
};

function ItemPreview({ item, look }: { item: LookItem; look: TrainLook }) {
  if (item.slot === 'smoke') return <span className="garage-smoke">{SMOKE_ICON[item.id]}</span>;
  return (
    <svg viewBox="-58 -42 116 84" aria-hidden>
      <TrainArt look={{ ...look, [item.slot]: item.id }} />
    </svg>
  );
}

const SCALE = 2.4;

/** The train up close on a short track, puffing its smoke. */
function Showcase({ look }: { look: TrainLook }) {
  const smokeRef = useRef<SVGGElement>(null);
  useEffect(() => {
    let n = 0;
    const id = window.setInterval(() => {
      smokeRef.current?.appendChild(makePuff(look.smoke, CHIMNEY.x * 1.6, -3 - Math.random() * 6, n++));
    }, 420);
    return () => clearInterval(id);
  }, [look.smoke]);
  return (
    <svg className="garage-showcase" viewBox="-160 -95 320 190" aria-label="꾸민 기차">
      <rect x={-160} y={-95} width={320} height={190} rx={22} fill={C.grass} />
      <rect x={-160} y={-28} width={320} height={56} fill={C.ballast} />
      {Array.from({ length: 14 }, (_, k) => (
        <rect key={k} x={-156 + k * 23} y={-30} width={9} height={60} rx={3} fill={C.tie} />
      ))}
      <path d="M-160 -16 H160 M-160 16 H160" stroke={C.steel} strokeWidth={4} />
      <g transform={`scale(${SCALE})`}>
        <g className="garage-train">
          <TrainArt look={look} />
        </g>
      </g>
      <g ref={smokeRef} transform={`scale(${SCALE / 1.6})`} />
    </svg>
  );
}

/** "기차 꾸미기": dress the train up with what the stars have unlocked. */
export function Garage({ look, stars, seen, onChange, onBack }: Props) {
  // Remember which items were new when the garage opened, so the badges stay while browsing.
  const [newIds] = useState(() => new Set(unlockedItems(stars).slice(seen).map((i) => i.id)));
  const next = nextUnlock(stars);
  const prevStars = [...LOOK_ITEMS].filter((i) => i.stars <= stars).reduce((m, i) => Math.max(m, i.stars), 0);
  const pct = next ? Math.round(((stars - prevStars) / Math.max(1, next.stars - prevStars)) * 100) : 100;

  return (
    <main className="select garage">
      <header className="select-head">
        <button className="icon-btn" onClick={onBack} aria-label="처음 화면으로">
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M15 5 L8 12 L15 19" />
          </svg>
        </button>
        <h1>기차 꾸미기</h1>
        <span className="select-progress">★ {stars}</span>
      </header>

      <Showcase look={look} />

      <div className="garage-next">
        {next ? (
          <>
            <span>
              다음 선물 <b>{next.name}</b>까지 별 <b>{next.stars - stars}</b>개!
            </span>
            <div className="garage-bar">
              <i style={{ width: `${pct}%` }} />
            </div>
          </>
        ) : (
          <span>🎉 모든 꾸미기를 다 모았어요!</span>
        )}
      </div>

      {SLOTS.map(({ slot, title }) => (
        <section key={slot} className="garage-slot">
          <h2>{title}</h2>
          <div className="garage-grid">
            {LOOK_ITEMS.filter((i) => i.slot === slot).map((item) => {
              const open = item.stars <= stars;
              const on = look[slot] === item.id;
              return (
                <button
                  key={item.id}
                  className={`garage-item ${on ? 'on' : ''} ${open ? '' : 'locked'}`}
                  disabled={!open}
                  onClick={() => onChange({ ...look, [slot]: item.id })}
                  aria-pressed={on}
                  aria-label={open ? item.name : `${item.name}, 별 ${item.stars}개에 열려요`}
                  style={{ '--swatch': item.paint?.main ?? '#fff' } as CSSProperties}
                >
                  {newIds.has(item.id) && <span className="new-dot">NEW</span>}
                  <span className="garage-art">{open ? <ItemPreview item={item} look={look} /> : <span className="garage-lock">🔒</span>}</span>
                  <span className="garage-name">{open ? item.name : `★ ${item.stars}`}</span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
}
