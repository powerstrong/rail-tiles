import type { ComponentType } from 'react';
import { CLOCK_DAILY_PREFIX } from './clock/generate';
import { ClockScreen } from './clock/ClockScreen';
import { CLOCK_INTROS } from './clock/intros';
import { CLOCK_CHAPTERS, CLOCK_STAGES } from './clock/stages';
import { loadClockDaily } from './daily/loadClockDaily';
import { loadDaily } from './daily/loadDaily';
import { loadDepotDaily } from './daily/loadDepotDaily';
import { loadIceDaily } from './daily/loadIceDaily';
import { loadSpaceDaily } from './daily/loadSpaceDaily';
import { DepotScreen } from './depot/DepotScreen';
import { DEPOT_DAILY_PREFIX } from './depot/generate';
import { DEPOT_INTROS } from './depot/intros';
import { DEPOT_CHAPTERS, DEPOT_STAGES } from './depot/stages';
import { DAILY_PREFIX } from './engine/generate';
import type { Stars } from './engine/stars';
import type { Progress } from './storage';
import { MACHINE_INTROS } from './machine/intros';
import { MachineScreen } from './machine/MachineScreen';
import { MACHINE_CHAPTERS, MACHINE_STAGES } from './machine/stages';
import { ICE_DAILY_PREFIX } from './penguin/generate';
import { ICE_INTROS } from './penguin/intros';
import { PenguinScreen } from './penguin/PenguinScreen';
import { ICE_CHAPTERS, ICE_STAGES } from './penguin/stages';
import { SPACE_DAILY_PREFIX } from './space/generate';
import { SPACE_INTROS } from './space/intros';
import { SpaceScreen } from './space/SpaceScreen';
import { SPACE_CHAPTERS, SPACE_STAGES } from './space/stages';
import { S2_CHAPTERS, S2_STAGES } from './stages/season2';
import { S2_INTROS } from './stages/season2Intros';
import { CHAPTERS, type Chapter, STAGES } from './stages/stages';
import { GameScreen } from './ui/GameScreen';
import type { Intro } from './ui/IntroCard';
import type { StageCard } from './ui/StageSelect';
import type { WorldCard } from './ui/WorldSelect';
import { VOLCANO_INTROS } from './volcano/intros';
import { VolcanoScreen } from './volcano/VolcanoScreen';
import { VOLCANO_CHAPTERS, VOLCANO_STAGES } from './volcano/stages';

/** What every world's stages have in common. */
export interface WorldStage {
  id: string;
  title: string;
  label?: string;
}

/** What every world's play screen takes. */
export interface GameProps<S> {
  stage: S;
  hasNext: boolean;
  /** Every other stage of the world is cleared, so clearing this one finishes the world. */
  allCleared: boolean;
  /** Best rating so far (0 if never cleared). */
  bestStars: number;
  /** "New thing" card for a stage that brings in a mechanic. */
  intro?: Intro;
  onBack: () => void;
  onNext: () => void;
  onCleared: (stageId: string, stars: Stars) => void;
  /** Extra line on the clear card (e.g. the daily streak). */
  clearNote?: string;
}

export interface DailySpec<S> {
  /** Id prefix of the puzzles (`daily-2026-10-31`); the streak counts ids with it. Unique across worlds. */
  prefix: string;
  /** Stage of this world whose clear opens the daily puzzle. */
  unlockAfter: string;
  load: (date: string) => Promise<S>;
  /** Shown on the stage list while the puzzle is being built. */
  loadingText?: string;
  /** Line on the clear card while a streak is going. */
  clearNote: (streak: number) => string;
}

/**
 * One world: its card, stages, play screen and unlock rule. Adding a world means adding an
 * entry to WORLDS (plus an emblem in WorldSelect); `src/worlds.test.ts` checks every entry.
 */
export interface World<S extends WorldStage = WorldStage> {
  /** Never change once shipped. */
  id: string;
  title: string;
  blurb: string;
  /** Accent colour of the world card. */
  color: string;
  emblem: WorldCard['emblem'];
  /** Extra class on the stage list for the world's colour theme. */
  theme?: string;
  stages: S[];
  chapters: Chapter[];
  intros?: Record<string, Intro>;
  /** Optional side stages: tagged as bonus and never block the way on. */
  isBonus?: (stage: S) => boolean;
  /**
   * Stage (of an earlier world) whose clear opens this world; open from the start without one.
   * It is the last stage of that world's first chapter, so a new player can reach any world
   * within a few chapters. Players' unlocks hang on it: never move it later.
   */
  unlockAfter?: string;
  /** Shown on the locked card. */
  lockNote?: string;
  Game: ComponentType<GameProps<S>>;
  daily?: DailySpec<S>;
}

/** Type-checks one world against its own stage type, then files it with the others. */
const world = <S extends WorldStage>(w: World<S>) => w as unknown as World;

export const WORLDS: World[] = [
  world({
    id: 'train',
    title: '들꽃 기차 마을',
    blurb: '레일을 깔아 기차를 도착역까지',
    color: '#E5584F',
    emblem: 'train',
    stages: STAGES,
    chapters: CHAPTERS,
    Game: GameScreen,
    daily: {
      prefix: DAILY_PREFIX,
      // Once players have met passengers.
      unlockAfter: 'first-passenger',
      load: loadDaily,
      clearNote: (n) => `🔥 ${n}일 연속 클리어 · 내일 새 노선이 열려요`,
    },
  }),
  world({
    id: 'ice',
    title: '펭귄 얼음 나라',
    blurb: '쓱 밀어서 펭귄을 구멍까지 미끄러뜨려요',
    color: '#3F8BD9',
    emblem: 'penguin',
    theme: 'world-ice',
    stages: ICE_STAGES,
    chapters: ICE_CHAPTERS,
    intros: ICE_INTROS,
    unlockAfter: 'last-run',
    lockNote: '들꽃 기차 마을 1장 보스(1-10)를 깨면 열려요',
    Game: PenguinScreen,
    daily: {
      prefix: ICE_DAILY_PREFIX,
      // After the snow-pile stage (1-3).
      unlockAfter: 'ice-snow-pile',
      load: loadIceDaily,
      loadingText: '오늘의 얼음판을 얼리는 중…',
      clearNote: (n) => `🔥 ${n}일 연속 클리어 · 내일 새 얼음판이 열려요`,
    },
  }),
  world({
    id: 'machine',
    title: '로봇 공장',
    blurb: '거울을 돌려 레이저로 전구를 모두 켜요',
    color: '#E3AE1F',
    emblem: 'gear',
    theme: 'world-machine',
    stages: MACHINE_STAGES,
    chapters: MACHINE_CHAPTERS,
    intros: MACHINE_INTROS,
    isBonus: (s) => s.battery !== undefined,
    unlockAfter: 'ice-big-adventure',
    lockNote: '펭귄 얼음 나라 1장 보스(1-10)를 깨면 열려요',
    Game: MachineScreen,
  }),
  world({
    id: 'volcano',
    title: '화산 섬',
    blurb: '돌을 놓아 용암으로부터 마을을 지켜요',
    color: '#F0692E',
    emblem: 'volcano',
    theme: 'world-volcano',
    stages: VOLCANO_STAGES,
    chapters: VOLCANO_CHAPTERS,
    intros: VOLCANO_INTROS,
    isBonus: (s) => !!s.race,
    unlockAfter: 'mc-boss-1',
    lockNote: '로봇 공장 1장 보스(1-10)를 깨면 열려요',
    Game: VolcanoScreen,
  }),
  world({
    id: 'train2',
    title: '강바람 철도',
    blurb: '차단기, 도개교, 급수탑, 회전판, 화물칸!',
    color: '#2FA38C',
    emblem: 'train',
    theme: 'world-train2',
    stages: S2_STAGES,
    chapters: S2_CHAPTERS,
    intros: S2_INTROS,
    isBonus: (s) => !!s.oneShot,
    // Its boards use only what the train world's first chapter teaches (rails and passengers):
    // no tunnels, switches or coloured deliveries.
    unlockAfter: 'last-run',
    lockNote: '들꽃 기차 마을 1장 보스(1-10)를 깨면 열려요',
    Game: GameScreen,
  }),
  world({
    id: 'depot',
    title: '기차 차고지',
    blurb: '객차를 밀어서 기관차를 차고 밖으로!',
    color: '#2E6F8E',
    emblem: 'depot',
    theme: 'world-depot',
    stages: DEPOT_STAGES,
    chapters: DEPOT_CHAPTERS,
    intros: DEPOT_INTROS,
    isBonus: (s) => s.limit !== undefined,
    unlockAfter: 't2-boss-1',
    lockNote: '강바람 철도 1장 보스(1-10)를 깨면 열려요',
    Game: DepotScreen,
    daily: {
      prefix: DEPOT_DAILY_PREFIX,
      // After the water tower stage (1-4).
      unlockAfter: 'dp-water-tower',
      load: loadDepotDaily,
      loadingText: '오늘의 차고지를 정리하는 중…',
      clearNote: (n) => `🔥 ${n}일 연속 클리어 · 내일 새 차고지가 열려요`,
    },
  }),
  world({
    id: 'space',
    title: '우주 정거장',
    blurb: '중력을 바꿔 캡슐을 모두 도킹시켜요',
    color: '#5B4FD1',
    emblem: 'space',
    theme: 'world-space',
    stages: SPACE_STAGES,
    chapters: SPACE_CHAPTERS,
    intros: SPACE_INTROS,
    isBonus: (s) => s.limit !== undefined,
    // Opened with the depot (it used to follow it).
    unlockAfter: 't2-boss-1',
    lockNote: '강바람 철도 1장 보스(1-10)를 깨면 열려요',
    Game: SpaceScreen,
    daily: {
      prefix: SPACE_DAILY_PREFIX,
      // Once every gadget has been met (the wormhole stage, 3-1).
      unlockAfter: 'sp-wormhole',
      load: loadSpaceDaily,
      loadingText: '오늘의 정거장을 띄우는 중…',
      clearNote: (n) => `🔥 ${n}일 연속 클리어 · 내일 새 정거장이 열려요`,
    },
  }),
  world({
    id: 'clock',
    title: '시계탑',
    blurb: '똑딱! 박자를 맞춰 생쥐를 치즈까지',
    color: '#C27C2C',
    emblem: 'clock',
    theme: 'world-clock',
    stages: CLOCK_STAGES,
    chapters: CLOCK_CHAPTERS,
    intros: CLOCK_INTROS,
    isBonus: (s) => s.limit !== undefined,
    unlockAfter: 'sp-boss-1',
    lockNote: '우주 정거장 1장 보스(1-10)를 깨면 열려요',
    Game: ClockScreen,
    daily: {
      prefix: CLOCK_DAILY_PREFIX,
      // Once every gadget has been met (the lever stage, 3-1).
      unlockAfter: 'ck-lever',
      load: loadClockDaily,
      loadingText: '오늘의 시계탑 태엽을 감는 중…',
      clearNote: (n) => `🔥 ${n}일 연속 클리어 · 내일 새 시계탑이 열려요`,
    },
  }),
];

export const worldById = (id: string): World | undefined => WORLDS.find((w) => w.id === id);

/** The stage list's view of a world's stages. */
export const stageCards = (w: World): StageCard[] => w.stages.map((s) => ({ id: s.id, title: s.title, bonus: !!w.isBonus?.(s) }));

/** A world the player has never played: no stars there, and its arrival story not seen. */
export const untouched = (w: World, progress: Pick<Progress, 'stars' | 'stories'>): boolean =>
  !progress.stories?.includes(w.id) && !w.stages.some((s) => progress.stars[s.id]);

/** The clear card's line when a stage opens worlds the player has not been to yet. */
export function openedNote(stageId: string, progress: Pick<Progress, 'stars' | 'stories'>): string | undefined {
  const opened = WORLDS.filter((w) => w.unlockAfter === stageId && untouched(w, progress));
  return opened.length ? `🚂 새 정거장이 열렸어요! ${opened.map((w) => w.title).join(' · ')}` : undefined;
}
