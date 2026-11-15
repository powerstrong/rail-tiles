import { useState } from 'react';
import { MEMORY_STAGES, collectedPostcards } from './stages';
import { PostcardArt } from './PostcardArt';
import './memory.css';

const landscapes = MEMORY_STAGES.filter(s => s.chapter === 2);
const mapStages = MEMORY_STAGES.filter(s => s.chapter === 3);
/** Missing pieces remain paper, even for a save containing only later stages. */
export function MemoryMap({ collected }: { collected: ReadonlySet<string> }) {
  return <div className="memory-map" aria-label="탐험 지도">
    {mapStages.map(s => <div key={s.id} style={{ gridRow: s.postcard!.map!.row + 1, gridColumn: s.postcard!.map!.col + 1 }}>
      {collected.has(s.id) ? <PostcardArt id={s.id}/> : <span className="memory-map-missing">3-{s.number}<span>아직 발견하지 않았어요</span></span>}
    </div>)}
  </div>;
}
export function MemoryCollection({ stars }: { stars: Readonly<Record<string, number>> }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const collected = new Set(collectedPostcards(stars).map(s => s.id));
  const chosen = MEMORY_STAGES.find(s => s.id === selected && collected.has(s.id));
  return <section className="memory-collection">
    <button className="memory-collection-toggle" aria-expanded={open} aria-controls="memory-album" onClick={() => setOpen(!open)}>발견한 엽서 {collected.size} / 20 {open ? '−' : '+'}</button>
    {open && <div id="memory-album">
      <h2>그림 너머의 풍경</h2>
      <div className="memory-postcard-list">{landscapes.map(s => <button key={s.id} disabled={!collected.has(s.id)} aria-pressed={selected === s.id} onClick={() => setSelected(s.id)}>
        {collected.has(s.id) ? <><PostcardArt id={s.id}/><span>2-{s.number} · {s.title}</span></> : <span className="memory-empty-postcard">2-{s.number}<span>아직 발견하지 않았어요</span></span>}
      </button>)}</div>
      <h2>이어지는 세계</h2><p>{mapStages.every(s => collected.has(s.id)) ? '탐험 지도 완성!' : '발견한 장소가 길을 따라 이어져요.'}</p>
      <MemoryMap collected={collected}/>
      <div className="memory-map-index">{mapStages.map(s => <button key={s.id} disabled={!collected.has(s.id)} aria-pressed={selected === s.id} onClick={() => setSelected(s.id)}>3-{s.number}{collected.has(s.id) ? ` · ${s.title}` : ' · 미발견'}</button>)}</div>
      {chosen && <figure className="memory-postcard-large"><PostcardArt id={chosen.id}/><figcaption>{chosen.chapter}-{chosen.number} · {chosen.title}</figcaption></figure>}
    </div>}
  </section>;
}
