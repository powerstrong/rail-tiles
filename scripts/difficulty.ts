/**
 * Difficulty audit: `npx vite-node scripts/difficulty.ts [stage-id ...]`
 * See scripts/audit.ts for what the columns mean.
 */
import { CHAPTERS, STAGES } from '../src/stages/stages';
import { audit, difficultyScore } from './audit';

const ids = process.argv.slice(2);
for (const ch of CHAPTERS) {
  const list = STAGES.slice(ch.start, ch.start + ch.count).filter((s) => !ids.length || ids.includes(s.id));
  if (!list.length) continue;
  console.log(`\n챕터 ${ch.number} ${ch.title}`);
  console.log('  판     이름              par  ★★★/전체  함정(칸)  갈림  탐색량   난이도  규칙');
  for (const st of list) {
    const a = audit(st);
    console.log(
      `  ${st.label!.replace('STAGE ', '').padEnd(5)}  ${st.title.padEnd(12, '　')}  ${String(a.par).padStart(3)}  ${String(a.optimal).padStart(3)}/${String(a.routes).padEnd(4)}  ${String(a.traps).padStart(4)}(${String(a.trapCells).padStart(2)})  ${String(a.forks).padStart(4)}  ${String(a.effort ?? '>5M').padStart(7)}   ${difficultyScore(a).toFixed(1).padStart(5)}  ${a.mechanics.join(',')}`,
    );
  }
}

// Penguin world (slide puzzles), on its own scale: see src/penguin/audit.ts.
const { ICE_CHAPTERS, ICE_STAGES } = await import('../src/penguin/stages');
const { auditIce } = await import('../src/penguin/audit');
console.log('\n\n=== 펭귄 얼음 나라 ===');
for (const ch of ICE_CHAPTERS) {
  const list = ICE_STAGES.slice(ch.start, ch.start + ch.count).filter((s) => !ids.length || ids.includes(s.id));
  if (!list.length) continue;
  console.log(`\n챕터 ${ch.number} ${ch.title}`);
  console.log('  판     이름              밀기  상태수  함정단계  돌아가기  난이도');
  for (const st of list) {
    const a = auditIce(st)!;
    console.log(
      `  ${st.label!.replace('STAGE ', '').padEnd(5)}  ${st.title.padEnd(12, '　')}  ${String(a.par).padStart(3)}  ${String(a.reachable).padStart(6)}  ${String(a.trapSteps).padStart(6)}  ${String(a.detours).padStart(7)}  ${a.score.toFixed(1).padStart(6)}`,
    );
  }
}
