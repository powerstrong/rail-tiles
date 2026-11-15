import data from './stages.generated.json';
import type { Chapter } from '../stages/stages';
import type { PiecesStage } from './model';
export const PIECES_STAGES = data as PiecesStage[];
export const PIECES_CHAPTERS: Chapter[] = [
  { number: 1, title: '빙글빙글 그림 조각', blurb: '모서리를 보고 돌려서 맞춰요. 놓은 조각도 다시 집을 수 있어요.', color: '#25857d', start: 0, count: 10 },
  { number: 2, title: '빈자리도 그림이에요', blurb: '창문은 비워 두고, 오목한 모양에 어떤 조각이 맞을지 찾아요.', color: '#bc7835', start: 10, count: 10 },
  { number: 3, title: '뒤집으면 새 모양', blurb: '돌려도 안 맞나요? 이제 뒤집기로 반대쪽 모양을 만들어요.', color: '#8260aa', start: 20, count: 10 },
];
