import { useEffect, useMemo, useRef, useState } from 'react';
import type { Stars } from './engine/stars';
import { STAGES } from './stages/stages';
import { loadProgress, recordClear, saveProgress } from './storage';
import { GameScreen } from './ui/GameScreen';
import { StageSelect } from './ui/StageSelect';
import { TitleScreen } from './ui/TitleScreen';

type Screen = { name: 'title' } | { name: 'select' } | { name: 'game'; index: number };

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
