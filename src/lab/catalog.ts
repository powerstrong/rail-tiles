import type { Kind } from './model';
export interface Concept {
  id: Kind; title: string; icon: string; color: string; wash: string;
  skill: string; tagline: string; story: string; goal: string; rules: string[];
  /** Shown over the board for a moment when a stage is solved. */
  cheer: string;
  chapters: string[];
}
export const CONCEPTS: Concept[] = [
  { id: 'twins', title: '거울 토끼의 숲', icon: '🐰', color: '#78579d', wash: '#efe5f8', skill: '대칭 · 협동', tagline: '반대로 움직여도 마음은 함께', story: '거울 숲 양쪽에 사는 루루와 라라. 같은 버튼으로 움직이며 각자의 집에서 달빛 차를 마시기로 했어요.', goal: '두 토끼를 각자의 집에 동시에 데려가요.', cheer: '루루와 라라가 집에 도착했어요!', rules: ['위·아래는 함께, 왼쪽·오른쪽은 서로 반대로 움직여요.', '벽에 막힌 토끼는 쉬고, 다른 토끼만 움직여요.', '집에 도착한 토끼도 다음 버튼에 다시 움직여요. 마지막 자리를 함께 맞춰요.'], chapters: ['거울과 인사해요', '벽이 도와줘요', '달빛 차 약속'] },
  { id: 'bee', title: '꿀벌의 한붓 꽃길', icon: '🐝', color: '#8b6a23', wash: '#f9efc9', skill: '경로 · 전체 보기', tagline: '모든 꽃에게 한 번씩 안녕', story: '꿀벌 보리가 꽃들에게 초대장을 돌려요. 모든 꽃에 딱 한 번씩 들른 다음 벌집으로 돌아와야 해요.', goal: '꽃길의 모든 칸을 한 번씩 지나 벌집에 도착해요.', cheer: '모든 꽃에 초대장을 전했어요!', rules: ['꿀벌 바로 위·아래·왼쪽·오른쪽 꽃을 눌러 날아가요.', '지나간 칸으로 새 길을 만들 수는 없어요. 바로 직전 칸을 누르거나 거꾸로 그리면 끝 한 칸을 지워요.', '벌집은 맨 마지막에만 들어갈 수 있어요. 길이 막히면 되돌려 보세요.', '5장 화살표 꽃에서는 화살표 쪽으로만 나가요. 들어오는 쪽은 자유예요. 되짚기도 언제든 돼요.'], chapters: ['첫 초대장', '갈림길의 약속', '모두 함께 꽃잔치', '두 꽃밭을 잇는 길', '화살표 꽃의 초대'] },
];
export const conceptById = (id: Kind) => CONCEPTS.find(c => c.id === id)!;
