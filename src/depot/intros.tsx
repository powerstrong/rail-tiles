import type { Intro } from '../ui/IntroCard';
import { DEFAULT_LOOK } from '../ui/look';
import { BarrierArt, BlockArt, ButtonArt, FloorTile, LocoArt, WagonArt, secondLook } from './DepotArt';
import type { Vehicle } from './model';

const freight: Vehicle = { glyph: 'A', kind: 'freight', horizontal: true, line: 0, len: 3, color: 1 };

/** Cards for the stages that bring in something new (art in a 120×120 box around 0,0). */
export const DEPOT_INTROS: Record<string, Intro> = {
  'dp-long-freight': {
    title: '긴 화물차',
    text: '화물차는 세 칸이나 돼요. 길이 길어서 비키려면 더 멀리 밀어야 해요.',
    art: (
      <g transform="scale(0.36) translate(-150 -50)">
        <WagonArt v={freight} />
      </g>
    ),
  },
  'dp-water-tower': {
    title: '급수탑과 상자',
    text: '급수탑과 상자는 꿈쩍도 하지 않아요. 기차들이 피해서 다녀야 해요.',
    art: (
      <g>
        <g transform="translate(-28 0) scale(0.55)">
          <FloorTile seed={0.7} />
          <BlockArt deco="tower" />
        </g>
        <g transform="translate(28 0) scale(0.55)">
          <FloorTile seed={0.2} />
          <BlockArt deco="crates" />
        </g>
      </g>
    ),
  },
  'dp-crossing': {
    title: '건널목 버튼',
    text: '노란 버튼 위에 다른 차를 세워 두면 차단기가 올라가요. 차가 버튼에서 떠나면 다시 내려가요.',
    art: (
      <g>
        <g transform="translate(-30 0) scale(0.5)">
          <FloorTile seed={0.7} />
          <ButtonArt pressed={false} />
        </g>
        <path d="M-6 0 H6 M2 -5 L7 0 L2 5" stroke="#2E6F8E" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <g transform="translate(30 0) scale(0.5)">
          <FloorTile seed={0.2} />
          <BarrierArt open armVertical={false} />
        </g>
      </g>
    ),
  },
  'dp-two-engines': {
    title: '기관차 두 대',
    text: '기관차가 두 대! 기관차마다 자기 색 깃발이 달린 출구로 나가야 해요. 먼저 나간 기관차는 길을 비켜 줘요.',
    art: (
      <g>
        <g transform="translate(-50 -48) scale(0.5)">
          <LocoArt look={DEFAULT_LOOK} />
        </g>
        <g transform="translate(-50 -2) scale(0.5)">
          <LocoArt look={secondLook(DEFAULT_LOOK)} />
        </g>
      </g>
    ),
  },
};
