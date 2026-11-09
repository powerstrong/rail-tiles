import type { Chapter } from '../stages/stages';
import { type CargoStage, type CargoStageDef, parseCargoStage } from './model';

/**
 * Gift freight yard world: three chapters of ten. In each chapter stage 5 is a bonus ("축제
 * 기차": one crane move must send that many trains in a row) and stage 10 is the boss. Ids start
 * with `cg-`. The first lessons are hand-made; the rest were searched with
 * scripts/cargo-search.ts (specs in scripts/cargo-specs.ts) and picked by hand. Every stage's par
 * and answer are checked by tests. Wagons are `size:boxes` bottom to top, answers are crane moves
 * `13` = wagon 1 to wagon 3. Gifts: F fish, W flower, C cheese, S star, M melon, G gear.
 */

const CH1: CargoStageDef[] = [
  // par 2, score 7.7, bits 2.0, states 10, traps 20%, chain 1, shortest answers 1, naive 2, no line 2
  { id: 'cg-first-gift', title: '첫 선물', tip: '2번 화차를 눌러 물고기를 들고, 1번 화차를 눌러 내려놓아요!', wagons: ['3:FF', '3:WWF', '3:W'], board: '', par: 2, solution: '21 21' },
  // par 3, score 10.2, bits 3.0, states 15, traps 20%, chain 1, shortest answers 1, naive 3, no line 3
  { id: 'cg-big-lift', title: '한꺼번에 번쩍', tip: '맨 위에 같은 선물이 겹쳐 있으면 크레인이 한 번에 들어 올려요.', wagons: ['3:WF', '3:FWW', '3:F'], board: '', par: 3, solution: '13 21 21' },
  // par 3, score 17.5, bits 6.3, states 108, traps 33%, chain 2, shortest answers 1, naive 3, no line 3
  { id: 'cg-ribbon', title: '리본 화차', tip: '뒤쪽 화차가 먼저 꽉 차면 리본을 묶고 차례를 기다려요.', wagons: ['3:FW', '3:WWF', '3:F', '3:'], board: '', par: 3, solution: '23 12 31' },
  // par 4, score 20.1, bits 5.6, states 923, traps 40%, chain 3, shortest answers 4, naive Infinity, no line 3
  { id: 'cg-one-two', title: '줄줄이 출발', tip: '뒤에 리본 화차를 미리 준비하면 한 번에 줄줄이 떠나요!', wagons: ['3:', '3:FF', '3:GG', '3:FMG', '3:MM'], board: '', par: 4, solution: '43 41 42 51' },
  // par 6, score 22.0, bits 6.9, states 122, traps 54%, chain 2, shortest answers 2, naive Infinity, no line null, no chain goal 5
  { id: 'cg-party-1', title: '축제 기차', tip: '크레인 한 번에 2대를 줄줄이 출발시켜요!', wagons: ['3:MMS', '3:SWW', '3:', '3:WSM'], board: '', par: 6, solution: '23 12 41 34 32 41', chain: 2 },
  // par 5, score 19.7, bits 4.9, states 1195, traps 39%, chain 3, shortest answers 12, naive Infinity, no line 4
  { id: 'cg-back-first', title: '출발 준비', tip: '어느 화차부터 준비하면 좋을까요?', wagons: ['3:', '3:CC', '3:SSF', '3:CFS', '3:F'], board: '', par: 5, solution: '31 43 41 42 51' },
  // par 7, score 23.0, bits 6.6, states 104, traps 50%, chain 3, shortest answers 2, naive Infinity, no line 6
  { id: 'cg-waiting-line', title: '두 번 가는 별', tip: '별은 화차 두 대에 나눠 보내야 해요.', wagons: ['3:SFS', '3:FSS', '3:FWW', '3:', '3:WSS'], board: '', par: 7, solution: '14 24 21 32 13 51 41' },
  // par 9, score 21.9, bits 5.0, states 102, traps 44%, chain 3, shortest answers 8, naive Infinity, no line 8
  { id: 'cg-four-gifts', title: '네 가지 선물', tip: '선물이 네 가지예요. 빈 화차를 잘 써요!', wagons: ['3:FSG', '3:', '3:GSF', '3:MMG', '3:SFM'], board: '', par: 9, solution: '12 42 54 35 31 23 12 51 41' },
  // par 9, score 27.8, bits 8.0, states 1070, traps 41%, chain 3, shortest answers 5, naive Infinity, no line 8
  { id: 'cg-tight-yard', title: '비좁은 화물역', tip: '꽉 채우면 리본이 묶여요. 빈자리도 살펴봐요!', wagons: ['3:MGG', '3:SWM', '3:', '3:SMW', '3:GSW'], board: '', par: 9, solution: '43 24 23 53 25 12 41 43 41' },
  // par 10, score 33.6, bits 11.9, states 1054, traps 45%, chain 3, shortest answers 3, naive Infinity, no line 9
  { id: 'cg-boss-1', title: '첫 번째 큰 배달', tip: '1장 보스! 모은 선물을 차례로 보내 봐요!', wagons: ['3:SMW', '3:CMS', '3:CWM', '3:', '3:WCS'], board: '', par: 10, solution: '34 13 14 21 24 51 14 21 42 41' },
];

const CH2: CargoStageDef[] = [
  // par 6, score 19.3, bits 6.2, states 34, traps 44%, chain 2, shortest answers 2, naive Infinity, no line 5, no board 5
  { id: 'cg-board', title: '출발 전광판', tip: '전광판에 반짝이는 선물부터 출발해요!', wagons: ['3:MMF', '3:', '3:GFM', '3:GGF'], board: 'FMG', par: 6, solution: '32 13 12 31 41 21' },
  // par 8, score 19.1, bits 5.6, states 138, traps 41%, chain 2, shortest answers 102, naive Infinity, no line 6, no board 7
  { id: 'cg-fish-first', title: '차례를 지켜요', tip: '지금 떠날 선물은 무엇일까요?', wagons: ['3:', '3:MWS', '3:MSS', '3:WMW'], board: 'SWM', par: 8, solution: '21 31 14 12 31 32 31 41' },
  // par 7, score 24.0, bits 7.0, states 78, traps 64%, chain 3, shortest answers 2, naive Infinity, no line 6, no board 6
  { id: 'cg-twice', title: '톱니가 두 번', tip: '같은 선물이 전광판에 두 번 나오면 화차 두 대가 필요해요.', wagons: ['3:WWS', '3:GGW', '3:', '3:GSG', '3:GGS'], board: 'SGWG', par: 7, solution: '23 42 14 13 41 51 21' },
  // par 9, score 26.8, bits 10.4, states 1119, traps 45%, chain 2, shortest answers 361, naive Infinity, no line 7, no board 7
  { id: 'cg-wrong-front', title: '전광판을 잘 봐요', tip: '맨 앞 화차를 차례가 아닌 선물로 채우면 줄이 막혀요!', wagons: ['3:SSW', '3:', '3:WMW', '3:WWS', '3:MWM'], board: 'SWMW', par: 9, solution: '12 32 41 25 21 31 32 31 41' },
  // par 8, score 29.4, bits 12.8, states 1277, traps 48%, chain 2, shortest answers 140, naive Infinity, no line 7, no board 7, no chain goal 7
  { id: 'cg-party-2', title: '축제 전광판', tip: '전광판 순서대로, 한 번에 2대를 줄줄이 보내요!', wagons: ['3:', '3:GGM', '3:GMM', '3:GFF', '3:GFG'], board: 'MGFG', par: 8, solution: '21 31 21 21 32 34 32 41', chain: 2 },
  // par 9, score 31.4, bits 12.8, states 373, traps 46%, chain 2, shortest answers 5, naive Infinity, no line 7, no board 8
  { id: 'cg-timetable', title: '수박 시간표', tip: '수박 기차가 두 번 떠나요. 사이에 치즈도 있어요!', wagons: ['3:FMM', '3:MMC', '3:MFC', '3:', '3:CMF'], board: 'FMCM', par: 9, solution: '14 51 54 35 31 15 21 31 41' },
  // par 9, score 32.0, bits 11.6, states 767, traps 54%, chain 3, shortest answers 6, naive Infinity, no line 8, no board 8
  { id: 'cg-ready-wait', title: '기다리는 선물', tip: '리본을 묶어도 앞차가 떠날 때까지 기다려요.', wagons: ['3:MWM', '3:SSW', '3:SMS', '3:', '3:SWS'], board: 'MSWS', par: 9, solution: '34 13 54 15 31 23 12 42 41' },
  // par 9, score 33.3, bits 12.3, states 1095, traps 67%, chain 2, shortest answers 5, naive Infinity, no line 7, no board 7
  { id: 'cg-rush-hour', title: '바쁜 아침', tip: '네 가지 선물이 차례를 기다려요.', wagons: ['3:FFM', '3:MCF', '3:SMC', '3:', '3:CSS'], board: 'FMCS', par: 9, solution: '54 35 13 21 15 21 12 31 41' },
  // par 12, score 38.7, bits 16.3, states 356, traps 48%, chain 2, shortest answers 10, naive Infinity, no line 9, no board 11
  { id: 'cg-five-trains', title: '다섯 대 출발', tip: '보낼 기차가 다섯 대예요!', wagons: ['3:MMG', '3:', '3:MGM', '3:GSS', '3:MCM', '3:CSC'], board: 'SMCGM', par: 12, solution: '32 13 12 41 34 53 65 61 15 31 41 31' },
  // par 12, score 42.1, bits 17.9, states 216, traps 56%, chain 4, shortest answers 3, naive Infinity, no line 9, no board 10
  { id: 'cg-boss-2', title: '축제 전날 밤', tip: '2장 보스! 축제 선물을 모두 보내 봐요!', wagons: ['3:MWF', '3:WFW', '3:', '3:GWW', '3:MGG', '3:WFM'], board: 'MFWGW', par: 12, solution: '43 54 65 16 13 51 14 16 14 51 54 61' },
];

const CH3: CargoStageDef[] = [
  // par 4, score 14.2, bits 4.2, states 45, traps 42%, chain 2, shortest answers 9, naive Infinity, no line 3
  { id: 'cg-small-wagon', title: '작은 화차', tip: '두 칸짜리 화차는 선물 두 개면 꽉 차요.', wagons: ['2:GS', '3:SSG', '2:', '3:SS'], board: '', par: 4, solution: '13 21 12 31' },
  // par 7, score 20.9, bits 8.9, states 64, traps 23%, chain 1, shortest answers 8, naive 8, no line 5, no board 5
  { id: 'cg-big-wagon', title: '큰 화차', tip: '네 칸짜리 큰 화차는 선물 네 개가 있어야 떠나요.', wagons: ['4:', '2:WC', '2:MC', '4:WMCC'], board: 'CMW', par: 7, solution: '21 31 41 23 12 31 21' },
  // par 7, score 24.0, bits 10.4, states 102, traps 31%, chain 1, shortest answers 4, naive Infinity, no line 6, no board 6
  { id: 'cg-sizes-board', title: '크기를 맞춰요', tip: '선물 개수에 맞는 크기의 화차를 골라요.', wagons: ['3:MF', '2:', '3:CMC', '4:MFF'], board: 'FCM', par: 7, solution: '14 32 13 41 23 21 21' },
  // par 8, score 24.8, bits 7.8, states 31, traps 61%, chain 3, shortest answers 2, naive Infinity, no line 7, no board 7
  { id: 'cg-swap-sizes', title: '돌아오는 빈 화차', tip: '화차가 떠나면 같은 크기의 빈 화차가 맨 뒤에 붙어요.', wagons: ['4:CGFC', '2:CG', '2:FC', '4:'], board: 'CFG', par: 8, solution: '14 34 31 23 24 12 13 41' },
  // par 6, score 22.9, bits 6.3, states 345, traps 68%, chain 3, shortest answers 10, naive Infinity, no line null, no chain goal 5
  { id: 'cg-party-3', title: '대축제 기차', tip: '크레인 한 번에 3대를 줄줄이 출발시켜요!', wagons: ['3:GCC', '2:GS', '2:', '3:SG', '3:SGG'], board: '', par: 6, solution: '13 41 24 12 51 21', chain: 3 },
  // par 7, score 28.2, bits 11.6, states 285, traps 41%, chain 2, shortest answers 2, naive Infinity, no line 6, no board 6
  { id: 'cg-mixed-line', title: '큰 화차 작은 화차', tip: '화차 크기마다 필요한 선물 수가 달라요.', wagons: ['2:', '4:WWW', '3:SMS', '2:MW', '3:WSW'], board: 'MWSW', par: 7, solution: '42 41 54 35 31 31 21' },
  // par 10, score 33.7, bits 13.8, states 1114, traps 52%, chain 3, shortest answers 86, naive Infinity, no line 9, no board 9
  { id: 'cg-big-small-board', title: '뒤섞인 줄', tip: '크고 작은 화차가 섞여 있어요. 수박은 두 번 떠나요.', wagons: ['3:MSW', '3:', '3:MSM', '2:MW', '4:SWM'], board: 'MSWM', par: 10, solution: '12 35 13 42 51 14 21 23 42 41' },
  // par 9, score 37.9, bits 17.2, states 626, traps 61%, chain 2, shortest answers 4, naive Infinity, no line 8, no board 8
  { id: 'cg-heavy', title: '꽃이 두 번', tip: '같은 꽃도 화차 크기에 따라 실리는 수가 달라요.', wagons: ['3:MSM', '4:MWW', '2:', '2:SW', '4:WMW'], board: 'WMSW', par: 9, solution: '42 43 54 15 13 15 21 41 21' },
  // par 9, score 39.7, bits 17.1, states 1404, traps 63%, chain 3, shortest answers 3, naive Infinity, no line 7, no board 7
  { id: 'cg-gift-mountain', title: '선물 산더미', tip: '물고기 기차가 두 번! 빈 화차 크기를 잘 봐요.', wagons: ['2:', '3:G', '3:MGF', '3:FMF', '4:GMFF'], board: 'FGFM', par: 9, solution: '31 32 41 23 42 34 32 43 41' },
  // par 12, score 48.8, bits 22.9, states 622, traps 72%, chain 3, shortest answers 3, naive Infinity, no line 10, no board 11
  { id: 'cg-final-boss', title: '모두에게 선물을', tip: '마지막 보스! 크고 작은 화차와 전광판을 모두 써요.', wagons: ['3:CGS', '4:', '2:CG', '3:GCS', '4:CSGG'], board: 'GCGS', par: 12, solution: '52 15 12 45 14 21 31 23 21 32 43 41' },
];

const CHAPTER_DEFS: { title: string; blurb: string; color: string; stages: CargoStageDef[] }[] = [
  { title: '맨 앞 화차부터!', blurb: '기관차는 맨 앞 화차만 데려가요.', color: '#C2477A', stages: CH1 },
  { title: '출발 전광판', blurb: '전광판 순서대로 선물이 떠나요.', color: '#3A7FC2', stages: CH2 },
  { title: '크고 작은 화차', blurb: '두 칸, 세 칸, 네 칸 화차가 섞여 있어요.', color: '#3E9B5A', stages: CH3 },
];

export const CARGO_STAGE_DEFS: CargoStageDef[] = CHAPTER_DEFS.flatMap((c) => c.stages);

export const CARGO_CHAPTERS: Chapter[] = CHAPTER_DEFS.reduce<Chapter[]>((acc, c, i) => {
  const start = acc.length ? acc[acc.length - 1].start + acc[acc.length - 1].count : 0;
  return [...acc, { number: i + 1, title: c.title, blurb: c.blurb, color: c.color, start, count: c.stages.length }];
}, []);

export const CARGO_STAGES: CargoStage[] = CARGO_STAGE_DEFS.map((def, i) => {
  const stage = parseCargoStage(def, i + 1);
  const ch = CARGO_CHAPTERS.find((c) => i >= c.start && i < c.start + c.count)!;
  return { ...stage, label: `STAGE ${ch.number}-${i - ch.start + 1}`, boss: i === ch.start + ch.count - 1 };
});
