import type { Intro } from '../ui/IntroCard';
import { BlockArt, ExitArt, FloorTile, HandArt, HubArt, LeverArt, MouseArt } from './ClockArt';

const arrow = (x: number, y: number, rot = 0) => (
  <path d="M-6 0 H6 M2 -5 L7 0 L2 5" transform={`translate(${x} ${y}) rotate(${rot})`} stroke="#8A5A33" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
);

/** Cards for the stages that bring in something new (art in a 120×120 box around 0,0). */
export const CLOCK_INTROS: Record<string, Intro> = {
  'ck-first-steps': {
    title: '시계탑 생쥐',
    text: '화살표를 누르거나 화면을 쓱 밀면 생쥐가 한 칸 가요. 생쥐가 움직일 때마다 시계탑이 똑딱! 치즈가 있는 문까지 가요.',
    art: (
      <g>
        <g transform="translate(-30 0) scale(0.45)">
          <FloorTile seed={0.7} />
          <g transform="rotate(90)">
            <MouseArt />
          </g>
        </g>
        {arrow(0, 0)}
        <g transform="translate(30 0) scale(0.45)">
          <FloorTile seed={0.2} />
          <ExitArt />
        </g>
      </g>
    ),
  },
  'ck-tick-tock': {
    title: '똑딱 블록',
    text: '똑딱할 때마다 빨강 블록과 파랑 블록이 번갈아 올라와요. 지금 내려가 있는 블록은 다음 똑딱에 올라와요!',
    art: (
      <g>
        <g transform="translate(-28 0) scale(0.45)">
          <FloorTile seed={0.7} />
          <BlockArt color={0} up />
        </g>
        <g transform="translate(28 0) scale(0.45)">
          <FloorTile seed={0.2} />
          <BlockArt color={1} up={false} />
        </g>
        <path d="M-10 -34 Q0 -44 10 -34 M10 34 Q0 44 -10 34" stroke="#8A5A33" strokeWidth={3} fill="none" strokeLinecap="round" />
      </g>
    ),
  },
  'ck-rest': {
    title: '쉬기',
    text: '⏳ 쉬기 버튼(또는 생쥐를 톡)을 누르면 제자리에서 한 박자 기다려요. 쉬는 것도 똑딱 한 번이에요.',
    art: (
      <g>
        <g transform="scale(0.6)">
          <FloorTile seed={0.5} />
          <MouseArt happy />
        </g>
        <text x={28} y={-26} fontSize={22} fontWeight={900} fill="#8A5A33">
          Zz
        </text>
      </g>
    ),
  },
  'ck-clock-hand': {
    title: '시계 바늘',
    text: '시계 바늘은 똑딱할 때마다 시계 방향으로 한 칸 돌아요. 바늘이 올 자리에 있으면 안 돼요. 흐린 그림자가 다음 바늘 자리예요.',
    art: (
      <g transform="scale(0.42)">
        <g transform="rotate(90)">
          <HandArt len={1} ghost />
        </g>
        <HandArt len={1} />
        <HubArt />
      </g>
    ),
  },
  'ck-long-hand': {
    title: '긴 바늘',
    text: '긴 바늘은 두 칸을 한꺼번에 쓸고 지나가요. 멀리서도 조심!',
    art: (
      <g transform="translate(0 30) scale(0.34)">
        <g transform="rotate(90)">
          <HandArt len={2} ghost />
        </g>
        <HandArt len={2} />
        <HubArt />
      </g>
    ),
  },
  'ck-lever': {
    title: '거꾸로 레버',
    text: '레버를 밟으면 다음 똑딱부터 모든 바늘이 반대로 돌아요. 다시 밟으면 원래대로!',
    art: (
      <g>
        <g transform="translate(-28 0) scale(0.45)">
          <LeverArt reversed={false} />
        </g>
        {arrow(0, 0)}
        <g transform="translate(28 0) scale(0.45)">
          <LeverArt reversed />
        </g>
      </g>
    ),
  },
};
