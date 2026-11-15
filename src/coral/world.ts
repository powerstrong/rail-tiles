import type { World } from '../worlds';
import { CoralScreen } from './CoralScreen';
import { CORAL_CHAPTERS, CORAL_STAGES } from './stages';
import type { CoralStage } from './model';
export const CORAL_WORLD: World<CoralStage> = {
  id: 'coral', title: '무지개 산호초', blurb: '색을 골라 이웃을 쭉! 적은 물결로 별 세 개',
  color: '#358c81', emblem: 'coral', theme: 'world-coral',
  stages: CORAL_STAGES, chapters: CORAL_CHAPTERS, Game: CoralScreen,
};
