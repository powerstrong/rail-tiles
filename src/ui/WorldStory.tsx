import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { play } from './sound';
import type { Story } from './stories';
import { ARRIVE_MS, SCENE_H, SCENE_W, prefersReduced } from './story/kit';
import './story/story.css';

interface Props {
  /** The world's name and colour. */
  place: string;
  color: string;
  story: Story;
  /** Pulling in the first time, or waving goodbye once every stage is cleared. */
  mode: 'arrive' | 'farewell';
  /** The very first world: "첫 정거장" instead of "다음 정거장". */
  first: boolean;
  onDone: () => void;
}

/**
 * The train pulls into a new world, and the friend who lives there says what is wrong, one
 * bubble at a time, while the world's own scene acts it out. Tapping the scene fast-forwards
 * the ride; "건너뛰기" skips the lot. The farewell works the same way, starting at the station.
 */
export function WorldStory({ place, color, story, mode, first, onDone }: Props) {
  const bye = mode === 'farewell';
  const part = bye ? story.farewell : story;
  const [reduced] = useState(prefersReduced);
  const [arrived, setArrived] = useState(false);
  const [hurry, setHurry] = useState(reduced);
  const [line, setLine] = useState(0);
  const greeted = useRef(false);
  const last = line === part.lines.length - 1;
  const { Scene } = part;

  const onArrive = () => {
    if (greeted.current) return;
    greeted.current = true;
    setArrived(true);
    play('thanks');
  };
  const arriveRef = useRef(onArrive);
  arriveRef.current = onArrive;
  useEffect(() => {
    if (bye) play('arrive');
    else if (!reduced) play('depart');
    // Never leave the bubble waiting if a scene misses its cue.
    const t = window.setTimeout(() => arriveRef.current(), ARRIVE_MS + 1500);
    return () => clearTimeout(t);
  }, [reduced]);

  const advance = () => {
    if (last) {
      play('depart');
      onDone();
      return;
    }
    setLine((n) => n + 1);
  };

  return (
    <main className={`story ${bye ? 'farewell' : ''}`} style={{ '--world': color, '--tail': `${part.tail}%` } as CSSProperties}>
      <button className="secondary story-skip" onClick={onDone}>
        건너뛰기
      </button>
      <p className="story-caption">{bye ? '모든 판을 깼어요!' : `칙칙폭폭… ${first ? '첫' : '다음'} 정거장은`}</p>
      <h1 className={`story-place ${arrived ? 'shown' : ''}`} aria-hidden={!arrived}>
        {bye ? `${place} 여행 완료!` : `${place}!`}
      </h1>

      <svg
        className="story-scene"
        viewBox={`0 0 ${SCENE_W} ${SCENE_H}`}
        role="img"
        aria-label={bye ? `${place} 친구들과 작별 인사를 해요` : `기차가 ${place}에 도착해요`}
        onClick={() => setHurry(true)}
      >
        <Scene beat={arrived ? line : 0} arrived={arrived} hurry={hurry && !arrived} onArrive={onArrive} />
      </svg>

      <div className={`story-bubble ${arrived ? 'shown' : ''}`} aria-live="polite">
        {arrived && (
          <>
            <span className="story-name">{story.friend}</span>
            <p key={line} className="story-line">
              {part.lines[line]}
            </p>
            <div className="story-actions">
              <span className="story-dots" aria-hidden>
                {part.lines.map((_, i) => (
                  <i key={i} className={i <= line ? 'on' : ''} />
                ))}
              </span>
              <button className={last ? 'primary' : 'secondary'} onClick={advance} autoFocus key={last ? 'go' : 'next'}>
                {last ? (bye ? '또 만나요!' : '출발!') : '다음 ▶'}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
