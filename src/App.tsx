import { type Dispatch, type SetStateAction, useEffect, useMemo, useRef, useState } from 'react';
import { continueTarget } from './continue';
import { dailyStreak, dateKey } from './engine/generate';
import type { Stars } from './engine/stars';
import { PROGRESS_KEY, type Progress, absorbSaved, loadProgress, recordClear, saveProgress, totalStars } from './storage';
import { type DailyRow, DailyBoard } from './ui/DailyBoard';
import { Garage } from './ui/Garage';
import { withObject } from './ui/korean';
import { type LookItem, LookContext, STARTER_COUNT, type TrainLook, safeLook, unlockedItems } from './ui/look';
import { layoutRoutes } from './ui/routeLayout';
import { RouteMap, type StationInfo } from './ui/RouteMap';
import { SaveScreen } from './ui/SaveScreen';
import { StageSelect } from './ui/StageSelect';
import { TitleScreen } from './ui/TitleScreen';
import { STORIES, farewellId } from './ui/stories';
import { WorldStory } from './ui/WorldStory';
import { WORLDS, type World, type WorldStage, openedNote, stageCards, untouched, worldById } from './worlds';

type Screen =
  | { name: 'title' }
  /** `fromMap`: opened from the plaza, so "back" returns there. */
  | { name: 'garage'; fromMap?: boolean }
  | { name: 'save'; fromMap?: boolean }
  /** The route map with the plaza (the world list). */
  | { name: 'worlds' }
  /** The plaza notice board: every world's daily puzzle. */
  | { name: 'board' }
  | { name: 'select'; world: string }
  /** A world's arrival story (on the way in the first time) or farewell (once it is all cleared). */
  | { name: 'story'; world: string; farewell?: boolean }
  | { name: 'game'; world: string; index: number }
  /** The puzzle is kept here, so it stays put if the date turns over mid-game. */
  | { name: 'daily'; world: string; stage: WorldStage; fromBoard?: boolean };

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
  // Stars won in another tab show up here too (and are never saved back down).
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === PROGRESS_KEY) setProgress((p) => absorbSaved(p, loadProgress()));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

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
            노선도 광장의 차고에서 바꿔 보세요.
          </span>
        </div>
      )}
    </LookContext.Provider>
  );
}

function Screens({ progress, setProgress, look }: { progress: Progress; setProgress: Dispatch<SetStateAction<Progress>>; look: TrainLook }) {
  const [screen, setScreen] = useState<Screen>({ name: 'title' });
  /** The place picked on the route map: where the train waits when the map opens. */
  // A world that no longer exists (or nothing played yet): start at the first station.
  const [focus, setFocus] = useState<string>(() => (progress.last && worldById(progress.last.world) ? progress.last.world : 'train'));
  const layout = useMemo(() => layoutRoutes(WORLDS.map((w) => ({ id: w.id, parent: WORLDS.find((o) => o.stages.some((s) => s.id === w.unlockAfter))?.id }))), []);
  const resume = continueTarget(progress);
  const cleared = useMemo(() => new Set(Object.keys(progress.stars)), [progress]);
  const stars = totalStars(progress);
  // The date, checked every minute and on coming back to the tab, so daily puzzles roll over at midnight.
  const [today, setToday] = useState(dateKey);
  useEffect(() => {
    const check = () => setToday(dateKey());
    const t = window.setInterval(check, 60_000);
    document.addEventListener('visibilitychange', check);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);

  const onCleared = (id: string, stars: Stars) => setProgress((p) => recordClear(p, id, stars));
  /** The story plays on the way into a world, once, unless the world was already being played. */
  const storyFirst = (w: World) => !!STORIES[w.id] && untouched(w, progress);
  const conquered = (w: World) => w.stages.every((s) => cleared.has(s.id));
  /** The farewell plays once a world is all cleared, on the way back to its stage list. */
  const farewellDue = (w: World) => !!STORIES[w.id] && conquered(w) && !progress.stories?.includes(farewellId(w.id));
  /** To a world's stage list, by way of its arrival or farewell when one is due. */
  const enter = (w: World) =>
    setScreen(storyFirst(w) ? { name: 'story', world: w.id } : farewellDue(w) ? { name: 'story', world: w.id, farewell: true } : { name: 'select', world: w.id });
  const seen = (id: string) => setProgress((p) => (p.stories?.includes(id) ? p : { ...p, stories: [...(p.stories ?? []), id] }));
  const streakOf = (w: World) => (w.daily ? dailyStreak(cleared, today, w.daily.prefix) : 0);
  /** Into a stage, remembering it for "continue". */
  const playStage = (w: World, index: number) => {
    const id = w.stages[index]?.id;
    if (!id) return;
    setProgress((p) => (p.last?.world === w.id && p.last.stage === id ? p : { ...p, last: { world: w.id, stage: id } }));
    setFocus(w.id);
    setScreen({ name: 'game', world: w.id, index });
  };
  const playContinue = () => resume && playStage(resume.world, resume.index);

  // Daily puzzles are built in the background: on the world list once a world's daily is open
  // (so it is ready on arrival), and whenever that world's own screens are showing.
  const here = 'world' in screen ? screen.world : null;
  const wanted = WORLDS.filter((w) => w.daily && (w.id === here || ((screen.name === 'worlds' || screen.name === 'board') && cleared.has(w.daily.unlockAfter))))
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
        continueText={resume?.text ?? null}
        continueResume={!!resume?.resume}
        onContinue={playContinue}
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
          setScreen(screen.fromMap ? { name: 'worlds' } : { name: 'title' });
        }}
      />
    );
  }

  if (screen.name === 'save') return <SaveScreen progress={progress} onLoad={setProgress} onBack={() => setScreen(screen.fromMap ? { name: 'worlds' } : { name: 'title' })} />;

  /** Today's puzzle of a world, as far as the lists need to know. */
  const dailyState = (w: World): DailyRow['state'] => {
    if (!w.daily || !cleared.has(w.daily.unlockAfter)) return 'locked';
    if (cleared.has(`${w.daily.prefix}${today}`)) return 'done';
    const entry = dailies[w.id];
    if (entry?.date === today && entry.stage) return 'open';
    return entry?.date === today && entry.failed ? 'failed' : 'loading';
  };
  const dailyWorlds = WORLDS.filter((w) => w.daily);

  if (screen.name === 'board') {
    const rows: DailyRow[] = dailyWorlds.map((w) => {
      const owner = w.stages.find((s) => s.id === w.daily!.unlockAfter);
      return {
        id: w.id,
        title: w.title,
        color: w.color,
        emblem: w.emblem,
        state: dailyState(w),
        stars: progress.stars[`${w.daily!.prefix}${today}`] ?? 0,
        streak: streakOf(w),
        lockText: `${w.title} ${withObject(owner?.label?.replace(/^STAGE\s*/, '') ?? '')} 깨면 열려요`,
        loadingText: w.daily!.loadingText,
      };
    });
    const playDaily = (id: string) => {
      const w = worldById(id);
      const entry = w && dailies[w.id];
      if (w && entry?.date === today && entry.stage) setScreen({ name: 'daily', world: w.id, stage: entry.stage, fromBoard: true });
    };
    return <DailyBoard rows={rows} date={today} onPlay={playDaily} onBack={() => setScreen({ name: 'worlds' })} />;
  }

  if (screen.name === 'worlds') {
    const stations: StationInfo[] = WORLDS.map((w) => {
      const locked = !!w.unlockAfter && !cleared.has(w.unlockAfter);
      const d = dailyState(w);
      return {
        id: w.id,
        title: w.title,
        blurb: w.blurb,
        color: w.color,
        emblem: w.emblem,
        stars: w.stages.reduce((sum, s) => sum + (progress.stars[s.id] ?? 0), 0),
        maxStars: w.stages.length * 3,
        state: locked ? 'locked' : w.stages.every((s) => cleared.has(s.id)) ? 'conquered' : 'open',
        // Opened along the way and not visited yet (the first world is simply where everyone starts).
        fresh: !!w.unlockAfter && !locked && untouched(w, progress),
        lockNote: w.lockNote,
        from: WORLDS.find((o) => o.stages.some((s) => s.id === w.unlockAfter))?.title,
        daily: d === 'done' ? 'done' : d === 'open' ? 'open' : 'none',
      };
    });
    const states = dailyWorlds.map(dailyState);
    const openPlace = (id: string) => {
      if (id === 'garage') setScreen({ name: 'garage', fromMap: true });
      else if (id === 'mail') setScreen({ name: 'save', fromMap: true });
      else if (id === 'board') setScreen({ name: 'board' });
      else {
        const w = worldById(id);
        if (w) enter(w);
      }
    };
    return (
      <RouteMap
        layout={layout}
        stations={stations}
        focus={focus}
        onFocus={setFocus}
        onEnter={(id) => {
          setFocus(id);
          openPlace(id);
        }}
        onBack={() => setScreen({ name: 'title' })}
        continueText={resume?.text ?? null}
        continueResume={!!resume?.resume}
        onContinue={playContinue}
        newLooks={Math.max(0, unlockedItems(stars).length - (progress.lookSeen ?? STARTER_COUNT))}
        dailyOpen={states.filter((x) => x === 'open').length}
        dailyDone={states.filter((x) => x === 'done').length}
        totalStars={stars}
      />
    );
  }

  const world = worldById(screen.world);
  if (!world) return null;
  const toList = () => enter(world);
  const Game = world.Game;

  if (screen.name === 'story') {
    const story = STORIES[world.id];
    if (!story) return null;
    return (
      <WorldStory
        key={`${world.id}${screen.farewell ? ':bye' : ''}`}
        place={world.title}
        color={world.color}
        story={story}
        mode={screen.farewell ? 'farewell' : 'arrive'}
        first={!world.unlockAfter}
        onDone={() => {
          seen(screen.farewell ? farewellId(world.id) : world.id);
          setScreen({ name: 'select', world: world.id });
        }}
      />
    );
  }

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
        onPick={(index) => playStage(world, index)}
        onBack={() => setScreen({ name: 'worlds' })}
        onStory={STORIES[world.id] ? () => setScreen({ name: 'story', world: world.id }) : undefined}
        onFarewell={STORIES[world.id] && conquered(world) ? () => setScreen({ name: 'story', world: world.id, farewell: true }) : undefined}
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
        onBack={screen.fromBoard ? () => setScreen({ name: 'board' }) : toList}
        onNext={screen.fromBoard ? () => setScreen({ name: 'board' }) : toList}
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
      onNext={() => (hasNext ? playStage(world, next) : toList())}
      onCleared={onCleared}
      clearNote={openedNote(stage.id, progress)}
    />
  );
}
