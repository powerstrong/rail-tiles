import { PostcardArt } from './PostcardArt';

/** The reveal knows only the place and number of matches, never which cards matched. */
export function MemoryPostcard({ id, pairs, matched }: { id: string; pairs: number; matched: number }) {
  const cols = pairs / 2;
  return <div className="memory-postcard" aria-hidden="true" data-postcard={id} data-revealed={matched}>
    <PostcardArt id={id}/>
    <div className="memory-postcard-covers" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {Array.from({ length: pairs }, (_, i) => <span key={i} className={i < matched ? 'is-revealed' : ''}/>)}
    </div>
  </div>;
}
