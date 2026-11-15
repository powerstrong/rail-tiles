import data from './stages.generated.json';
import type { CoralStage } from './model';
import type { Chapter } from '../stages/stages';
export const CORAL_STAGES: CoralStage[] = data;
export const CORAL_CHAPTERS: Chapter[] = [
  { number: 1, title: '첫 무지개 물결', blurb: '왼쪽 위 깃발에서 시작해요. 더 큰 무리를 만나 볼까요?', color: '#d96669', start: 0, count: 10 },
  { number: 2, title: '가운데서 사방으로', blurb: '깃발이 가운데로! 한 색으로 여러 방향을 함께 이어요.', color: '#359d86', start: 10, count: 10 },
  { number: 3, title: '바위 사이 물길', blurb: '바위는 그대로 두고, 돌아가는 물길을 찾아요.', color: '#508ecb', start: 20, count: 10 },
];
