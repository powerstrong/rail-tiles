import type { ReactNode } from 'react';
import { ButtonArt, DrawbridgeArt, GateArt, LeverArt, TowerArt, TurntableArt, WagonCarArt } from '../ui/art/Season2Art';
import { TileBase } from '../ui/art/SceneryArt';
import { TrainArt } from '../ui/art/TrainArt';
import type { Intro } from '../ui/IntroCard';

const tile = (art: ReactNode) => (
  <g>
    <TileBase variant="grass" alt={false} />
    {art}
  </g>
);
const pair = (a: ReactNode, b: ReactNode) => (
  <g>
    <g transform="translate(-28 0) scale(0.55)">{a}</g>
    <g transform="translate(28 0) scale(0.55)">{b}</g>
  </g>
);

/** Cards for the season 2 stages that bring in something new. */
export const S2_INTROS: Record<string, Intro> = {
  't2-first-gate': {
    title: '버튼과 차단기',
    text: '버튼을 지나가면 같은 색 차단기가 올라가요. 차단기가 닫혀 있으면 기차가 못 지나가요!',
    art: pair(tile(<ButtonArt color={1} pressed={false} />), tile(<GateArt color={1} open={false} across={0} />)),
  },
  't2-bonus-1': {
    title: '보너스: 한 번에 출발',
    text: '출발은 딱 한 번! 레일을 다 놓고 잘 살펴본 다음 출발해요. 실패해도 다음 판은 열려 있어요.',
    art: <TrainArt />,
  },
  't2-two-colors': {
    title: '두 가지 색',
    text: '빨강 버튼은 빨강 차단기, 파랑 버튼은 파랑 차단기만 열어요.',
    art: pair(tile(<ButtonArt color={2} pressed={false} />), tile(<GateArt color={2} open={false} across={0} />)),
  },
  't2-drawbridge': {
    title: '레버와 도개교',
    text: '레버를 지나가면 같은 색 다리가 내려와요. 한 번 더 지나가면 다시 올라가요!',
    art: pair(tile(<LeverArt color={1} on={false} />), <DrawbridgeArt rot={0} joins={[]} down={false} color={1} />),
  },
  't2-bridge-down': {
    title: '내려간 다리',
    text: '처음부터 다리가 내려와 있으면, 레버를 지날 때 다리가 올라가요. 조심!',
    art: <DrawbridgeArt rot={0} joins={[]} down color={1} />,
  },
  't2-water-tower': {
    title: '급수탑',
    text: '증기기관차는 💧 숫자만큼만 달릴 수 있어요. 급수탑을 지나가면 물이 가득 차요!',
    art: tile(<TowerArt filled={false} />),
  },
  't2-turntable': {
    title: '회전판',
    text: '회전판에 들어가면 화살표 쪽으로 빙글 돌아 나가요. 어느 쪽에서 들어가도 돼요.',
    art: <TurntableArt turn={1} />,
  },
  't2-first-wagon': {
    title: '화물칸',
    text: '화물칸이 있는 칸을 지나가면 기차 뒤에 철컥 연결돼요. 모두 데리고 도착역까지!',
    art: (
      <g>
        <g transform="translate(18 0) scale(0.9)">
          <TrainArt />
        </g>
        <g transform="translate(-30 0) scale(0.9)">
          <WagonCarArt />
        </g>
      </g>
    ),
  },
};
