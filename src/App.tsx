import { useEffect, useMemo, useRef, useState } from 'react';
import { loadDaily } from './daily/loadDaily';
import { dailyStreak, dateKey } from './engine/generate';
import type { Stage } from './engine/stage';
import type { Stars } from './engine/stars';
import { STAGES } from './stages/stages';
import { loadProgress, recordClear, saveProgress } from './storage';
import { GameScreen } from './ui/GameScreen';
import { StageSelect } from './ui/StageSelect';
import { TitleScreen } from './ui/TitleScreen';

type Screen = { name: 'title' } | { name: 'select' } | { name: 'game'; index: number } | { name: 'daily' };

/** The daily puzzle opens once players have met passengers (stage 6). */
export const DAILY_UNLOCK_AFTER = 6;

export function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'title' });
  const [progress, setProgress] = useState(loadProgress);
  const cleared = useMemo(() => new Set(Object.keys(progress.stars)), [progress]);
  const allCleared = STAGES.every((s) => cleared.has(s.id));

  // Persist outside the state updater (StrictMode may call updaters twice); skip the initial load.
  const loaded = useRef(progress);
  useEffect(() => {
    if (progress !== loaded.current) saveProgress(progress);
  }, [progress]);

  const onCleared = (id: string, stars: Stars) => setProgress((p) => recordClear(p, id, stars));

  // Today's puzzle is built in the background as soon as the stage list is reached.
  const today = dateKey();
  const [daily, setDaily] = useState<{ date: string; stage: Stage | null; failed: boolean }>({ date: today, stage: null, failed: false });
  const wantDaily = screen.name !== 'title';
  useEffect(() => {
    if (!wantDaily || (daily.date === today && (daily.stage || daily.failed))) return;
    let live = true;
    loadDaily(today).then(
      (stage) => live && setDaily({ date: today, stage, failed: false }),
      () => live && setDaily({ date: today, stage: null, failed: true }),
    );
    return () => {
      live = false;
    };
  }, [wantDaily, today, daily]);
  const dailyStage = daily.date === today ? daily.stage : null;
  const dailyUnlocked = cleared.has(STAGES[DAILY_UNLOCK_AFTER - 1].id);
  const streak = dailyStreak(Object.keys(progress.stars), today);

  if (screen.name === 'title') return <TitleScreen onPlay={() => setScreen({ name: 'select' })} />;

  if (screen.name === 'select') {
    return (
      <StageSelect
        stages={STAGES}
        stars={progress.stars}
        cleared={cleared}
        allCleared={allCleared}
        onPick={(index) => setScreen({ name: 'game', index })}
        onBack={() => setScreen({ name: 'title' })}
        daily={{
          title: dailyStage?.title ?? null,
          stars: dailyStage ? (progress.stars[dailyStage.id] ?? 0) : 0,
          unlocked: dailyUnlocked,
          unlockAfter: DAILY_UNLOCK_AFTER,
          failed: daily.failed,
          streak,
          onPlay: () => setScreen({ name: 'daily' }),
        }}
      />
    );
  }

  if (screen.name === 'daily') {
    if (!dailyStage) return null;
    return (
      <GameScreen
        key={dailyStage.id}
        stage={dailyStage}
        hasNext={false}
        allCleared={false}
        bestStars={progress.stars[dailyStage.id] ?? 0}
        onBack={() => setScreen({ name: 'select' })}
        onNext={() => setScreen({ name: 'select' })}
        onCleared={onCleared}
        clearNote={streak > 0 ? `🔥 ${streak}일 연속 클리어 · 내일 새 노선이 열려요` : undefined}
      />
    );
  }

  const stage = STAGES[screen.index];
  const nextIndex = screen.index + 1;
  return (
    <GameScreen
      key={stage.id}
      stage={stage}
      hasNext={nextIndex < STAGES.length}
      allCleared={allCleared}
      bestStars={progress.stars[stage.id] ?? 0}
      onBack={() => setScreen({ name: 'select' })}
      // "Next" is only offered after a clear, which unlocks the following stage.
      onNext={() => setScreen(nextIndex < STAGES.length ? { name: 'game', index: nextIndex } : { name: 'select' })}
      onCleared={onCleared}
    />
  );
}
