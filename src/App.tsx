import { type Dispatch, type SetStateAction, useEffect, useMemo, useRef, useState } from 'react';
import { dailyStreak, dateKey } from './engine/generate';
import type { Stars } from './engine/stars';
import { type Progress, loadProgress, recordClear, saveProgress, totalStars } from './storage';
import { Garage } from './ui/Garage';
import { type LookItem, LookContext, STARTER_COUNT, type TrainLook, safeLook, unlockedItems } from './ui/look';
import { SaveScreen } from './ui/SaveScreen';
import { StageSelect } from './ui/StageSelect';
import { TitleScreen } from './ui/TitleScreen';
import { type WorldCard, WorldSelect } from './ui/WorldSelect';
import { WORLDS, type World, type WorldStage, stageCards, worldById } from './worlds';

type Screen =
  | { name: 'title' }
  | { name: 'garage' }
  | { name: 'save' }
  | { name: 'worlds' }
  | { name: 'select'; world: string }
  | { name: 'game'; world: string; index: number }
  /** The puzzle is kept here, so it stays put if the date turns over mid-game. */
  | { name: 'daily'; world: string; stage: WorldStage };

/** A world's daily puzzle for one date: null while it is being built. */
interface DailyEntry {
  date: string;
  stage: WorldStage | null;
  failed: boolean;
}

/** Progress, the train look and the "new look unlocked" banner, around every screen. */
export function App() {
  const [progress, setProgress] = useState(loadProgress);
  // Persist outside the state updater (StrictMode may call updaters twice); skip the initial load.
  const loaded = useRef(progress);
  useEffect(() => {
    if (progress !== loaded.current) saveProgress(progress);
  }, [progress]);

  const stars = totalStars(progress);
  const look = safeLook(progress.look as Partial<TrainLook> | undefined, stars);
  const unlocked = unlockedItems(stars);
  const known = useRef(unlocked.length);
  const [fresh, setFresh] = useState<LookItem[]>([]);
  useEffect(() => {
    if (unlocked.length > known.current) setFresh(unlocked.slice(known.current));
    known.current = Math.max(known.current, unlocked.length);
  }, [unlocked]);
  useEffect(() => {
    if (!fresh.length) return;
    const t = setTimeout(() => setFresh([]), 6000);
    return () => clearTimeout(t);
  }, [fresh]);

  return (
    <LookContext.Provider value={look}>
      <Screens progress={progress} setProgress={setProgress} look={look} />
      {fresh.length > 0 && (
        <div className="unlock-banner" role="status" onClick={() => setFresh([])}>
          <span className="unlock-gift">🎁</span>
          <span>
            <b>새 꾸미기: {fresh.map((i) => i.name).join(', ')}!</b>
            <br />
            처음 화면의 ‘기차 꾸미기’에서 바꿔 보세요.
          </span>
        </div>
      )}
    </LookContext.Provider>
  );
}

function Screens({ progress, setProgress, look }: { progress: Progress; setProgress: Dispatch<SetStateAction<Progress>>; look: TrainLook }) {
  const [screen, setScreen] = useState<Screen>({ name: 'title' });
  const cleared = useMemo(() => new Set(Object.keys(progress.stars)), [progress]);
  const stars = totalStars(progress);
  const today = dateKey();

  const onCleared = (id: string, stars: Stars) => setProgress((p) => recordClear(p, id, stars));
  const streakOf = (w: World) => (w.daily ? dailyStreak(cleared, today, w.daily.prefix) : 0);

  // Daily puzzles are built in the background: on the world list once a world's daily is open
  // (so it is ready on arrival), and whenever that world's own screens are showing.
  const here = 'world' in screen ? screen.world : null;
  const wanted = WORLDS.filter((w) => w.daily && (w.id === here || (screen.name === 'worlds' && cleared.has(w.daily.unlockAfter))))
    .map((w) => w.id)
    .join(',');
  const [dailies, setDailies] = useState<Record<string, DailyEntry>>({});
  const building = useRef(new Set<string>());
  /** The date last asked for, per world: only that build may land (another can finish late around midnight). */
  const asked = useRef<Record<string, string>>({});
  useEffect(() => {
    for (const w of WORLDS) {
      if (!w.daily || !wanted.split(',').includes(w.id)) continue;
      const entry = dailies[w.id];
      const job = `${w.id}:${today}`;
      if ((entry?.date === today && (entry.stage || entry.failed)) || building.current.has(job)) continue;
      building.current.add(job);
      asked.current[w.id] = today;
      const keep = (next: DailyEntry) => asked.current[w.id] === next.date && setDailies((d) => ({ ...d, [w.id]: next }));
      w.daily
        .load(today)
        .then(
          (stage) => keep({ date: today, stage, failed: false }),
          () => keep({ date: today, stage: null, failed: true }),
        )
        .finally(() => building.current.delete(job));
    }
  }, [wanted, today, dailies]);

  if (screen.name === 'title') {
    return (
      <TitleScreen
        onPlay={() => setScreen({ name: 'worlds' })}
        onGarage={() => setScreen({ name: 'garage' })}
        onSave={() => setScreen({ name: 'save' })}
        newLooks={Math.max(0, unlockedItems(stars).length - (progress.lookSeen ?? STARTER_COUNT))}
      />
    );
  }

  if (screen.name === 'garage') {
    return (
      <Garage
        look={look}
        stars={stars}
        seen={progress.lookSeen ?? STARTER_COUNT}
        onChange={(l) => setProgress((p) => ({ ...p, look: { ...l } }))}
        onBack={() => {
          setProgress((p) => ({ ...p, lookSeen: unlockedItems(totalStars(p)).length }));
          setScreen({ name: 'title' });
        }}
      />
    );
  }

  if (screen.name === 'save') return <SaveScreen progress={progress} onLoad={setProgress} onBack={() => setScreen({ name: 'title' })} />;

  if (screen.name === 'worlds') {
    const cards: WorldCard[] = WORLDS.map((w) => ({
      id: w.id,
      title: w.title,
      blurb: w.blurb,
      color: w.color,
      emblem: w.emblem,
      stars: w.stages.reduce((sum, s) => sum + (progress.stars[s.id] ?? 0), 0),
      maxStars: w.stages.length * 3,
      state: w.unlockAfter && !cleared.has(w.unlockAfter) ? 'locked' : w.stages.every((s) => cleared.has(s.id)) ? 'conquered' : 'open',
      lockNote: w.lockNote,
    }));
    return <WorldSelect worlds={cards} onPick={(id) => setScreen({ name: 'select', world: id })} onBack={() => setScreen({ name: 'title' })} />;
  }

  const world = worldById(screen.world);
  if (!world) return null;
  const toList = () => setScreen({ name: 'select', world: world.id });
  const Game = world.Game;

  if (screen.name === 'select') {
    const daily = world.daily;
    const entry = dailies[world.id];
    const todays = entry?.date === today ? entry : null;
    return (
      <StageSelect
        heading={world.title}
        theme={world.theme}
        stages={stageCards(world)}
        chapters={world.chapters}
        stars={progress.stars}
        cleared={cleared}
        allCleared={world.stages.every((s) => cleared.has(s.id))}
        onPick={(index) => setScreen({ name: 'game', world: world.id, index })}
        onBack={() => setScreen({ name: 'worlds' })}
        daily={
          daily && {
            title: todays?.stage?.title ?? null,
            stars: todays?.stage ? (progress.stars[todays.stage.id] ?? 0) : 0,
            unlocked: cleared.has(daily.unlockAfter),
            unlockAfter: world.stages.find((s) => s.id === daily.unlockAfter)?.label ?? '',
            failed: !!todays?.failed,
            streak: streakOf(world),
            loadingText: daily.loadingText,
            onPlay: () => todays?.stage && setScreen({ name: 'daily', world: world.id, stage: todays.stage }),
          }
        }
      />
    );
  }

  if (screen.name === 'daily') {
    const streak = streakOf(world);
    return (
      <Game
        key={screen.stage.id}
        stage={screen.stage}
        hasNext={false}
        allCleared={false}
        bestStars={progress.stars[screen.stage.id] ?? 0}
        onBack={toList}
        onNext={toList}
        onCleared={onCleared}
        clearNote={streak > 0 ? world.daily?.clearNote(streak) : undefined}
      />
    );
  }

  const stage = world.stages[screen.index];
  if (!stage) return null;
  const next = screen.index + 1;
  const hasNext = next < world.stages.length;
  return (
    <Game
      key={stage.id}
      stage={stage}
      hasNext={hasNext}
      allCleared={world.stages.every((s) => s.id === stage.id || cleared.has(s.id))}
      bestStars={progress.stars[stage.id] ?? 0}
      intro={world.intros?.[stage.id]}
      onBack={toList}
      // "Next" is only offered after a clear, which unlocks the following stage.
      onNext={() => (hasNext ? setScreen({ name: 'game', world: world.id, index: next }) : toList())}
      onCleared={onCleared}
    />
  );
}
