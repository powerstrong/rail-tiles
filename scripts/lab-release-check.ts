/** Check the built artifact, including the actual bundled Worker, without requiring a browser. */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { act, isWon, KINDS } from '../src/lab/model';
import { stagesFor } from '../src/lab/stages';
import type { SearchResult } from '../src/lab/solver';

const sw = readFileSync('dist/sw.js', 'utf8');
const cached: string[] = JSON.parse(sw.match(/const FILES = (.*);/)![1]);
const assets = readdirSync('dist/assets');
const labJS = assets.find(f => /^LabScreen-.*\.js$/.test(f));
const labCSS = assets.find(f => /^LabScreen-.*\.css$/.test(f));
const worker = assets.find(f => /^hint\.worker-.*\.js$/.test(f));
assert(labJS && labCSS && worker, 'Missing lazy lab, styles or hint Worker');
for (const asset of [labJS, labCSS, worker]) {
  assert(cached.includes(`./assets/${asset}`), `${asset} missing from offline precache`);
  assert(existsSync(`dist/assets/${asset}`));
}
const scope: { onmessage?: (event: unknown) => void; postMessage: (result: unknown) => void } = { postMessage: () => {} };
runInNewContext(readFileSync(`dist/assets/${worker}`, 'utf8'), { self: scope }, { timeout: 2000 });
assert(scope.onmessage, 'Built Worker did not register');
let checks = 0;
for (const kind of KINDS) for (const number of [1, 15, 30]) {
  const stage = stagesFor(kind)[number - 1];
  let response: { ok: boolean; result?: SearchResult } | undefined;
  scope.postMessage = raw => { response = raw as typeof response; };
  scope.onmessage!({ data: { stage, state: stage.start } });
  assert(response?.ok && response.result?.path, `${stage.id}: built Worker did not return a path`);
  let state = stage.start;
  for (const action of response.result.path) {
    const next = act(stage, state, action);
    assert(next, `${stage.id}: built Worker suggested an illegal action`); state = next;
  }
  assert(isWon(stage, state), `${stage.id}: built Worker answer does not win`);
  checks++;
}
let invalid: unknown;
scope.postMessage = raw => { invalid = raw; };
scope.onmessage({ data: { stage: null, state: null } });
assert.equal((invalid as { ok: boolean }).ok, false);
assert.equal(Object.keys(invalid as object).length, 1);
console.log(`Production lab assets and offline precache verified. Bundled hint Worker: ${checks}/30 stage checks passed; malformed requests handled.`);
