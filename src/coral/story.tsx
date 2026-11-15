import { useEffect } from 'react';
import type { Story } from '../ui/stories';
import { Rail, RideTrain, TRACK_Y, type SceneProps } from '../ui/story/kit';
import { COLORS } from './model';
import { CoralEmblem } from './art';

function CoralScene({ beat, hurry, onArrive }: SceneProps) {
  useEffect(() => { if (hurry) onArrive(); }, [hurry, onArrive]);
  return <>
    <rect width="560" height="300" fill="#dcf3ee" /><path d="M0 215Q160 190 310 216T560 205V300H0Z" fill="#e1d3ad" />
    {[65, 140, 400, 490].map((x, i) => <g key={x} transform={`translate(${x} 205)`}><path d="M0 0V-70m0 30-20-16m20-1 18-25m-18 60-20-12" stroke={COLORS[beat >= 2 ? 2 : i]} fill="none" strokeWidth="12" strokeLinecap="round" /><circle cx="22" cy="-92" r="5" fill="none" stroke="#83c8be" strokeWidth="2" /></g>)}
    <g transform="translate(280 157)"><CoralEmblem size={95} /></g>
    <Rail a={[0, TRACK_Y]} b={[560, TRACK_Y]} /><RideTrain path={[[-60, TRACK_Y], [170, TRACK_Y]]} at={1} hurry={hurry} onReach={onArrive} />
  </>;
}
export const CORAL_STORY: Story = {
  friend: '산호 친구 물감이', tail: 50, Scene: CoralScene,
  lines: ['안녕! 무지개 산호 정원에 온 걸 환영해.', '깃발의 색을 바꾸면 같은 색 이웃이 쭉 이어져!', '버튼의 +숫자를 봐. 적은 물결로 별 세 개!'],
  farewell: { tail: 50, Scene: CoralScene, lines: ['바위 너머 친구들까지 모두 만났어!', '반짝이는 무지개 조개를 선물할게.', '언제든 다른 물결을 만들러 와. 안녕!'] },
};
