import type { ReactNode } from 'react';
import type { Intro } from '../ui/IntroCard';
import { BulbArt, DoorArt, FilterArt, FloorTile, MirrorArt, RobotArt, SensorArt } from './MachineArt';

const tile = (art: ReactNode) => (
  <g>
    <FloorTile alt={false} />
    {art}
  </g>
);

/** Cards for the stages that bring in something new. */
export const MACHINE_INTROS: Record<string, Intro> = {
  'mc-bolted': { title: '나사 박힌 거울', text: '나사로 고정된 거울은 돌릴 수 없어요. 그대로 이용해요.', art: tile(<MirrorArt startBack={false} spin={0} fixed half={false} hint={false} />) },
  'mc-bonus-1': { title: '보너스: 로봇 구출', text: '로봇의 배터리가 떨어지기 전에 전구를 모두 켜요! 실패해도 다음 판으로 갈 수 있어요.', art: <RobotArt mood="worried" /> },
  'mc-half-mirror': { title: '반투명 거울', text: '빛을 반은 꺾고 반은 그대로 보내요. 빛이 두 갈래가 돼요!', art: tile(<MirrorArt startBack={false} spin={0} fixed={false} half hint={false} />) },
  'mc-sensor-door': {
    title: '센서와 문',
    text: '센서 눈에 빛이 닿으면 노란 셔터 문이 열려요.',
    art: (
      <g>
        <g transform="translate(-28 0) scale(0.6)">
          <SensorArt lit />
        </g>
        <g transform="translate(28 0) scale(0.6)">
          <DoorArt open={false} />
        </g>
      </g>
    ),
  },
  'mc-red-blue': {
    title: '빨강과 파랑',
    text: '빨강 전구는 빨강 빛, 파랑 전구는 파랑 빛으로만 켜져요.',
    art: (
      <g>
        <g transform="translate(-26 0) scale(0.7)">
          <BulbArt need="red" lit />
        </g>
        <g transform="translate(26 0) scale(0.7)">
          <BulbArt need="blue" lit />
        </g>
      </g>
    ),
  },
  'mc-filters': { title: '색 필터', text: '같은 색 빛만 지나가요. 다른 색은 막혀요.', art: tile(<FilterArt color="red" />) },
  'mc-purple': { title: '보라 전구', text: '빨강 빛과 파랑 빛을 둘 다 받아야 켜져요.', art: <BulbArt need="purple" lit /> },
};
