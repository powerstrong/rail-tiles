import data from './stages.generated.json';
import type { FlowStage } from './model';
import type { Chapter } from '../stages/stages';

export const FLOW_STAGES = data as FlowStage[];
export const FLOW_CHAPTERS: Chapter[] = [
  { number: 1, title: '단추와 첫 인사', blurb: '같은 무늬 단추를 이어요. 빈칸은 남아도 좋아요.', color: '#b65b46', start: 0, count: 10 },
  { number: 2, title: '포근한 조각보', blurb: '이제 모든 칸을 실로 채워요. 짧은 길도 돌아가야 할까요?', color: '#307b80', start: 10, count: 10 },
  { number: 3, title: '무늬 고리의 초대', blurb: '같은 무늬의 고리를 지나며 모든 칸을 채워요.', color: '#80539c', start: 20, count: 10 },
];
