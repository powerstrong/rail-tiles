import data from './patterns.json';
import { cluesOf, type CloudStage } from './model';
import type { Chapter } from '../stages/stages';
export const CLOUD_STAGES: CloudStage[] = data.map(s => ({ ...s,
  label: `STAGE ${Math.floor((s.number - 1) / 10) + 1}-${(s.number - 1) % 10 + 1}`,
  clues: cluesOf(s.goal, s.rows, s.cols), par: s.rows * s.cols,
}));
export const CLOUD_CHAPTERS: Chapter[] = [
  { number: 1, title: '한 땀과 쉼표', blurb: '붙은 묶음과 빈칸을 직접 익혀요', color: '#4775a1', start: 0, count: 10 },
  { number: 2, title: '가로가 세로에게', blurb: '채운 묶음을 닫고 다른 줄의 실마리로 써요', color: '#54866c', start: 10, count: 10 },
  { number: 3, title: '겹침의 전시회', blurb: '여러 배치가 겹치는 자리를 찾아 작품으로', color: '#93639d', start: 20, count: 10 },
];
