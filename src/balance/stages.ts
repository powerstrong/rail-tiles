import data from './stages.generated.json';
import type { Chapter } from '../stages/stages';
import type { BalanceStage } from './model';
import { CHAPTER_TITLES, DISCOVERIES } from './generate';
export const BALANCE_STAGES = data as BalanceStage[];
export const BALANCE_CHAPTERS: Chapter[] = CHAPTER_TITLES.map((title, i) => ({
  number: i + 1, title, blurb: DISCOVERIES[i], color: '#9560ae', start: i * 10, count: 10,
}));
