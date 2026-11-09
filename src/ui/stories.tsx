import type { ComponentType } from 'react';
import { CargoFarewell, CargoScene } from './story/CargoScene';
import { ClockFarewell, ClockScene } from './story/ClockScene';
import type { SceneProps } from './story/kit';
import { DepotFarewell, DepotScene } from './story/DepotScene';
import { IceFarewell, IceScene } from './story/IceScene';
import { MachineFarewell, MachineScene } from './story/MachineScene';
import { RiverFarewell, RiverScene } from './story/RiverScene';
import { SpaceFarewell, SpaceScene } from './story/SpaceScene';
import { TrainFarewell, TrainScene } from './story/TrainScene';
import { VolcanoFarewell, VolcanoScene } from './story/VolcanoScene';

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
  /** Once every stage is cleared: the friend says goodbye (and gives a present) as the train leaves. */
  farewell: Farewell;
}

export interface Farewell {
  lines: string[];
  Scene: ComponentType<SceneProps>;
  tail: number;
}

/** The ids kept in progress for stories seen: the arrival is the world id, the farewell this. */
export const farewellId = (world: string) => `${world}:bye`;

/** One story per world, by world id (`src/ui/stories.test.ts` checks every world has one). */
export const STORIES: Record<string, Story> = {
  train: {
    friend: '역장님',
    lines: ['어서 와요! 여기는 들꽃 기차 마을이에요.', '그런데 선로가 중간에 뚝 끊겨 있어요.', '레일을 이어서 손님들께 기차를 데려다줄래요?'],
    Scene: TrainScene,
    tail: 44,
    farewell: {
      lines: ['덕분에 마을 사람들이 모두 기차를 탔어요!', '마을 꽃으로 만든 꽃다발이에요. 받아 줘요!', '또 놀러 와요! 칙칙폭폭, 잘 가요!'],
      Scene: TrainFarewell,
      tail: 44,
    },
  },
  ice: {
    friend: '분홍 펭귄',
    lines: ['안녕! 여기는 펭귄 얼음 나라야.', '낚시 구멍에 가고 싶은데, 미끄러워서 멈출 수가 없어!', '어디서 멈출지 생각하면서 밀어 줄래?'],
    Scene: IceScene,
    tail: 50,
    farewell: {
      lines: ['고마워! 이제 다들 낚시 구멍에 딱 멈춰.', '선물로 제일 큰 물고기를 줄게!', '얼음 나라를 잊지 마! 안녕~'],
      Scene: IceFarewell,
      tail: 62,
    },
  },
  machine: {
    friend: '공장 로봇',
    lines: ['삐빅! 로봇 공장에 온 걸 환영해.', '앗, 정전이야! 공장 전구가 모두 꺼져 버렸어…', '거울을 돌려서 레이저 빛을 전구까지 보내 줘!'],
    Scene: MachineScene,
    tail: 16,
    farewell: {
      lines: ['삐빅! 공장에 불이 다 켜졌어. 고마워!', '기념으로 반짝이 전구를 줄게.', '언제든 다시 와. 삐빅 삐빅, 안녕!'],
      Scene: MachineFarewell,
      tail: 16,
    },
  },
  volcano: {
    friend: '섬마을 농부',
    lines: ['어서 와요! 그런데 화산이 우르릉거려요.', '용암이 흘러내려서 마을 쪽으로 오고 있어요!', '돌을 놓아서 용암 길을 막아 주세요!'],
    Scene: VolcanoScene,
    tail: 17,
    farewell: {
      lines: ['마을을 지켜 줘서 정말 고마워요!', '아기 용도 태어났어요! 섬 과일도 가져가요.', '또 놀러 와요! 조심히 가세요!'],
      Scene: VolcanoFarewell,
      tail: 17,
    },
  },
  train2: {
    friend: '기관사',
    lines: ['강바람 철도에 온 걸 환영해요!', '여기에는 차단기, 도개교, 급수탑 같은 장치가 있어요.', '장치를 잘 써서 강 건너 마을까지 달려 봐요!'],
    Scene: RiverScene,
    tail: 37,
    farewell: {
      lines: ['강 건너 마을까지 길이 활짝 열렸어요!', '떠나기 전에 급수탑 물을 가득 채워 줄게요.', '바람 따라 조심히 가요! 안녕!'],
      Scene: RiverFarewell,
      tail: 81,
    },
  },
  depot: {
    friend: '차고지 반장님',
    lines: ['어서 와요! 곧 출발할 시간이에요. 삑삑!', '그런데 객차들이 꽉 막혀서 나갈 수가 없어요!', '객차를 밀어서 출구까지 길을 만들어 줄래요?'],
    Scene: DepotScene,
    tail: 24,
    farewell: {
      lines: ['덕분에 모든 기차가 제시간에 출발했어요!', '떠나기 전에 반짝반짝 닦아 줄게요.', '출발 신호 갑니다! 삑삑, 잘 가요!'],
      Scene: DepotFarewell,
      tail: 24,
    },
  },
  space: {
    friend: '우주 비행사',
    lines: ['둥둥~ 별빛 선로 끝, 우주 정거장이야!', '중력 버튼을 누르면 캡슐들이 다 함께 움직여.', '모두 자기 도킹장에 쏙 들어가게 도와줄래?'],
    Scene: SpaceScene,
    tail: 35,
    farewell: {
      lines: ['모든 캡슐이 무사히 도킹했어! 고마워!', '기념으로 반짝이는 별 조각을 줄게.', '별빛 선로를 타고 조심히 가! 안녕~'],
      Scene: SpaceFarewell,
      tail: 35,
    },
  },
  clock: {
    friend: '시계탑 생쥐',
    lines: ['댕~ 댕~ 안녕! 나는 시계탑에 사는 생쥐야.', '블록들이 똑딱 박자에 맞춰 오르락내리락해.', '박자를 맞춰서 치즈까지 같이 가 줄래?'],
    Scene: ClockScene,
    tail: 70,
    farewell: {
      lines: ['치즈 냠냠! 박자 맞추기 최고였어!', '고마워서 종을 한 번 더 울려 줄게. 댕~', '다음에 또 만나! 똑딱똑딱, 안녕~'],
      Scene: ClockFarewell,
      tail: 72,
    },
  },
  cargo: {
    friend: '화물역 너구리 보따',
    lines: ['어서 와! 나는 화물역 너구리 보따야.', '친구들에게 보낼 선물이 뒤죽박죽이야!', '같은 선물을 모아 맨 앞 화차부터 보내 줘!'],
    Scene: CargoScene,
    tail: 16,
    farewell: {
      lines: ['선물이 모두 친구들에게 도착했대!', '고마워! 너에게도 리본 선물 상자를 줄게.', '또 놀러 와! 칙칙폭폭, 안녕~'],
      Scene: CargoFarewell,
      tail: 16,
    },
  },
};
