import { writeFileSync } from 'node:fs';
import { CORAL_STAGES } from '../src/coral/stages';
import { count, Reef, solve } from '../src/coral/model';

let seed = 0xc0a1beef;
const random = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; };
const report = CORAL_STAGES.map(stage => {
  const reef = new Reef(stage), initial = reef.initial(), seen = new Set([initial.mask]);
  for (const mask of seen) reef.palette.forEach(c => seen.add(reef.expand(mask, c)));
  const firstChoices = reef.palette.filter(c => c !== initial.color).map(color => ({
    color, gain: count(reef.expand(initial.mask, color)) - count(initial.mask),
    finishIn: 1 + solve(reef, reef.move(initial, color)!)!.length,
  }));
  const randomStars = [0, 0, 0];
  // Choose uniformly among other palette colors, including zero growth. No hints or undo.
  for (let run = 0; run < 2000; run++) {
    let state = initial, moves = 0;
    while (!reef.won(state)) {
      const choices = reef.palette.filter(c => c !== state.color);
      state = reef.move(state, choices[Math.floor(random() * choices.length)])!;
      if (++moves > 1000) throw new Error('Unexpected noncompletion');
    }
    randomStars[moves <= stage.par ? 2 : moves <= stage.par + 2 ? 1 : 0]++;
  }
  const biggest = Math.max(...firstChoices.map(c => c.gain));
  return { number: stage.number, title: stage.title, cols: stage.cols, rows: stage.rows, par: stage.par,
    rocks: stage.start.filter(c => c < 0).length, reachableSets: seen.size, firstChoices,
    smallerFirstCanBeBetter: firstChoices.some(c => c.gain < biggest && c.finishIn === stage.par) && firstChoices.some(c => c.gain === biggest && c.finishIn > stage.par), randomStars };
});
writeFileSync('docs/coral-audit.json', JSON.stringify({ seed: '0xc0a1beef', randomRunsPerStage: 2000, report }, null, 2) + '\n');
console.log(`Reachable sets: ${report.reduce((n, r) => n + r.reachableSets, 0)}; smaller first beats largest: ${report.filter(r => r.smallerFirstCanBeBetter).map(r => r.number).join(', ')}`);
console.log(report.map(r => `| ${r.number} | ${r.title} | ${r.cols}×${r.rows} | ${r.par} | ${r.rocks} | ${r.randomStars[2] / 20}% |`).join('\n'));
