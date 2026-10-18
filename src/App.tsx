import { useMemo, useState } from 'react';
import { STAGES, TOTAL_PLANNED_STAGES } from './stages/stages';
import { loadProgress, markCleared, saveProgress } from './storage';
import { GameScreen } from './ui/GameScreen';
import { StageSelect } from './ui/StageSelect';
import { TitleScreen } from './ui/TitleScreen';

type Screen = { name: 'title' } | { name: 'select' } | { name: 'game'; index: number };

export function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'title' });
  const [progress, setProgress] = useState(loadProgress);
  const cleared = useMemo(() => new Set(progress.cleared), [progress]);

  const onCleared = (id: string) => {
    setProgress((p) => {
      const next = markCleared(p, id);
      if (next !== p) saveProgress(next);
      return next;
    });
  };

  if (screen.name === 'title') return <TitleScreen onPlay={() => setScreen({ name: 'select' })} />;

  if (screen.name === 'select') {
    return (
      <StageSelect
        stages={STAGES}
        totalPlanned={TOTAL_PLANNED_STAGES}
        cleared={cleared}
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
      onBack={() => setScreen({ name: 'select' })}
      // "Next" is only offered after a clear, which unlocks the following stage.
      onNext={() => setScreen(nextIndex < STAGES.length ? { name: 'game', index: nextIndex } : { name: 'select' })}
      onCleared={onCleared}
    />
  );
}
