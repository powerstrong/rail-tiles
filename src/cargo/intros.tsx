import type { Intro } from '../ui/IntroCard';
import { GiftBox, GiftIcon, LocoSide, Ribbon, SLOT, WagonArt } from './CargoArt';
import type { Kind } from './model';

const arrow = (x: number, y: number, rot = 0) => (
  <path d="M-7 0 H7 M2 -5 L8 0 L2 5" transform={`translate(${x} ${y}) rotate(${rot})`} stroke="#8A5A33" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
);

/** A wagon with boxes (bottom to top), floor at 0. */
const Wagon = ({ size, ks, tied }: { size: number; ks: Kind[]; tied?: boolean }) => (
  <g>
    <WagonArt size={size} />
    {tied && <Ribbon size={size} part="band" />}
    {ks.map((k, i) => (
      <g key={i} transform={`translate(0 ${-(i + 0.5) * SLOT + 1})`}>
        <GiftBox kind={k} />
      </g>
    ))}
    {tied && <Ribbon size={size} part="bow" />}
  </g>
);

/** Cards for the stages that bring in something new (art in a 120×120 box around 0,0). */
export const CARGO_INTROS: Record<string, Intro> = {
  'cg-first-gift': {
    title: '맨 앞 화차부터!',
    text: '화차를 눌러 맨 위 선물을 들고, 다른 화차를 눌러 내려놓아요. 기관차 바로 뒤 맨 앞 화차가 같은 선물로 꽉 차면 칙칙폭폭 출발!',
    art: (
      <g transform="scale(0.36) translate(40 90)">
        <g transform="translate(-58 0)">
          <LocoSide />
        </g>
        <Wagon size={3} ks={[0, 0, 0]} tied />
        <g transform="translate(96 0)">
          <Wagon size={3} ks={[1, 1]} />
        </g>
        {arrow(-150, -170, 180)}
      </g>
    ),
  },
  'cg-big-lift': {
    title: '같은 선물은 한 번에',
    text: '맨 위에 같은 선물이 여러 개 있으면 크레인이 한꺼번에 들어요. 내려놓을 화차에 자리가 있는 만큼 옮겨져요.',
    art: (
      <g transform="scale(0.4) translate(0 80)">
        <g transform="translate(-60 0)">
          <Wagon size={3} ks={[2, 1, 1]} />
        </g>
        <g transform="translate(60 0)">
          <Wagon size={3} ks={[1]} />
        </g>
        <path d="M-60 -190 C-60 -250 60 -250 60 -140" stroke="#E3AE1F" strokeWidth={7} fill="none" strokeDasharray="12 10" strokeLinecap="round" />
      </g>
    ),
  },
  'cg-ribbon': {
    title: '리본 화차는 기다려요',
    text: '맨 앞이 아닌 화차가 꽉 차면 리본으로 묶이고 차례를 기다려요. 묶인 화차에서는 선물을 뺄 수 없어요. 너무 일찍 묶으면 자리가 모자랄 수 있어요!',
    art: (
      <g transform="scale(0.38) translate(0 90)">
        <g transform="translate(-60 0)">
          <Wagon size={3} ks={[0, 1]} />
        </g>
        <g transform="translate(60 0)">
          <Wagon size={3} ks={[2, 2, 2]} tied />
        </g>
      </g>
    ),
  },
  'cg-one-two': {
    title: '줄줄이 출발',
    text: '맨 앞 화차가 떠나면 줄이 한 칸씩 앞으로 와요. 다음 화차도 리본으로 묶여 있으면 바로 따라 출발! 뒤에 미리 준비해 두면 한 번에 여러 대가 떠나요.',
    art: (
      <g transform="scale(0.3) translate(70 100)">
        <g transform="translate(-58 0)">
          <LocoSide />
        </g>
        <Wagon size={3} ks={[3, 3, 3]} tied />
        <g transform="translate(96 0)">
          <Wagon size={3} ks={[4, 4, 4]} tied />
        </g>
        {arrow(-160, -200, 180)}
        {arrow(-110, -200, 180)}
      </g>
    ),
  },
  'cg-party-1': {
    title: '보너스: 축제 기차',
    text: '크레인 한 번에 여러 대를 줄줄이 출발시키면 축제 성공! 목표 대수만큼 한꺼번에 떠나게 준비한 뒤, 남은 선물도 모두 보내요.',
    art: (
      <g>
        {[-36, 0, 36].map((x, i) => (
          <g key={x} transform={`translate(${x} ${i === 1 ? -8 : 4})`}>
            <rect x={-16} y={-16} width={32} height={32} rx={7} fill="#FFFBF2" stroke="#C2477A" strokeWidth={2.5} />
            <g transform="scale(0.55)">
              <GiftIcon kind={([1, 3, 4] as Kind[])[i]} />
            </g>
          </g>
        ))}
        <text y={44} textAnchor="middle" fontSize={20}>
          🎉🚂🚂
        </text>
      </g>
    ),
  },
  'cg-board': {
    title: '출발 전광판',
    text: '이제 역에 전광판이 생겼어요. 맨 앞 화차는 전광판에 반짝이는 선물로 꽉 차야 떠나요. 다른 선물로 묶이면 줄이 막혀요!',
    art: (
      <g>
        <rect x={-54} y={-46} width={108} height={40} rx={9} fill="#3A3140" stroke="#574A5E" strokeWidth={3} />
        {([0, 2, 4] as Kind[]).map((k, i) => (
          <g key={k} transform={`translate(${-32 + i * 32} -26)`}>
            <rect x={-12} y={-12} width={24} height={24} rx={5} fill="#FFFBF2" stroke={i === 0 ? '#FFD04A' : 'none'} strokeWidth={3} />
            <g transform="scale(0.45)">
              <GiftIcon kind={k} />
            </g>
          </g>
        ))}
        <g transform="translate(0 52) scale(0.3)">
          <Wagon size={3} ks={[0, 0, 0]} tied />
        </g>
      </g>
    ),
  },
  'cg-small-wagon': {
    title: '크고 작은 화차',
    text: '두 칸짜리 작은 화차와 네 칸짜리 큰 화차가 섞여 있어요. 화차가 떠나면 같은 크기의 빈 화차가 맨 뒤에 붙어요.',
    art: (
      <g transform="scale(0.36) translate(0 110)">
        <g transform="translate(-60 0)">
          <Wagon size={2} ks={[1, 1]} tied />
        </g>
        <g transform="translate(60 0)">
          <Wagon size={4} ks={[5, 0, 5]} />
        </g>
      </g>
    ),
  },
};
