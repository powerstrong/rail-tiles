import type { Chapter } from '../stages/stages';
import type { Face, MemoryStage } from './model';
const sets: Face[][] = [
  ['apple', 'banana'], ['rabbit', 'bear'], ['apple', 'banana', 'grapes'],
  ['rabbit', 'bear', 'fish'], ['train', 'boat', 'umbrella'],
  ['apple', 'banana', 'grapes', 'strawberry'], ['rabbit', 'bear', 'fish', 'butterfly'],
  ['train', 'boat', 'umbrella', 'key'], ['apple', 'banana', 'grapes', 'train', 'boat', 'umbrella'],
  ['rabbit', 'bear', 'fish', 'butterfly', 'strawberry', 'key'],
];
const titles = ['과일 바구니', '포근한 친구', '세 가지 과일', '물가의 친구', '비 오는 역', '알록달록 간식', '작은 숲 친구들', '여행 준비', '넉넉한 바구니', '모두의 짝꿍'];
export const MEMORY_STAGES: MemoryStage[] = sets.map((faces, i) => ({
  chapter: 1, number: i + 1,
  id: `memory-1-${String(i + 1).padStart(2, '0')}`, label: `STAGE 1-${i + 1}`,
  title: titles[i], rows: faces.length === 6 ? 3 : 2, cols: faces.length === 6 ? 4 : faces.length, faces,
}));
export const MEMORY_CHAPTERS: Chapter[] = [{ number: 1, start: 0, count: 10, title: '첫 짝꿍',
  blurb: '같은 그림을 만나면, 반가운 짝꿍!', color: '#397d79' },
  { number: 2, start: 10, count: 10, title: '그림 너머의 풍경', blurb: '짝을 찾으며 열 장의 풍경을 발견해요.', color: '#668454' },
  { number: 3, start: 20, count: 10, title: '이어지는 세계', blurb: '발견한 장소를 하나의 탐험 지도로 이어요.', color: '#657eae' },
];

MEMORY_STAGES.push({ id: 'memory-2-01', chapter: 2, number: 1, label: 'STAGE 2-1', title: '안개 너머 역', rows: 3, cols: 4,
  faces: ['apple', 'banana', 'grapes', 'train', 'boat', 'umbrella'], postcard: { asset: 'mist-station' } });
MEMORY_STAGES.push({ id: 'memory-2-02', chapter: 2, number: 2, label: 'STAGE 2-2', title: '숲의 입구', rows: 3, cols: 4,
  faces: ['rabbit', 'bear', 'butterfly', 'leaf', 'mushroom', 'key'], postcard: { asset: 'forest-gate' } });
MEMORY_STAGES.push({ id: 'memory-2-03', chapter: 2, number: 3, label: 'STAGE 2-3', title: '햇살 공터', rows: 3, cols: 4,
  faces: ['leaf', 'mushroom', 'acorn', 'flower', 'fish', 'boat'], postcard: { asset: 'sun-clearing' } });
MEMORY_STAGES.push({ id: 'memory-2-04', chapter: 2, number: 4, label: 'STAGE 2-4', title: '나무 위 쉼터', rows: 4, cols: 4,
  faces: ['rabbit', 'bear', 'butterfly', 'leaf', 'mushroom', 'acorn', 'flower', 'key'], postcard: { asset: 'tree-house' } });
MEMORY_STAGES.push({ id: 'memory-2-05', chapter: 2, number: 5, label: 'STAGE 2-5', title: '작은 폭포', rows: 4, cols: 4,
  faces: ['apple', 'banana', 'grapes', 'strawberry', 'leaf', 'mushroom', 'acorn', 'flower'], postcard: { asset: 'waterfall' } });
MEMORY_STAGES.push({ id: 'memory-2-06', chapter: 2, number: 6, label: 'STAGE 2-6', title: '소풍 쉼터', rows: 3, cols: 4,
  faces: ['train', 'boat', 'umbrella', 'key', 'leaf', 'flower'], postcard: { asset: 'picnic' } });
MEMORY_STAGES.push({ id: 'memory-2-07', chapter: 2, number: 7, label: 'STAGE 2-7', title: '물길 다리', rows: 4, cols: 4,
  faces: ['rabbit', 'bear', 'fish', 'butterfly', 'boat', 'leaf', 'mushroom', 'flower'], postcard: { asset: 'river-bridge' } });
MEMORY_STAGES.push({ id: 'memory-2-08', chapter: 2, number: 8, label: 'STAGE 2-8', title: '비 갠 언덕', rows: 4, cols: 4,
  faces: ['train', 'boat', 'umbrella', 'key', 'apple', 'grapes', 'acorn', 'flower'], postcard: { asset: 'rainbow-hill' } });
MEMORY_STAGES.push({ id: 'memory-2-09', chapter: 2, number: 9, label: 'STAGE 2-9', title: '노을 뜰', rows: 4, cols: 4,
  faces: ['apple', 'strawberry', 'rabbit', 'butterfly', 'leaf', 'mushroom', 'acorn', 'flower'], postcard: { asset: 'sunset-yard' } });
MEMORY_STAGES.push({ id: 'memory-2-10', chapter: 2, number: 10, label: 'STAGE 2-10', title: '바다로 가는 문', rows: 4, cols: 4,
  faces: ['rabbit', 'bear', 'fish', 'butterfly', 'train', 'boat', 'mushroom', 'key'], postcard: { asset: 'sea-gate' } });

MEMORY_STAGES.push({ id: 'memory-3-01', chapter: 3, number: 1, label: 'STAGE 3-1', title: '물결의 입구', rows: 4, cols: 4,
  faces: ['fish', 'boat', 'umbrella', 'key', 'leaf', 'flower', 'octopus', 'crab'], postcard: { asset: 'shore', map: { row: 0, col: 0 } } });
MEMORY_STAGES.push({ id: 'memory-3-02', chapter: 3, number: 2, label: 'STAGE 3-2', title: '등대 곶', rows: 4, cols: 4,
  faces: ['fish', 'boat', 'octopus', 'crab', 'turtle', 'lighthouse', 'leaf', 'flower'], postcard: { asset: 'cape', map: { row: 0, col: 1 } } });
MEMORY_STAGES.push({ id: 'memory-3-03', chapter: 3, number: 3, label: 'STAGE 3-3', title: '하늘 선착장', rows: 4, cols: 4,
  faces: ['train', 'boat', 'umbrella', 'key', 'leaf', 'flower', 'rocket', 'planet'], postcard: { asset: 'launch', map: { row: 1, col: 1 } } });
MEMORY_STAGES.push({ id: 'memory-3-04', chapter: 3, number: 4, label: 'STAGE 3-4', title: '둥근 관측소', rows: 4, cols: 4,
  faces: ['rocket', 'planet', 'robot', 'telescope', 'train', 'key', 'mushroom', 'flower'], postcard: { asset: 'observatory', map: { row: 1, col: 0 } } });
MEMORY_STAGES.push({ id: 'memory-3-05', chapter: 3, number: 5, label: 'STAGE 3-5', title: '구름 사이 길', rows: 4, cols: 5,
  faces: ['rocket', 'planet', 'robot', 'telescope', 'train', 'boat', 'umbrella', 'key', 'butterfly', 'flower'], postcard: { asset: 'sky-bridge', map: { row: 2, col: 0 } } });
MEMORY_STAGES.push({ id: 'memory-3-06', chapter: 3, number: 6, label: 'STAGE 3-6', title: '고리빛 항구', rows: 4, cols: 5,
  faces: ['octopus', 'crab', 'turtle', 'lighthouse', 'fish', 'boat', 'rocket', 'planet', 'robot', 'telescope'], postcard: { asset: 'ring-harbor', map: { row: 2, col: 1 } } });
MEMORY_STAGES.push({ id: 'memory-3-07', chapter: 3, number: 7, label: 'STAGE 3-7', title: '떠 있는 정원', rows: 4, cols: 4,
  faces: ['rabbit', 'bear', 'butterfly', 'leaf', 'mushroom', 'acorn', 'flower', 'apple'], postcard: { asset: 'garden', map: { row: 3, col: 1 } } });
MEMORY_STAGES.push({ id: 'memory-3-08', chapter: 3, number: 8, label: 'STAGE 3-8', title: '물빛 골짜기', rows: 4, cols: 5,
  faces: ['fish', 'boat', 'umbrella', 'lighthouse', 'octopus', 'turtle', 'leaf', 'flower', 'planet', 'telescope'], postcard: { asset: 'lake-valley', map: { row: 3, col: 0 } } });
MEMORY_STAGES.push({ id: 'memory-3-09', chapter: 3, number: 9, label: 'STAGE 3-9', title: '별빛 들판', rows: 4, cols: 5,
  faces: ['apple', 'grapes', 'rabbit', 'bear', 'butterfly', 'mushroom', 'acorn', 'rocket', 'planet', 'robot'], postcard: { asset: 'star-field', map: { row: 4, col: 0 } } });
MEMORY_STAGES.push({ id: 'memory-3-10', chapter: 3, number: 10, label: 'STAGE 3-10', title: '우리가 찾은 세계', rows: 4, cols: 5,
  faces: ['train', 'boat', 'key', 'leaf', 'mushroom', 'octopus', 'turtle', 'rocket', 'planet', 'telescope'], postcard: { asset: 'arrival', map: { row: 4, col: 1 } } });

export const POSTCARD_STAGES = MEMORY_STAGES.filter(s => s.postcard);
/** Only known, completed stages count; no new persistence layer. */
export const collectedPostcards = (stars: Readonly<Record<string, number>>) => POSTCARD_STAGES.filter(s => [1, 2, 3].includes(stars[s.id]));

/** App passes this through the existing clearNote contract, excluding the active stage. */
export function memoryChapterNote(id: string, cleared: ReadonlySet<string>): string | undefined {
  const stage = MEMORY_STAGES.find(s => s.id === id);
  if (!stage || !MEMORY_STAGES.filter(s => s.chapter === stage.chapter).every(s => s.id === id || cleared.has(s.id))) return;
  return ['첫 짝꿍 10판을 해냈어요!', '열 장의 풍경을 발견했어요!', '탐험 지도 완성!'][stage.chapter - 1];
}
