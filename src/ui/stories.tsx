import type { ReactNode } from 'react';
import { BlockArt as ClockBlock, ClockFace, MouseArt } from '../clock/ClockArt';
import { BlockArt as DepotBlock } from '../depot/DepotArt';
import { BulbArt, RobotArt } from '../machine/MachineArt';
import { PenguinArt, RockArt as IceRock, SnowArt } from '../penguin/IceArt';
import { CapsuleArt, HoleArt } from '../space/SpaceArt';
import { HouseArt, RockArt as LavaRock, VillagerArt } from '../volcano/VolcanoArt';
import { DecorationArt } from './art/SceneryArt';

/** The little scene shown the first time the train pulls into a world. */
export interface Story {
  /** Who greets the train, shown on the speech bubble. */
  friend: string;
  /** The friend, drawn in a box about 100 wide centred on 0,0 (feet near y = 44); cheerful on the last line. */
  art: (cheer: boolean) => ReactNode;
  /** What the friend says, one bubble each (two or three short lines). */
  lines: string[];
  /** Ground colour of the scene. */
  ground: string;
  /** Three things from the world dotted around the scene, each drawn about one tile (100) across. */
  decor: [ReactNode, ReactNode, ReactNode];
  /** Stars on the ground (the space station). */
  night?: boolean;
}

type Hat = 'conductor' | 'helmet';

/** Board scenery is drawn small inside its tile; this brings it up to the size of the others. */
const Big = ({ children }: { children: ReactNode }) => <g transform="scale(1.7)">{children}</g>;

/** A railway person: the station master, an engine driver, the depot foreman. */
export function PersonArt({ shirt, hat, hatColor, cheer }: { shirt: string; hat: Hat; hatColor: string; cheer: boolean }) {
  return (
    <g>
      <ellipse cy={44} rx={26} ry={7} fill="rgba(0,0,0,0.16)" />
      <path d="M-26 44 Q-26 4 0 4 Q26 4 26 44 Z" fill={shirt} />
      <path d="M-8 4 L0 15 L8 4 Z" fill="#FFF6E2" />
      <circle cx={-13} cy={24} r={2.6} fill="#F4C24F" />
      <circle cy={-16} r={21} fill="#F7D2B4" />
      <path d="M-20 -14 Q-20 -30 -6 -32 L-2 -24 Q-12 -22 -20 -14 Z M20 -14 Q20 -30 6 -32 L2 -24 Q12 -22 20 -14 Z" fill="#5A3E33" />
      <circle cx={-7} cy={-15} r={3.2} fill="#3A3846" />
      <circle cx={7} cy={-15} r={3.2} fill="#3A3846" />
      <circle cx={-6} cy={-16.3} r={1.1} fill="#fff" />
      <circle cx={8} cy={-16.3} r={1.1} fill="#fff" />
      <path d={cheer ? 'M-7 -5 Q0 3 7 -5' : 'M-6 -5 Q0 0 6 -5'} stroke="#3A3846" strokeWidth={2.6} fill="none" strokeLinecap="round" />
      <circle cx={-14} cy={-7} r={3.4} fill="#F59AA8" opacity={0.6} />
      <circle cx={14} cy={-7} r={3.4} fill="#F59AA8" opacity={0.6} />
      {hat === 'conductor' ? (
        <g>
          <path d="M-20 -30 Q-22 -46 0 -47 Q22 -46 20 -30 Z" fill={hatColor} />
          <rect x={-24} y={-32} width={48} height={7} rx={3.5} fill="#2E2C38" />
          <circle cy={-39} r={4} fill="#F4C24F" />
        </g>
      ) : (
        <g>
          <path d="M-22 -26 Q-22 -50 0 -50 Q22 -50 22 -26 Z" fill={hatColor} />
          <path d="M-4 -49 H4 V-27 H-4 Z" fill="#fff" opacity={0.35} />
          <rect x={-27} y={-29} width={54} height={6} rx={3} fill={hatColor} stroke="rgba(0,0,0,0.15)" strokeWidth={1.5} />
        </g>
      )}
    </g>
  );
}

/** One story per world, by world id (`src/ui/stories.test.ts` checks every world has one). */
export const STORIES: Record<string, Story> = {
  train: {
    friend: '역장님',
    art: (cheer) => <PersonArt shirt="#2F5D8A" hat="conductor" hatColor="#2F5D8A" cheer={cheer} />,
    lines: ['어서 와요! 여기는 들꽃 기차 마을이에요.', '마을 사람들이 기차를 기다리는데, 아직 레일이 없어요.', '레일을 이어서 기차를 도착역까지 데려다줄래요?'],
    ground: '#C8E4A6',
    decor: [<Big><DecorationArt deco="tree" seed={0.2} joins={[]} /></Big>, <Big><DecorationArt deco="house" seed={0.5} joins={[]} /></Big>, <Big><DecorationArt deco="tree" seed={0.7} joins={[]} /></Big>],
  },
  ice: {
    friend: '분홍 펭귄',
    art: (cheer) => <PenguinArt color="#EC6A8E" cheer={cheer} />,
    lines: ['안녕! 여기는 펭귄 얼음 나라야.', '낚시터에 가고 싶은데, 얼음이 미끄러워서 멈출 수가 없어!', '어디서 멈출지 생각하면서 밀어 줄래?'],
    ground: '#E4F2FA',
    decor: [<IceRock snowman />, <SnowArt />, <IceRock snowman={false} />],
  },
  machine: {
    friend: '공장 로봇',
    art: (cheer) => <RobotArt mood={cheer ? 'happy' : 'worried'} />,
    lines: ['삐빅! 로봇 공장에 온 걸 환영해.', '정전이 돼서 공장 전구가 모두 꺼져 버렸어…', '거울을 돌려서 레이저 빛을 전구까지 보내 줘!'],
    ground: '#D9DEE8',
    decor: [<BulbArt need="any" lit={false} />, <BulbArt need="red" lit={false} />, <BulbArt need="blue" lit={false} />],
  },
  volcano: {
    friend: '마을 사람',
    art: (cheer) => <VillagerArt mood={cheer ? 'happy' : 'worried'} />,
    lines: ['큰일 났어요! 화산이 부글부글 끓고 있어요.', '용암이 넘치면 마을 집까지 흘러올 거예요.', '돌을 놓아서 용암 길을 막아 주세요!'],
    ground: '#CFE3A8',
    decor: [<HouseArt burned={false} />, <LavaRock />, <HouseArt burned={false} />],
  },
  train2: {
    friend: '기관사',
    art: (cheer) => <PersonArt shirt="#2FA38C" hat="conductor" hatColor="#E5584F" cheer={cheer} />,
    lines: ['강바람 철도에 온 걸 환영해요!', '여기에는 차단기, 도개교, 급수탑 같은 장치가 많아요.', '장치를 잘 써서 강 건너 먼 마을까지 달려 봐요!'],
    ground: '#BFE3D2',
    decor: [<Big><DecorationArt deco="mountain" seed={0.3} joins={[]} /></Big>, <Big><DecorationArt deco="water" seed={0.4} joins={[]} /></Big>, <Big><DecorationArt deco="tree" seed={0.6} joins={[]} /></Big>],
  },
  depot: {
    friend: '차고지 반장님',
    art: (cheer) => <PersonArt shirt="#E0782E" hat="helmet" hatColor="#F4C24F" cheer={cheer} />,
    lines: ['여기는 기차 차고지예요. 곧 출발할 시간인데…', '객차들이 꽉 막혀서 기관차가 나갈 수가 없어요!', '객차를 밀어서 출구까지 길을 만들어 줄래요?'],
    ground: '#E6DDCC',
    decor: [<DepotBlock deco="tower" />, <DepotBlock deco="crates" />, <DepotBlock deco="crates" />],
  },
  space: {
    friend: '우주 비행사',
    art: (cheer) => <CapsuleArt capsule={0} docked={cheer} />,
    lines: ['둥둥~ 우주 정거장에 온 걸 환영해!', '중력 버튼을 누르면 캡슐들이 모두 함께 움직여.', '모두 자기 도킹장에 쏙 들어가게 도와줄래?'],
    ground: '#2B3463',
    decor: [<HoleArt pair={0} />, <CapsuleArt capsule={1} />, <CapsuleArt capsule={2} />],
    night: true,
  },
  clock: {
    friend: '시계탑 생쥐',
    art: (cheer) => <MouseArt happy={cheer} />,
    lines: ['똑딱똑딱! 나는 시계탑에 사는 생쥐야.', '치즈 문까지 가고 싶은데, 블록이 박자에 맞춰 오르내려.', '똑딱 박자를 맞춰서 같이 가 줄래?'],
    ground: '#EAD6B4',
    decor: [<ClockBlock color={0} up />, <ClockFace hour={3} />, <ClockBlock color={1} up={false} />],
  },
};
