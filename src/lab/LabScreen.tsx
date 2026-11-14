import { type CSSProperties, type ReactNode, useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';
import { CONCEPTS, type Concept, conceptById } from './catalog';
import { act, isWon, neighbor, type Kind, type Stage, type State } from './model';
import { LabBoard } from './LabBoard';
import { LAB_STAGES, stagesFor } from './stages';
import { completeLabStage, LAB_PROGRESS_KEY, loadLabProgress, rateLabConcept, saveLabProgress, type LabProgress } from './storage';
import { useLabHint } from './useLabHint';
import './lab.css';

type View = { name: 'home' } | { name: 'select'; kind: Kind } | { name: 'play'; kind: Kind; index: number };
type Rating = 'love' | 'tune' | 'unsure';
const RATINGS: { value: Rating; icon: string; label: string }[] = [
  { value: 'love', icon: '💛', label: '또 하고 싶어요' },
  { value: 'tune', icon: '🌱', label: '다듬으면 좋아요' },
  { value: 'unsure', icon: '💭', label: '아직 모르겠어요' },
];
const chapterLabel = ['첫걸음', '한 걸음 더', '생각을 모아요'];
const theme = (concept: Concept): CSSProperties => ({ '--lab-accent': concept.color, '--lab-wash': concept.wash } as CSSProperties);
const doneIn = (progress: LabProgress, stages: Stage[]) => stages.filter(s => progress.completed[s.id]).length;

/** The thumbnails are little rule diagrams, not screenshots of unreleased board positions. */
function ConceptScene({ kind }: { kind: Kind }) {
  let content: ReactNode;
  const rect = (x: number, y: number, color: string, key: number, text?: string) => (
    <g key={key}><rect x={x} y={y} width={25} height={25} rx={6} fill={color} />{text && <text x={x + 12.5} y={y + 17} textAnchor="middle" fill="#fffaf1" fontWeight="800" fontSize={13}>{text}</text>}</g>
  );
  if (kind === 'acorn') content = <>
    <path d="M26 91 H154" stroke="#8fad79" strokeWidth={4} strokeLinecap="round" />
    <path d="M40 84 V39 M29 53 L40 37 L52 54 M123 85 V53 M111 65 L123 50 L135 65" fill="none" stroke="#659466" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
    <rect x={64} y={64} width={24} height={24} rx={6} fill="#b97c45" />
    <path d="M66 69 Q76 59 86 69" stroke="#745135" strokeWidth={5} fill="none" />
    <path d="M94 77 H108 M102 71 L108 77 L102 83" stroke="#387358" fill="none" strokeWidth={3} strokeLinecap="round" />
    <path d="M119 83 Q104 70 119 69 Q134 71 119 83 M119 85 V76" fill="#85b25f" />
  </>;
  else if (kind === 'twins') content = <>
    <path d="M90 22 V97" stroke="#b0a1c3" strokeWidth={2} strokeDasharray="5 5" />
    {[49, 131].map((x, i) => <g key={x}>
      <ellipse cx={x - 7} cy={44} rx={5} ry={17} fill={i ? '#dabbea' : '#fffaf5'} stroke="#9c81b5" strokeWidth={2} />
      <ellipse cx={x + 7} cy={44} rx={5} ry={17} fill={i ? '#dabbea' : '#fffaf5'} stroke="#9c81b5" strokeWidth={2} />
      <circle cx={x} cy={66} r={20} fill={i ? '#dabbea' : '#fffaf5'} stroke="#9c81b5" strokeWidth={2} />
      <circle cx={x - 6} cy={65} r={2} fill="#604d76" /><circle cx={x + 6} cy={65} r={2} fill="#604d76" />
      <path d={`M${x - 3} 72 Q${x} 76 ${x + 3} 72`} stroke="#604d76" strokeWidth={2} fill="none" />
    </g>)}
    <path d="M28 98 H62 M118 98 H152" stroke="#a389ba" strokeWidth={3} strokeLinecap="round" />
    <path d="M30 93 L24 98 L30 103 M150 93 L156 98 L150 103" fill="none" stroke="#a389ba" strokeWidth={3} strokeLinecap="round" />
  </>;
  else if (kind === 'lights') content = <>
    <rect x={38} y={18} width={104} height={91} rx={16} fill="#4b4d48" />
    {Array.from({ length: 9 }, (_, i) => <g key={i}>
      <circle cx={58 + i % 3 * 32} cy={36 + Math.floor(i / 3) * 28} r={10} fill={[1, 3, 4, 5, 7].includes(i) ? '#f9d96c' : '#75766a'} />
      {[1, 3, 4, 5, 7].includes(i) && <circle cx={56 + i % 3 * 32} cy={33 + Math.floor(i / 3) * 28} r={3} fill="#fff9d9" />}
    </g>)}
  </>;
  else if (kind === 'coral') content = <>
    {Array.from({ length: 16 }, (_, i) => rect(36 + i % 4 * 28, 10 + Math.floor(i / 4) * 28, ['#dc777c', '#d5ab47', '#71a98b', '#6c9cbc'][(i % 4 + Math.floor(i / 4) * 2) % 4], i, ['●', '◆', '▲', '■'][(i % 4 + Math.floor(i / 4) * 2) % 4]))}
    <circle cx={38} cy={12} r={6} fill="#fffaf1" stroke="#276f88" strokeWidth={2} />
  </>;
  else if (kind === 'cloud') content = <>
    <path d="M20 104 Q28 88 43 96 Q54 81 69 96 H144 Q159 104 146 110 H30 Z" fill="#fffaf1" />
    {Array.from({ length: 16 }, (_, i) => rect(46 + i % 4 * 22, 14 + Math.floor(i / 4) * 22, [1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14].includes(i) ? '#7fa7ce' : '#f8f5ec', i))}
    <path d="M38 22 H29 M38 46 H29 M38 70 H29 M38 92 H29" stroke="#628eb9" strokeWidth={3} strokeLinecap="round" />
  </>;
  else if (kind === 'balance') content = <>
    <path d="M90 37 V100 M67 102 H113 M40 39 H140" stroke="#9c6678" strokeWidth={5} strokeLinecap="round" />
    <path d="M40 41 L23 78 H57 Z M140 41 L123 78 H157 Z" stroke="#b88996" strokeWidth={2} fill="none" />
    <path d="M20 77 Q40 98 60 77 M120 77 Q140 98 160 77" fill="#daa9b8" stroke="#9c6678" strokeWidth={2} />
    <path d="M40 54 L44 63 L54 64 L46 71 L48 81 L40 76 L31 81 L33 71 L26 64 L36 63 Z" fill="#d0a645" />
    <rect x={132} y={61} width={16} height={19} rx={4} fill="#fffaf1" /><text x={140} y={75} textAnchor="middle" fontSize={13} fill="#9c6678">3</text>
  </>;
  else if (kind === 'moon') content = <>
    <circle cx={143} cy={32} r={16} fill="#f7dc87" /><circle cx={150} cy={26} r={14} fill="#ecebfc" />
    <path d="M41 72 Q75 26 111 69" stroke="#9390bd" strokeWidth={3} fill="none" strokeDasharray="5 5" />
    <path d="M103 67 L114 71 L113 59" stroke="#9390bd" strokeWidth={3} fill="none" strokeLinecap="round" />
    {[40, 76, 112].map((x, i) => <g key={x}><ellipse cx={x} cy={88} rx={15} ry={6} fill="#bcb9d9" /><circle cx={x} cy={79} r={11} fill={i === 2 ? '#f9efd2' : '#8e89b6'} stroke="#7772a0" strokeWidth={2} />{i === 2 && <text x={x} y={84} textAnchor="middle" fill="#b18d33" fontSize={15}>★</text>}</g>)}
  </>;
  else if (kind === 'mosaic') content = <>
    {Array.from({ length: 9 }, (_, i) => rect(47 + i % 3 * 29, 18 + Math.floor(i / 3) * 29, i === 7 ? '#e4d5bc' : ['#c88750', '#d6a86a', '#b57549'][i % 3], i, i === 7 ? undefined : String(i === 8 ? 8 : i + 1)))}
  </>;
  else if (kind === 'bee') content = <>
    <path d="M35 84 H72 V44 H112 V84 H148" fill="none" stroke="#a2a263" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
    {[[35, 84], [72, 84], [72, 44], [112, 44], [112, 84], [148, 84]].map(([x, y], i) => <g key={i}>
      <circle cx={x - 5} cy={y} r={7} fill="#e2ad83" /><circle cx={x + 5} cy={y} r={7} fill="#e2ad83" /><circle cx={x} cy={y - 5} r={7} fill="#e2ad83" /><circle cx={x} cy={y + 5} r={7} fill="#e2ad83" /><circle cx={x} cy={y} r={5} fill="#f5dc88" />
    </g>)}
    <ellipse cx={31} cy={48} rx={7} ry={10} fill="#fffaf1" /><ellipse cx={43} cy={48} rx={7} ry={10} fill="#fffaf1" />
    <ellipse cx={37} cy={58} rx={14} ry={10} fill="#e9bf55" /><path d="M34 49 V67 M42 50 V66" stroke="#6e6250" strokeWidth={4} /><circle cx={27} cy={56} r={2} fill="#4a4949" />
  </>;
  else content = <>
    <path d="M45 36 H133 V91 H45 Z M45 40 H133 M129 36 V91" stroke="#a88e60" strokeWidth={4} strokeLinecap="round" fill="none" />
    {[[45, 36, '3'], [133, 36, '4'], [45, 91, '2'], [133, 91, '3']].map(([x, y, label], i) => <g key={i}>
      <circle cx={Number(x)} cy={Number(y)} r={17} fill="#a3c9a0" stroke="#5e9a85" strokeWidth={2} /><text x={Number(x)} y={Number(y) + 5} textAnchor="middle" fontSize={15} fontWeight="800" fill="#356b5d">{label}</text>
    </g>)}
  </>;
  return <svg className="lab-scene" viewBox="0 0 180 124" aria-hidden="true">{content}</svg>;
}

function StorageNotice({ failed }: { failed: boolean }) {
  return failed ? <p className="lab-storage-notice" role="status">지금은 기록을 저장할 수 없어요. 계속 놀 수 있지만, 창을 닫으면 새 도장이 사라질 수 있어요.</p> : null;
}

function BackButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return <button className="lab-back" onClick={onClick}><span aria-hidden="true">←</span>{children}</button>;
}
function RatingButtons({ concept, value, onRate }: { concept: Concept; value?: Rating; onRate: (value: Rating) => void }) {
  return <fieldset className="lab-ratings">
    <legend>이 여행은 어땠나요?</legend>
    <div className="lab-rating-options">{RATINGS.map(r => <button key={r.value} className={value === r.value ? 'is-picked' : ''} aria-pressed={value === r.value} onClick={() => onRate(r.value)}>
      <span aria-hidden="true">{r.icon}</span>{r.label}
    </button>)}</div>
    <p className="lab-small">{value ? `${concept.title}에 마음을 남겼어요. 언제든 바꿀 수 있어요.` : '고르지 않고 계속 놀아도 괜찮아요. 이 기기에만 저장돼요.'}</p>
  </fieldset>;
}

export function LabScreen({ onBack }: { onBack: () => void }) {
  const [view, setView] = useState<View>({ name: 'home' });
  const [progress, setProgress] = useState(loadLabProgress);
  const lastSaved = useRef(progress);
  const [saveFailed, setSaveFailed] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (progress !== lastSaved.current) {
      setSaveFailed(!saveLabProgress(progress));
      lastSaved.current = progress;
    }
  }, [progress]);
  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.key !== LAB_PROGRESS_KEY) return;
      const incoming = loadLabProgress();
      // Incoming saves are already persisted. Do not write them back to other tabs.
      lastSaved.current = incoming;
      setProgress(current => JSON.stringify(current) === JSON.stringify(incoming) ? current : incoming);
    };
    window.addEventListener('storage', changed);
    return () => window.removeEventListener('storage', changed);
  }, []);
  useLayoutEffect(() => {
    heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [view]);
  const complete = (id: string) => setProgress(current => completeLabStage(current, id));
  const rate = (kind: Kind, rating: Rating) => setProgress(current => rateLabConcept(current, kind, rating));

  if (view.name === 'play') {
    const concept = conceptById(view.kind), stages = stagesFor(view.kind), stage = stages[view.index];
    if (!stage) return null;
    return <LabPlay key={stage.id} stage={stage} concept={concept} completed={!!progress.completed[stage.id]}
      firstVisit={!stages.some(s => progress.completed[s.id])} onComplete={complete}
      onBack={() => setView({ name: 'select', kind: view.kind })}
      onPick={(index) => setView({ name: 'play', kind: view.kind, index })}
      onLab={() => setView({ name: 'home' })}
      rating={progress.ratings[view.kind]} onRate={value => rate(view.kind, value)} saveFailed={saveFailed} />;
  }
  if (view.name === 'select') {
    const concept = conceptById(view.kind), stages = stagesFor(view.kind), count = doneIn(progress, stages);
    return <main className={`lab lab-select lab-${concept.id}`} style={theme(concept)}>
      <header className="lab-top"><BackButton onClick={() => setView({ name: 'home' })}>실험실로 돌아가기</BackButton><span className="lab-tag">자유롭게 골라요</span></header>
      <StorageNotice failed={saveFailed} />
      <section className="lab-world-intro">
        <div className="lab-world-intro-copy"><p className="lab-eyebrow">새로운 여행 · {concept.skill}</p><h1 tabIndex={-1} ref={heading}><span aria-hidden="true">{concept.icon}</span> {concept.title}</h1><p className="lab-tagline">{concept.tagline}</p><p className="lab-story">{concept.story}</p><p className="lab-goal"><b>오늘의 약속</b>{concept.goal}</p></div>
        <ConceptScene kind={concept.id} />
      </section>
      <details className="lab-rule-card" open={count === 0}><summary>어떻게 놀아요?</summary><ol>{concept.rules.map(rule => <li key={rule}>{rule}</li>)}</ol></details>
      <div className="lab-stage-intro"><h2>어디부터 떠나 볼까요?</h2><span>도장 {count} / {stages.length}</span><p>처음이라면 1번부터, 궁금한 판은 바로 골라도 좋아요.</p></div>
      {concept.chapters.map((chapter, i) => <section className="lab-chapter" key={chapter} aria-labelledby={`chapter-${i}`}>
        <div className="lab-chapter-title"><span className="lab-chapter-number">0{i + 1}</span><div><p>{chapterLabel[i]}</p><h2 id={`chapter-${i}`}>{chapter}</h2></div><span className="lab-chapter-range">{i * 10 + 1}–{i * 10 + 10}</span></div>
        <div className="lab-stage-grid">{stages.slice(i * 10, i * 10 + 10).map((stage, k) => <button key={stage.id} className={`lab-stage${progress.completed[stage.id] ? ' is-complete' : ''}`} onClick={() => setView({ name: 'play', kind: concept.id, index: i * 10 + k })} aria-label={`${stage.number}번 ${stage.title}${progress.completed[stage.id] ? ', 완료' : ''}`}>
          <span className="lab-stage-number">{stage.number}</span><span className="lab-stage-name">{stage.title}</span><span className="lab-stage-stamp" aria-hidden="true">{progress.completed[stage.id] ? '✓' : '·'}</span>
        </button>)}</div>
      </section>)}
      <RatingButtons concept={concept} value={progress.ratings[concept.id]} onRate={value => rate(concept.id, value)} />
      <p className="lab-footer-note">천천히 생각해도 좋아요. 시간제한도, 잠긴 스테이지도 없어요.</p>
    </main>;
  }
  const totalDone = doneIn(progress, LAB_STAGES);
  return <main className="lab lab-home">
    <header className="lab-top"><BackButton onClick={onBack}>돌아가기</BackButton><span className="lab-tag">새 게임 10개 · 모두 열려 있어요</span></header>
    <StorageNotice failed={saveFailed} />
    <section className="lab-hero">
      <div className="lab-hero-copy"><p className="lab-eyebrow"><span className="lab-spark" aria-hidden="true">✦</span> 작은 생각이 자라는 곳</p><h1 tabIndex={-1} ref={heading}>상상 실험실</h1><p className="lab-hero-lead">아직 지도에 없는<br /><strong>열 가지 여행.</strong></p><p className="lab-hero-description">밀고, 밝히고, 이어 보세요.<br />마음에 드는 세계부터 자유롭게 떠나요.</p></div>
      <div className="lab-hero-art" aria-hidden="true"><span className="lab-orbit lab-orbit-one">✦</span><span className="lab-orbit lab-orbit-two">✧</span><svg viewBox="0 0 220 210"><path d="M45 172 Q110 145 178 172 L164 185 Q109 166 58 185 Z" fill="#d4c6ad" /><path d="M67 35 H151 V47 H137 V94 L173 153 Q182 173 158 175 H61 Q39 173 48 153 L82 94 V47 H67 Z" fill="#fffcf4" stroke="#74746b" strokeWidth={4} strokeLinejoin="round" /><path d="M70 128 Q91 111 111 128 T153 128 L169 155 Q176 170 157 170 H62 Q46 170 53 156 Z" fill="#a6c2a3" /><path d="M80 142 Q100 130 120 143 T160 142" stroke="#e6f0cd" strokeWidth={4} fill="none" /><circle cx={91} cy={109} r={7} fill="#e8bf68" /><circle cx={124} cy={87} r={5} fill="#b0cbbd" /><circle cx={112} cy={63} r={3} fill="#d0b3c4" /><path d="M105 152 L109 145 L113 152 L121 154 L115 159 L116 167 L109 163 L102 167 L103 159 L97 154 Z" fill="#fbefbc" /><path d="M54 71 L57 62 L60 71 L69 74 L60 77 L57 86 L54 77 L45 74 Z M173 98 L176 89 L179 98 L188 101 L179 104 L176 113 L173 104 L164 101 Z" fill="#c7a55c" /><path d="M64 39 H153" stroke="#77756d" strokeWidth={6} strokeLinecap="round" /></svg><span className="lab-art-caption">오늘은 어떤 생각을 해 볼까?</span></div>
    </section>
    <div className="lab-welcome-strip"><span>🔓 모든 판 자유 선택</span><span>↶ 마음껏 되돌리기</span><span>💡 막히면 힌트</span></div>
    <div className="lab-section-heading"><div><p className="lab-eyebrow">골라 떠나는 생각 여행</p><h2>열 개의 작은 세계</h2></div><span className="lab-total-stamps">모은 도장 <b>{totalDone}</b> / {LAB_STAGES.length}</span></div>
    <section className="lab-concept-grid" aria-label="실험 게임 고르기">{CONCEPTS.map((concept, i) => {
      const count = doneIn(progress, stagesFor(concept.id));
      const opinion = RATINGS.find(r => r.value === progress.ratings[concept.id]);
      return <button key={concept.id} className={`lab-concept lab-${concept.id}`} style={theme(concept)} onClick={() => setView({ name: 'select', kind: concept.id })} aria-label={`${concept.title}, ${concept.skill}, 완료 ${count} / 30판`}>
        <div className="lab-concept-art"><span className="lab-concept-no">여행 {String(i + 1).padStart(2, '0')}</span><ConceptScene kind={concept.id} /><span className="lab-concept-skill">{concept.skill}</span></div>
        <div className="lab-concept-copy"><h3>{concept.title}</h3><p>{concept.tagline}</p><div className="lab-concept-bottom"><span>30개의 퍼즐 <span className="lab-concept-dots" aria-hidden="true">· · ·</span></span><span className="lab-concept-progress">{count ? `✓ ${count}/30` : '떠나기 →'}</span></div>{opinion && <div className="lab-concept-opinion"><span aria-hidden="true">{opinion.icon}</span> {opinion.label}</div>}</div>
      </button>;
    })}</section>
    <aside className="lab-notebook"><span aria-hidden="true">📒</span><div><h2>마음에 드는 여행을 찾아요</h2><p>각 세계에서 놀아 보고 마음을 남겨 주세요. 실험실 도장과 평가는 이 기기에 따로 간직해요.</p></div></aside>
    <p className="lab-footer-note">급할 것 없는 여행이에요. 틀려도, 돌아가도 괜찮아요.</p>
  </main>;
}

interface PlayState { history: State[]; note: string }
type PlayEvent = { type: 'move'; action: number } | { type: 'direction'; direction: number } | { type: 'undo' } | { type: 'reset' } | { type: 'clear-note' };
function invalidNote(kind: Kind): string {
  switch (kind) {
    case 'acorn': return '앞이 막혀 있어요. 도토리를 밀 자리도 한 칸 필요해요.';
    case 'twins': return '두 토끼 모두 막혀 있어요. 다른 방향을 찾아볼까요?';
    case 'moon': return '달돌 하나를 뛰어넘은 바로 다음 빈칸으로 뛰어요.';
    case 'bee': return '아직 가지 않은 이웃 꽃을 골라요. 벌집은 맨 마지막이에요.';
    case 'bridges': return '다리가 서로 교차해요. 다른 길로 이어 볼까요?';
    case 'mosaic': return '빈칸 바로 옆의 조각을 골라 주세요.';
    case 'coral': return '지금과 다른 색을 골라 물결을 넓혀 보세요.';
    default: return '다른 칸을 골라 다시 해 봐요.';
  }
}
function LabPlay({ stage, concept, completed, firstVisit, onComplete, onBack, onPick, onLab, rating, onRate, saveFailed }: {
  stage: Stage; concept: Concept; completed: boolean; firstVisit: boolean; onComplete: (id: string) => void;
  onBack: () => void; onPick: (index: number) => void; onLab: () => void; rating?: Rating; onRate: (value: Rating) => void; saveFailed: boolean;
}) {
  const [game, dispatch] = useReducer((current: PlayState, event: PlayEvent): PlayState => {
    if (event.type === 'clear-note') return current.note ? { ...current, note: '' } : current;
    if (event.type === 'reset') return { history: [[...stage.start]], note: '처음 자리로 돌아왔어요. 다른 생각으로 다시 떠나요.' };
    if (event.type === 'undo') return current.history.length > 1 ? { history: current.history.slice(0, -1), note: '한 걸음 되돌렸어요. 천천히 생각해도 좋아요.' } : current;
    const now = current.history.at(-1)!;
    if (isWon(stage, now)) return current;
    // Resolve directional moves against reducer state, including multiple batched key events.
    const action = event.type === 'direction'
      ? stage.kind === 'mosaic' ? neighbor(stage, now.indexOf(0), event.direction) : event.direction
      : event.action;
    if (action < 0) return current;
    const next = act(stage, now, action);
    return next ? { history: [...current.history, next], note: '' } : { ...current, note: invalidNote(stage.kind) };
  }, { history: [[...stage.start]], note: '' });
  const state = game.history.at(-1)!, won = isWon(stage, state), moves = game.history.length - 1;
  const [helpOpen, setHelpOpen] = useState(firstVisit);
  const [reviewOpen, setReviewOpen] = useState(false);
  const hint = useLabHint(stage, state);
  const heading = useRef<HTMLHeadingElement>(null), wonHeading = useRef<HTMLHeadingElement>(null);
  const recorded = useRef(false);
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;
  useLayoutEffect(() => {
    heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);
  useEffect(() => {
    if (won && !recorded.current) { recorded.current = true; completeRef.current(stage.id); }
    if (won) { wonHeading.current?.focus({ preventScroll: true }); wonHeading.current?.scrollIntoView({ block: 'nearest' }); }
    if (!won) recorded.current = false;
  }, [won, stage.id]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'z' || event.shiftKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable || target?.matches('input,textarea,select')) return;
      event.preventDefault(); dispatch({ type: 'undo' });
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  useEffect(() => {
    if (!['acorn', 'twins', 'mosaic'].includes(stage.kind) || won) return;
    const arrow = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable || target?.matches('input,textarea,select')) return;
      // Focused boards already handle arrows. Tools and the entry heading need this fallback.
      if (target?.closest('.lb-movement, .lb-mosaic')) return;
      const direction = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'].indexOf(event.key);
      if (direction < 0) return;
      event.preventDefault();
      if (!event.repeat) dispatch({ type: 'direction', direction });
    };
    window.addEventListener('keydown', arrow);
    return () => window.removeEventListener('keydown', arrow);
  }, [stage.kind, won]);
  const total = stagesFor(stage.kind).length;
  const progressText = stage.kind === 'lights' ? `반짝이는 등 ${state.filter(Boolean).length} / ${state.length}`
    : stage.kind === 'coral' ? `색 ${new Set(state).size}가지가 남았어요`
    : stage.kind === 'moon' ? `남은 달돌 ${state.filter(Boolean).length}개`
    : stage.kind === 'bee' ? `방문한 꽃길 ${state.length} / ${stage.terrain!.filter(Boolean).length}`
    : stage.kind === 'balance' ? `접시에 올린 별사탕 ${state.filter(Boolean).length} / ${state.length}`
    : `${moves}번 움직였어요`;
  return <main className={`lab lab-play lab-${concept.id}`} style={theme(concept)}>
    <header className="lab-top"><BackButton onClick={onBack}>스테이지 고르기</BackButton><span className="lab-play-world"><span aria-hidden="true">{concept.icon}</span>{concept.title}</span></header>
    <StorageNotice failed={saveFailed} />
    <div className="lab-play-heading"><div><p className="lab-eyebrow">{concept.chapters[Math.floor((stage.number - 1) / 10)]} · {stage.number} / {total}</p><h1 tabIndex={-1} ref={heading}>{stage.title}</h1></div>{completed && <span className="lab-done-tag">✓ 도장을 받은 판</span>}</div>
    <div className="lab-play-goal"><span aria-hidden="true">⚑</span><p>{concept.goal}</p><button aria-expanded={helpOpen} aria-controls="lab-play-rules" onClick={() => setHelpOpen(open => !open)}>{helpOpen ? '규칙 접기' : '규칙 보기'} <span aria-hidden="true">{helpOpen ? '−' : '+'}</span></button></div>
    {helpOpen && <section className="lab-play-rules" id="lab-play-rules" aria-label="게임 규칙"><p>{concept.story}</p><ol>{concept.rules.map(rule => <li key={rule}>{rule}</li>)}</ol><button className="lab-text-button" onClick={() => setHelpOpen(false)}>알겠어요, 해 볼게요 ↓</button></section>}
    <div className="lab-play-canvas"><LabBoard stage={stage} state={state} onAction={action => dispatch({ type: 'move', action })} hint={hint.hint} disabled={won} /></div>
    <div className="lab-play-status"><span>{progressText}</span><span>서두르지 않아도 괜찮아요</span></div>
    <div className={`lab-feedback-line${game.note || hint.text ? ' has-message' : ''}`} role="status" aria-live="polite">{game.note || hint.text || (won ? '멋져요! 오늘도 새로운 생각을 찾았어요.' : '궁금하면 눌러 보고, 언제든 한 걸음 되돌려요.')}</div>
    <div className="lab-tools" aria-label="퍼즐 도움 도구">
      <button onClick={() => dispatch({ type: 'undo' })} disabled={moves === 0}><span aria-hidden="true">↶</span><span>되돌리기</span></button>
      <button onClick={() => { hint.clear(); dispatch({ type: 'reset' }); }}><span aria-hidden="true">↻</span><span>처음부터</span></button>
      <button onClick={() => { dispatch({ type: 'clear-note' }); hint.request(); }} disabled={hint.busy || won} aria-busy={hint.busy}><span aria-hidden="true">{hint.busy ? '◌' : '💡'}</span><span>{hint.busy ? '생각하는 중…' : '한 걸음 힌트'}</span></button>
    </div>
    {won && <section className="lab-clear" aria-label="스테이지 완료"><span className="lab-clear-stamp" aria-hidden="true">✦</span><div><p className="lab-eyebrow">생각의 도장을 받았어요</p><h2 tabIndex={-1} ref={wonHeading}>{stage.number === total ? '이 세계의 마지막 판도 해냈어요!' : '해냈어요! 한 뼘 자란 생각.'}</h2><p>힌트를 썼어도, 여러 번 되돌렸어도 멋진 완성이에요.</p></div><div className="lab-clear-actions">{stage.number < total ? <button className="lab-solid-button" onClick={() => onPick(stage.number)}>다음 여행으로 →</button> : <button className="lab-solid-button" onClick={onLab}>다른 세계 만나기 →</button>}<button className="lab-outline-button" onClick={onBack}>스테이지 고르기</button></div></section>}
    <nav className="lab-neighbor-nav" aria-label="다른 스테이지"><button disabled={stage.number === 1} onClick={() => onPick(stage.number - 2)}>← 이전 판</button><button onClick={onBack}>전체 {total}판 보기</button><button disabled={stage.number === total} onClick={() => onPick(stage.number)}>다음 판 →</button></nav>
    <div className="lab-review-toggle"><button className="lab-text-button" onClick={() => setReviewOpen(open => !open)} aria-expanded={reviewOpen}>{reviewOpen ? '마음 남기기 접기' : '이 게임에 마음 남기기 ♡'}</button></div>
    {reviewOpen && <RatingButtons concept={concept} value={rating} onRate={onRate} />}
  </main>;
}
