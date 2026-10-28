import type { ReactNode } from 'react';
import type { Intro } from '../ui/IntroCard';
import { CrackArt, CurrentArt, FishArt, IGLOO_COLORS, IceTile, IglooArt, PENGUIN_COLORS, PenguinArt, SnowArt, WaterArt } from './IceArt';

const tile = (art: ReactNode) => (
  <g>
    <IceTile seed={0.7} />
    {art}
  </g>
);

/** Cards for the stages that bring in something new. */
export const ICE_INTROS: Record<string, Intro> = {
  'ice-snow-pile': { title: '눈더미', text: '눈더미에 올라서면 푹 빠져서 그 자리에 멈춰요.', art: tile(<SnowArt />) },
  'ice-fish-snack': { title: '물고기', text: '미끄러지는 길에 있는 물고기를 모두 먹어야 집에 갈 수 있어요.', art: tile(<FishArt />) },
  'ice-mind-the-sea': { title: '바다', text: '파란 바다로 미끄러지면 풍덩! 빠지면 다시 해야 해요.', art: <WaterArt /> },
  'ice-igloo-door': { title: '이글루', text: '문으로 쏙 들어가면 같은 번호 이글루 문으로 쑥 나와요.', art: tile(<IglooArt door={2} label="1" color={IGLOO_COLORS[0]} />) },
  'ice-friend': {
    title: '친구 펭귄',
    text: '펭귄이 두 마리! 친구에게 부딪혀도 멈춰요. 펭귄 단추를 눌러 골라요.',
    art: (
      <g>
        <g transform="translate(-24 4) scale(0.8)">
          <PenguinArt color={PENGUIN_COLORS[0]} />
        </g>
        <g transform="translate(26 4) scale(0.8)">
          <PenguinArt color={PENGUIN_COLORS[1]} />
        </g>
      </g>
    ),
  },
  'ice-ride-current': { title: '해류', text: '해류 위를 지나면 화살표 쪽으로 방향이 바뀌어요.', art: tile(<CurrentArt dir={1} />) },
  'ice-cracked': { title: '금 간 얼음', text: '한 번 지나가면 깨져서 바다가 돼요. 두 번은 못 지나가요!', art: tile(<CrackArt />) },
};
