import type { ComponentType } from 'react';
import { ClockScene } from './story/ClockScene';
import type { SceneProps } from './story/kit';
import { DepotScene } from './story/DepotScene';
import { IceScene } from './story/IceScene';
import { MachineScene } from './story/MachineScene';
import { RiverScene } from './story/RiverScene';
import { SpaceScene } from './story/SpaceScene';
import { TrainScene } from './story/TrainScene';
import { VolcanoScene } from './story/VolcanoScene';

/** The little play shown the first time the train pulls into a world. */
export interface Story {
  /** Who greets the train, shown on the speech bubble. */
  friend: string;
  /** What the friend says, one bubble each; the scene acts out each line in turn. */
  lines: string[];
  /** The world's own scene. */
  Scene: ComponentType<SceneProps>;
  /** Where the friend stands, as a share of the scene's width: the bubble's tail points there. */
  tail: number;
}

/** One story per world, by world id (`src/ui/stories.test.ts` checks every world has one). */
export const STORIES: Record<string, Story> = {
  train: {
    friend: '역장님',
    lines: ['어서 와요! 여기는 들꽃 기차 마을이에요.', '그런데 선로가 중간에 뚝 끊겨 있어요.', '레일을 이어서 손님들께 기차를 데려다줄래요?'],
    Scene: TrainScene,
    tail: 44,
  },
  ice: {
    friend: '분홍 펭귄',
    lines: ['안녕! 여기는 펭귄 얼음 나라야.', '낚시 구멍에 가고 싶은데, 미끄러워서 멈출 수가 없어!', '어디서 멈출지 생각하면서 밀어 줄래?'],
    Scene: IceScene,
    tail: 50,
  },
  machine: {
    friend: '공장 로봇',
    lines: ['삐빅! 로봇 공장에 온 걸 환영해.', '앗, 정전이야! 공장 전구가 모두 꺼져 버렸어…', '거울을 돌려서 레이저 빛을 전구까지 보내 줘!'],
    Scene: MachineScene,
    tail: 16,
  },
  volcano: {
    friend: '섬마을 농부',
    lines: ['어서 와요! 그런데 화산이 우르릉거려요.', '용암이 흘러내려서 마을 쪽으로 오고 있어요!', '돌을 놓아서 용암 길을 막아 주세요!'],
    Scene: VolcanoScene,
    tail: 17,
  },
  train2: {
    friend: '기관사',
    lines: ['강바람 철도에 온 걸 환영해요!', '여기에는 차단기, 도개교, 급수탑 같은 장치가 있어요.', '장치를 잘 써서 강 건너 마을까지 달려 봐요!'],
    Scene: RiverScene,
    tail: 37,
  },
  depot: {
    friend: '차고지 반장님',
    lines: ['어서 와요! 곧 출발할 시간이에요. 삑삑!', '그런데 객차들이 꽉 막혀서 나갈 수가 없어요!', '객차를 밀어서 출구까지 길을 만들어 줄래요?'],
    Scene: DepotScene,
    tail: 24,
  },
  space: {
    friend: '우주 비행사',
    lines: ['둥둥~ 별빛 선로 끝, 우주 정거장이야!', '중력 버튼을 누르면 캡슐들이 다 함께 움직여.', '모두 자기 도킹장에 쏙 들어가게 도와줄래?'],
    Scene: SpaceScene,
    tail: 35,
  },
  clock: {
    friend: '시계탑 생쥐',
    lines: ['댕~ 댕~ 안녕! 나는 시계탑에 사는 생쥐야.', '블록들이 똑딱 박자에 맞춰 오르락내리락해.', '박자를 맞춰서 치즈까지 같이 가 줄래?'],
    Scene: ClockScene,
    tail: 70,
  },
};
