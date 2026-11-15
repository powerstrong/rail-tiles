import { FACE_NAMES, isFaceUp, type MemoryStage, type MemoryState } from './model';
import { CardBack, MemoryArt } from './MemoryArt';
export function MemoryBoard({ stage, state, onFlip }: { stage: MemoryStage; state: MemoryState; onFlip: (index: number) => void }) {
  return <div className={`memory-board${stage.faces.length >= 6 ? ' memory-board-dense' : ''}${stage.cols === 5 ? ' memory-board-five' : ''}`} role="group" aria-label={`${stage.rows}행 ${stage.cols}열 짝 맞추기 카드`} style={{ gridTemplateColumns: `repeat(${stage.cols}, 1fr)` }}>
    {state.deck.map((face, i) => {
      const up = isFaceUp(state, i), matched = state.matched.includes(i);
      const position = `${Math.floor(i / stage.cols) + 1}행 ${i % stage.cols + 1}열`;
      return <button key={`${state.roundId}-${i}`} className={`memory-card${up ? ' is-up' : ''}${matched ? ' is-matched' : ''}${state.hint.includes(i) ? ' is-hint' : ''}`}
        aria-label={`${position}, ${up ? FACE_NAMES[face] : '뒷면'}${matched ? ', 짝 찾음' : ''}`} aria-disabled={up}
        onClick={() => onFlip(i)}>
        {up ? <span className="memory-face"><MemoryArt face={face}/></span> : <CardBack/>}
        {matched && <span className="memory-check" aria-hidden="true">✓</span>}
        {matched && state.lastMatch?.includes(i) && <span className="memory-spark" aria-hidden="true">✦</span>}
      </button>;
    })}
  </div>;
}
