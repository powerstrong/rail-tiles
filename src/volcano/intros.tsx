import type { ReactNode } from 'react';
import type { Intro } from '../ui/IntroCard';
import { CraterArt, EggArt, GrassTile, HouseArt, SeaArt, StoneArt, VillagerArt } from './VolcanoArt';

const tile = (art: ReactNode) => (
  <g>
    <GrassTile seed={0.7} />
    {art}
  </g>
);

/** Cards for the stages that bring in something new. */
export const VOLCANO_INTROS: Record<string, Intro> = {
  'v-first-stone': {
    title: '용암 막기',
    text: '풀밭을 누르면 돌이 놓여요(다시 누르면 치워요). 분출! 하면 용암이 흘러요. 집을 지켜요! 화산 바로 옆 뜨거운 땅에는 돌을 놓을 수 없어요.',
    art: (
      <g>
        <g transform="translate(-26 0) scale(0.55)">
          <CraterArt volume={null} erupting />
        </g>
        <g transform="translate(4 0) scale(0.4)">
          <StoneArt />
        </g>
        <g transform="translate(32 0) scale(0.55)">
          <HouseArt burned={false} />
        </g>
      </g>
    ),
  },
  'v-seaside': { title: '바다', text: '파란 바다는 용암을 막아 줘요. 돌을 아낄 수 있어요!', art: <SeaArt /> },
  'v-escape-1': { title: '보너스: 마을 대피 작전', text: '용암이 벌써 흘러요! 돌을 하나 놓을 때마다 용암이 한 칸씩 번져요. 실패해도 다음 판으로 갈 수 있어요.', art: <VillagerArt mood="worried" /> },
  'v-twin-craters': {
    title: '화산 두 개',
    text: '두 화산에서 동시에 용암이 흘러나와요.',
    art: (
      <g>
        <g transform="translate(-26 0) scale(0.6)">
          <CraterArt volume={null} erupting={false} />
        </g>
        <g transform="translate(26 0) scale(0.6)">
          <CraterArt volume={null} erupting={false} />
        </g>
      </g>
    ),
  },
  'v-dragon-egg': { title: '용의 알', text: '용암이 알에 닿아야 아기 용이 깨어나요. 알로 가는 길은 막으면 안 돼요!', art: tile(<EggArt hatched={false} />) },
  'v-small-crater': { title: '작은 화산', text: '숫자만큼만 흘러요. 돌로 길을 빙 돌게 만들면 집까지 못 와요!', art: tile(<CraterArt volume={4} erupting={false} />) },
};

