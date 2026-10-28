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

// Train world season 2, on the same scale as the first train world.
const { S2_CHAPTERS, S2_STAGES } = await import('../src/stages/season2');
console.log('\n\n=== 기차 월드 2 ===');
for (const ch of S2_CHAPTERS) {
  const list = S2_STAGES.slice(ch.start, ch.start + ch.count).filter((s) => !ids.length || ids.includes(s.id));
  if (!list.length) continue;
  console.log(`\n챕터 ${ch.number} ${ch.title}`);
  console.log('  판     이름              par  ★★★/전체  함정(칸)  탐색량   난이도');
  for (const st of list) {
    const a = audit(st);
    const tag = st.boss ? ' [보스]' : st.oneShot ? ' [보너스]' : '';
    console.log(
      `  ${st.label!.replace('STAGE ', '').padEnd(5)}  ${st.title.padEnd(12, '　')}  ${String(a.par).padStart(3)}  ${String(a.optimal).padStart(3)}/${String(a.routes).padEnd(4)}  ${String(a.traps).padStart(4)}(${String(a.trapCells).padStart(2)})  ${String(a.effort ?? '>5M').padStart(7)}   ${difficultyScore(a).toFixed(1).padStart(5)}${tag}`,
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

// Machine world (laser puzzles): see src/machine/audit.ts.
const { MACHINE_CHAPTERS, MACHINE_STAGES } = await import('../src/machine/stages');
const { auditLaser } = await import('../src/machine/audit');
console.log('\n\n=== 로봇 공장 ===');
for (const ch of MACHINE_CHAPTERS) {
  const list = MACHINE_STAGES.slice(ch.start, ch.start + ch.count).filter((s) => !ids.length || ids.includes(s.id));
  if (!list.length) continue;
  console.log(`\n챕터 ${ch.number} ${ch.title}`);
  console.log('  판     이름              누르기  거울  아까운오답  난이도');
  for (const st of list) {
    const a = auditLaser(st)!;
    const tag = st.boss ? ' [보스]' : st.battery !== undefined ? ' [보너스]' : '';
    console.log(
      `  ${st.label!.replace('STAGE ', '').padEnd(5)}  ${st.title.padEnd(12, '　')}  ${String(a.par).padStart(4)}  ${String(a.turnable).padStart(4)}  ${String(a.nearMisses).padStart(8)}  ${a.score.toFixed(1).padStart(6)}${tag}`,
    );
  }
}

// Volcano world (lava puzzles): see src/volcano/audit.ts.
const { VOLCANO_CHAPTERS, VOLCANO_STAGES } = await import('../src/volcano/stages');
const { auditLava } = await import('../src/volcano/audit');
console.log('\n\n=== 화산 섬 ===');
for (const ch of VOLCANO_CHAPTERS) {
  const list = VOLCANO_STAGES.slice(ch.start, ch.start + ch.count).filter((s) => !ids.length || ids.includes(s.id));
  if (!list.length) continue;
  console.log(`\n챕터 ${ch.number} ${ch.title}`);
  console.log('  판     이름              돌  흐르는칸  차가운오답  난이도');
  for (const st of list) {
    const a = auditLava(st)!;
    const tag = st.boss ? ' [보스]' : st.race ? ' [보너스]' : '';
    console.log(
      `  ${st.label!.replace('STAGE ', '').padEnd(5)}  ${st.title.padEnd(12, '　')}  ${String(a.par).padStart(3)}  ${String(a.open).padStart(6)}  ${String(a.coldSets).padStart(8)}  ${a.score.toFixed(1).padStart(6)}${tag}`,
    );
  }
}
