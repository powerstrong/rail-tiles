import type { Intro } from '../ui/IntroCard';
import { CapsuleArt, DockArt, FloorTile, HoleArt, PadArt } from './SpaceArt';

const arrow = (x: number, y: number, rot = 0) => (
  <path d="M-6 0 H6 M2 -5 L7 0 L2 5" transform={`translate(${x} ${y}) rotate(${rot})`} stroke="#4C5C8E" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
);

/** Cards for the stages that bring in something new (art in a 120×120 box around 0,0). */
export const SPACE_INTROS: Record<string, Intro> = {
  'sp-first-gravity': {
    title: '중력 버튼',
    text: '화살표를 누르거나 화면을 쓱 밀면 중력이 그쪽으로 바뀌어요. 캡슐이 한 칸씩 날아가요. 캡슐을 같은 색 도킹장에 넣어요!',
    art: (
      <g>
        <g transform="translate(-30 0) scale(0.45)">
          <FloorTile seed={0.7} />
          <CapsuleArt capsule={0} />
        </g>
        {arrow(0, 0)}
        <g transform="translate(30 0) scale(0.45)">
          <FloorTile seed={0.2} />
          <DockArt capsule={0} lit />
        </g>
      </g>
    ),
  },
  'sp-two-capsules': {
    title: '캡슐 두 대',
    text: '중력은 모든 캡슐을 한꺼번에 움직여요. 한 캡슐이 벽에 막혀 있는 동안 다른 캡슐만 따라잡을 수 있어요.',
    art: (
      <g>
        <g transform="translate(-28 -24) scale(0.42)">
          <CapsuleArt capsule={0} />
        </g>
        <g transform="translate(-28 26) scale(0.42)">
          <CapsuleArt capsule={1} />
        </g>
        {arrow(6, -24)}
        {arrow(6, 26)}
        <g transform="translate(36 -24) scale(0.42)">
          <DockArt capsule={0} lit={false} />
        </g>
        <g transform="translate(36 26) scale(0.42)">
          <DockArt capsule={1} lit={false} />
        </g>
      </g>
    ),
  },
  'sp-booster': {
    title: '부스터 패드',
    text: '주황 부스터에 날아 들어간 캡슐은 화살표 쪽으로 한 칸 더 쓩! 밀려나요. 그 캡슐만 따로 움직일 수 있어요.',
    art: (
      <g>
        <g transform="translate(-30 0) scale(0.45)">
          <FloorTile seed={0.7} />
          <CapsuleArt capsule={1} />
        </g>
        {arrow(0, 0)}
        <g transform="translate(26 0) scale(0.45)">
          <FloorTile seed={0.2} />
          <PadArt dir={2} />
        </g>
        {arrow(26, 30, 90)}
      </g>
    ),
  },
  'sp-wormhole': {
    title: '웜홀',
    text: '웜홀에 날아 들어간 캡슐은 같은 색 웜홀로 순식간에 나와요. 건너편에 다른 캡슐이 있으면 들어간 자리에 그대로 있어요.',
    art: (
      <g>
        <g transform="translate(-30 -18) scale(0.45)">
          <FloorTile seed={0.7} />
          <HoleArt pair={0} />
        </g>
        <path d="M-12 -8 Q0 20 12 8" stroke="#9B6BF0" strokeWidth={3} fill="none" strokeDasharray="4 4" />
        <g transform="translate(30 18) scale(0.45)">
          <FloorTile seed={0.2} />
          <HoleArt pair={0} />
        </g>
        <g transform="translate(30 18) scale(0.3)">
          <CapsuleArt capsule={2} />
        </g>
      </g>
    ),
  },
};
