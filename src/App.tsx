import { useEffect, useMemo, useRef, useState } from 'react';
import { loadDaily } from './daily/loadDaily';
import { dailyStreak, dateKey } from './engine/generate';
import type { Stage } from './engine/stage';
import type { Stars } from './engine/stars';
import { S2_CHAPTERS, S2_STAGES } from './stages/season2';
import { S2_INTROS } from './stages/season2Intros';
import { CHAPTERS, STAGES } from './stages/stages';
import { loadProgress, recordClear, saveProgress } from './storage';
import { loadIceDaily } from './daily/loadIceDaily';
import { ICE_DAILY_PREFIX } from './penguin/generate';
import type { PenguinStage } from './penguin/model';
import { MACHINE_INTROS } from './machine/intros';
import { MachineScreen } from './machine/MachineScreen';
import { MACHINE_CHAPTERS, MACHINE_STAGES } from './machine/stages';
import { ICE_INTROS } from './penguin/intros';
import { PenguinScreen } from './penguin/PenguinScreen';
import { ICE_CHAPTERS, ICE_STAGES } from './penguin/stages';
import { GameScreen } from './ui/GameScreen';
import { StageSelect } from './ui/StageSelect';
import { TitleScreen } from './ui/TitleScreen';
import { VOLCANO_INTROS } from './volcano/intros';
import { VolcanoScreen } from './volcano/VolcanoScreen';
import { VOLCANO_CHAPTERS, VOLCANO_STAGES } from './volcano/stages';
import { type WorldCard, WorldSelect } from './ui/WorldSelect';

type Screen =
  | { name: 'title' }
  | { name: 'worlds' }
  | { name: 'select' }
  | { name: 'game'; index: number }
  | { name: 'daily' }
  | { name: 'ice-select' }
  | { name: 'ice-game'; index: number }
  | { name: 'ice-daily' }
  | { name: 'mc-select' }
  | { name: 'mc-game'; index: number }
  | { name: 's2-select' }
  | { name: 's2-game'; index: number }
  | { name: 'vo-select' }
  | { name: 'vo-game'; index: number };

/** Train world season 2 opens once the train world's last boss is beaten, like the penguin world. */
const SEASON2_UNLOCK_ID = 'last-delivery';
/** The penguin world opens once the train world's last boss is beaten. */
const ICE_UNLOCK_ID = 'last-delivery';
/** The penguin daily puzzle opens after the snow-pile stage (1-3). */
const ICE_DAILY_UNLOCK_ID = 'ice-snow-pile';
/** The machine world opens once the penguin world's last boss is beaten. */
const MACHINE_UNLOCK_ID = 'ice-conquer';
/** The volcano world opens once the machine world's last boss is beaten. */
const VOLCANO_UNLOCK_ID = 'mc-final-boss';

/** The daily puzzle opens once players have met passengers. */
const DAILY_UNLOCK_ID = 'first-passenger';

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
  const dailyUnlocked = cleared.has(DAILY_UNLOCK_ID);
  const streak = dailyStreak(Object.keys(progress.stars), today);

  // Today's penguin puzzle, built in the background once the penguin world is opened.
  const [iceDaily, setIceDaily] = useState<{ date: string; stage: PenguinStage | null; failed: boolean }>({ date: today, stage: null, failed: false });
  const wantIceDaily = screen.name.startsWith('ice');
  useEffect(() => {
    if (!wantIceDaily || (iceDaily.date === today && (iceDaily.stage || iceDaily.failed))) return;
    let live = true;
    loadIceDaily(today).then(
      (stage) => live && setIceDaily({ date: today, stage, failed: false }),
      () => live && setIceDaily({ date: today, stage: null, failed: true }),
    );
    return () => {
      live = false;
    };
  }, [wantIceDaily, today, iceDaily]);
  const iceDailyStage = iceDaily.date === today ? iceDaily.stage : null;
  const iceStreak = dailyStreak(Object.keys(progress.stars), today, ICE_DAILY_PREFIX);

  if (screen.name === 'title') return <TitleScreen onPlay={() => setScreen({ name: 'worlds' })} />;

  const starsOf = (ids: { id: string }[]) => ids.reduce((sum, s) => sum + (progress.stars[s.id] ?? 0), 0);
  const iceAllCleared = ICE_STAGES.length > 0 && ICE_STAGES.every((s) => cleared.has(s.id));

  if (screen.name === 'worlds') {
    const worlds: WorldCard[] = [
      { id: 'train', title: '기차 월드', blurb: '레일을 깔아 기차를 도착역까지', color: '#E5584F', emblem: 'train', stars: starsOf(STAGES), maxStars: STAGES.length * 3, state: allCleared ? 'conquered' : 'open' },
      {
        id: 'train2',
        title: '기차 월드 2',
        blurb: '차단기, 도개교, 급수탑, 회전판, 화물칸!',
        color: '#2FA38C',
        emblem: 'train',
        stars: starsOf(S2_STAGES),
        maxStars: S2_STAGES.length * 3,
        state: !cleared.has(SEASON2_UNLOCK_ID) ? 'locked' : S2_STAGES.every((s) => cleared.has(s.id)) ? 'conquered' : 'open',
        lockNote: '기차 월드 마지막 배달(4-10)을 깨면 열려요',
      },
      {
        id: 'ice',
        title: '펭귄 얼음 나라',
        blurb: '쓱 밀어서 펭귄을 구멍까지 미끄러뜨려요',
        color: '#3F8BD9',
        emblem: 'penguin',
        stars: starsOf(ICE_STAGES),
        maxStars: ICE_STAGES.length * 3,
        state: !cleared.has(ICE_UNLOCK_ID) ? 'locked' : iceAllCleared ? 'conquered' : 'open',
        lockNote: '기차 월드 마지막 배달(4-10)을 깨면 열려요',
      },
      {
        id: 'machine',
        title: '로봇 공장',
        blurb: '거울을 돌려 레이저로 전구를 모두 켜요',
        color: '#E3AE1F',
        emblem: 'gear',
        stars: starsOf(MACHINE_STAGES),
        maxStars: MACHINE_STAGES.length * 3,
        state: !cleared.has(MACHINE_UNLOCK_ID) ? 'locked' : MACHINE_STAGES.every((s) => cleared.has(s.id)) ? 'conquered' : 'open',
        lockNote: '펭귄 얼음 나라 마지막 보스(3-10)를 깨면 열려요',
      },
      {
        id: 'volcano',
        title: '화산 섬',
        blurb: '돌을 놓아 용암으로부터 마을을 지켜요',
        color: '#F0692E',
        emblem: 'volcano',
        stars: starsOf(VOLCANO_STAGES),
        maxStars: VOLCANO_STAGES.length * 3,
        state: !cleared.has(VOLCANO_UNLOCK_ID) ? 'locked' : VOLCANO_STAGES.every((s) => cleared.has(s.id)) ? 'conquered' : 'open',
        lockNote: '로봇 공장 마지막 보스(3-10)를 깨면 열려요',
      },
    ];
    return (
      <WorldSelect
        worlds={worlds}
        onPick={(id) =>
          setScreen(
            id === 'ice'
              ? { name: 'ice-select' }
              : id === 'machine'
                ? { name: 'mc-select' }
                : id === 'volcano'
                  ? { name: 'vo-select' }
                  : id === 'train2'
                    ? { name: 's2-select' }
                    : { name: 'select' },
          )
        }
        onBack={() => setScreen({ name: 'title' })}
      />
    );
  }

  if (screen.name === 'ice-select') {
    return (
      <StageSelect
        heading="펭귄 얼음 나라"
        theme="world-ice"
        stages={ICE_STAGES}
        chapters={ICE_CHAPTERS}
        stars={progress.stars}
        cleared={cleared}
        allCleared={iceAllCleared}
        onPick={(index) => setScreen({ name: 'ice-game', index })}
        onBack={() => setScreen({ name: 'worlds' })}
        daily={{
          title: iceDailyStage?.title ?? null,
          stars: iceDailyStage ? (progress.stars[iceDailyStage.id] ?? 0) : 0,
          unlocked: cleared.has(ICE_DAILY_UNLOCK_ID),
          unlockAfter: ICE_STAGES.find((s) => s.id === ICE_DAILY_UNLOCK_ID)?.label ?? '',
          failed: iceDaily.failed,
          streak: iceStreak,
          loadingText: '오늘의 얼음판을 얼리는 중…',
          onPlay: () => setScreen({ name: 'ice-daily' }),
        }}
      />
    );
  }

  if (screen.name === 'mc-select') {
    return (
      <StageSelect
        heading="로봇 공장"
        theme="world-machine"
        stages={MACHINE_STAGES}
        chapters={MACHINE_CHAPTERS}
        stars={progress.stars}
        cleared={cleared}
        allCleared={MACHINE_STAGES.every((s) => cleared.has(s.id))}
        onPick={(index) => setScreen({ name: 'mc-game', index })}
        onBack={() => setScreen({ name: 'worlds' })}
      />
    );
  }

  if (screen.name === 's2-select') {
    return (
      <StageSelect
        heading="기차 월드 2"
        theme="world-train2"
        stages={S2_STAGES.map((s) => ({ id: s.id, title: s.title, race: s.oneShot }))}
        chapters={S2_CHAPTERS}
        stars={progress.stars}
        cleared={cleared}
        allCleared={S2_STAGES.every((s) => cleared.has(s.id))}
        onPick={(index) => setScreen({ name: 's2-game', index })}
        onBack={() => setScreen({ name: 'worlds' })}
      />
    );
  }

  if (screen.name === 's2-game') {
    const stage = S2_STAGES[screen.index];
    const nextIndex = screen.index + 1;
    return (
      <GameScreen
        key={stage.id}
        stage={stage}
        hasNext={nextIndex < S2_STAGES.length}
        allCleared={S2_STAGES.every((s) => s.id === stage.id || cleared.has(s.id))}
        bestStars={progress.stars[stage.id] ?? 0}
        intro={S2_INTROS[stage.id]}
        onBack={() => setScreen({ name: 's2-select' })}
        onNext={() => setScreen(nextIndex < S2_STAGES.length ? { name: 's2-game', index: nextIndex } : { name: 's2-select' })}
        onCleared={onCleared}
      />
    );
  }

  if (screen.name === 'vo-select') {
    return (
      <StageSelect
        heading="화산 섬"
        theme="world-volcano"
        stages={VOLCANO_STAGES}
        chapters={VOLCANO_CHAPTERS}
        stars={progress.stars}
        cleared={cleared}
        allCleared={VOLCANO_STAGES.every((s) => cleared.has(s.id))}
        onPick={(index) => setScreen({ name: 'vo-game', index })}
        onBack={() => setScreen({ name: 'worlds' })}
      />
    );
  }

  if (screen.name === 'vo-game') {
    const stage = VOLCANO_STAGES[screen.index];
    const nextIndex = screen.index + 1;
    return (
      <VolcanoScreen
        key={stage.id}
        stage={stage}
        hasNext={nextIndex < VOLCANO_STAGES.length}
        bestStars={progress.stars[stage.id] ?? 0}
        intro={VOLCANO_INTROS[stage.id]}
        onBack={() => setScreen({ name: 'vo-select' })}
        onNext={() => setScreen(nextIndex < VOLCANO_STAGES.length ? { name: 'vo-game', index: nextIndex } : { name: 'vo-select' })}
        onCleared={onCleared}
      />
    );
  }

  if (screen.name === 'mc-game') {
    const stage = MACHINE_STAGES[screen.index];
    const nextIndex = screen.index + 1;
    return (
      <MachineScreen
        key={stage.id}
        stage={stage}
        hasNext={nextIndex < MACHINE_STAGES.length}
        bestStars={progress.stars[stage.id] ?? 0}
        intro={MACHINE_INTROS[stage.id]}
        onBack={() => setScreen({ name: 'mc-select' })}
        onNext={() => setScreen(nextIndex < MACHINE_STAGES.length ? { name: 'mc-game', index: nextIndex } : { name: 'mc-select' })}
        onCleared={onCleared}
      />
    );
  }

  if (screen.name === 'ice-daily') {
    if (!iceDailyStage) return null;
    return (
      <PenguinScreen
        key={iceDailyStage.id}
        stage={iceDailyStage}
        hasNext={false}
        bestStars={progress.stars[iceDailyStage.id] ?? 0}
        onBack={() => setScreen({ name: 'ice-select' })}
        onNext={() => setScreen({ name: 'ice-select' })}
        onCleared={onCleared}
        clearNote={iceStreak > 0 ? `🔥 ${iceStreak}일 연속 클리어 · 내일 새 얼음판이 열려요` : undefined}
      />
    );
  }

  if (screen.name === 'ice-game') {
    const stage = ICE_STAGES[screen.index];
    const nextIndex = screen.index + 1;
    return (
      <PenguinScreen
        key={stage.id}
        stage={stage}
        hasNext={nextIndex < ICE_STAGES.length}
        bestStars={progress.stars[stage.id] ?? 0}
        intro={ICE_INTROS[stage.id]}
        onBack={() => setScreen({ name: 'ice-select' })}
        onNext={() => setScreen(nextIndex < ICE_STAGES.length ? { name: 'ice-game', index: nextIndex } : { name: 'ice-select' })}
        onCleared={onCleared}
      />
    );
  }

  if (screen.name === 'select') {
    return (
      <StageSelect
        stages={STAGES}
        chapters={CHAPTERS}
        stars={progress.stars}
        cleared={cleared}
        allCleared={allCleared}
        heading="기차 월드"
        onPick={(index) => setScreen({ name: 'game', index })}
        onBack={() => setScreen({ name: 'worlds' })}
        daily={{
          title: dailyStage?.title ?? null,
          stars: dailyStage ? (progress.stars[dailyStage.id] ?? 0) : 0,
          unlocked: dailyUnlocked,
          unlockAfter: STAGES.find((s) => s.id === DAILY_UNLOCK_ID)?.label ?? '',
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
