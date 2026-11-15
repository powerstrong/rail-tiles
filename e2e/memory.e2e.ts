import { expectCompletion } from './assertCompletion';
import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { MEMORY_STAGES } from '../src/memory/stages';
import { PROGRESS_KEY } from '../src/storage';
const cards = (page: Page) => page.locator('.memory-card');
const shuffle = (page: Page) => page.getByRole('button', { name: '↻ 새로 섞어 시작', exact: true });
async function seedRounds(page: Page) {
  await page.addInitScript(() => { crypto.getRandomValues = <T extends ArrayBufferView | null>(array: T): T => { if (array instanceof Uint32Array) array.fill(42); return array; }; });
}
const coverOption = (page: Page) => page.getByRole('checkbox', { name: '다음 카드를 누를 때 덮기' });
async function observe(page: Page) {
  // Learn only from each card's public accessible name after opening it.
  const faces: string[] = [];
  for (let i = 0; i < await cards(page).count(); i++) {
    if ((await cards(page).nth(i).getAttribute('aria-label'))!.includes('뒷면')) await cards(page).nth(i).click();
    faces.push((await cards(page).nth(i).getAttribute('aria-label'))!.split(', ')[1]);
  }
  await coverOption(page).uncheck();
  await page.waitForTimeout(950);
  return faces;
}
async function solve(page: Page, faces: string[], afterPair?: (matched: number) => Promise<void>) {
  // A previously opened first card may remain after scanning. Finish it first.
  while (await page.locator('.memory-card:not(.is-matched)').count()) {
    const labels = await cards(page).evaluateAll(nodes => nodes.map(n => ({ up: n.classList.contains('is-up'), matched: n.classList.contains('is-matched') })));
    const a = labels.findIndex(s => s.up && !s.matched);
    const first = a >= 0 ? a : labels.findIndex(s => !s.matched);
    const mate = faces.findIndex((f, i) => i !== first && f === faces[first]);
    if (a < 0) await cards(page).nth(first).click();
    await cards(page).nth(mate).click();
    await expect(cards(page).nth(mate)).toHaveClass(/is-matched/);
    if (afterPair) await afterPair(await page.locator('.memory-card.is-matched').count() / 2);
  }
}
async function shot(page: Page, name: string) {
  if (!process.env.MEMGAME_SHOTS) return;
  if (await page.locator('.unlock-banner').count()) await page.locator('.unlock-banner').click();
  await mkdir('/tmp/memgame-shots', { recursive: true });
  await page.screenshot({ path: `/tmp/memgame-shots/${name}.png` });
}

test('memory: initial map, thirty stages, one-star unlock, immediate results and mobile screenshots', async ({ page }) => {
  test.setTimeout(300_000); // Thirty full rounds, including public observation of every card.
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await seedRounds(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: '시작하기', exact: true }).click();
  const station = page.getByRole('button', { name: /^미지의 세계, 별 0\/90/ });
  await expect(station).toBeVisible();
  if (process.env.MEMGAME_SHOTS) await page.screenshot({ path: '/tmp/memgame-map.png' });
  await station.click();
  await page.getByRole('button', { name: '놀러 가기', exact: true }).click();
  await page.getByRole('button', { name: '건너뛰기', exact: true }).click();
  await expect(page.locator('.stage-card')).toHaveCount(30);
  await expect(page.locator('.stage-card').nth(1)).toBeDisabled();
  await page.locator('.stage-card').first().click();
  for (let n = 0; n < 30; n++) {
    const stage = MEMORY_STAGES[n];
    await expect(page.locator('.memory-screen h1')).toHaveText(stage.title);
    await expect(cards(page)).toHaveCount(stage.rows * stage.cols);
    if (n === 29) { await page.evaluate(() => window.scrollTo(0, 0)); await shot(page, 'ch23-final-start'); }
    if (n === 8) { await page.evaluate(() => window.scrollTo(0, 0)); await shot(page, '01-start'); }
    await coverOption(page).check();
    const faces = await observe(page);
    await shuffle(page).click();
    if (n === 0) {
      // Seven mismatches exceed the two-star threshold; a one-star clear must still open stage 2.
      const a = 0, b = faces.findIndex(f => f !== faces[a]);
      for (let m = 0; m < 7; m++) {
        await cards(page).nth(a).click(); await cards(page).nth(b).click();
        await page.waitForTimeout(950);
      }
    }
    await solve(page, faces, n === 13 ? async matched => { if (matched === 4) { await page.evaluate(() => window.scrollTo(0, 0)); await shot(page, 'ch23-middle'); } } : n === 8 ? async matched => { if (matched === 1) { await page.evaluate(() => window.scrollTo(0, 0)); await shot(page, '02-one-pair'); } } : undefined);
    const result = page.getByRole('region', { name: '스테이지 완료', exact: true });
    await expect(result).toBeVisible();
    await expectCompletion(result);
    await expect(result.getByRole('button').first()).toBeFocused();
    if (n === 8) { await page.evaluate(() => window.scrollTo(0, 0)); await shot(page, '03-complete'); }
    if (n === 29) {
      await expect(result.getByRole('button')).toHaveText(['스테이지 고르기']);
      await expect(result.locator('.memory-result-postcard svg')).toBeVisible();
      await result.evaluate(node => node.scrollIntoView({ block: 'end', behavior: 'auto' })); await shot(page, 'ch23-final-complete');
    }
    await expect.poll(() => page.evaluate(({ key, id }) => JSON.parse(localStorage.getItem(key) ?? '{}').stars?.[id], { key: PROGRESS_KEY, id: stage.id })).toBeGreaterThanOrEqual(1);
    if (n === 0) {
      await expect(result.locator('.star-row')).toHaveAttribute('aria-label', '별 1개');
      await result.getByRole('button', { name: '스테이지 고르기', exact: true }).click();
      await expect(page.locator('.stage-card').nth(1)).toBeEnabled();
      await expect(page.locator('.stage-card').nth(2)).toBeDisabled();
      await page.locator('.stage-card').nth(1).click();
    } else if (n < 29) {
      await expect(page.getByRole('button', { name: '다음 스테이지 →', exact: true })).toBeEnabled();
      await page.getByRole('button', { name: '다음 스테이지 →', exact: true }).click();
    }
  }
  await expect(page.getByRole('button', { name: '다음 스테이지 →', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '스테이지 고르기', exact: true }).click();
  await page.getByRole('button', { name: '건너뛰기', exact: true }).click();
  await page.getByRole('button', { name: '발견한 엽서 20 / 20 +', exact: true }).click();
  await expect(page.locator('.memory-map .memory-landscape')).toHaveCount(10);
  await expect(page.locator('#memory-album')).toContainText('탐험 지도 완성!');
  await page.locator('.memory-map').evaluate(node => node.scrollIntoView({ block: 'center', behavior: 'auto' }));
  await shot(page, 'ch23-map');
  await page.getByRole('button', { name: '3-10 · 우리가 찾은 세계', exact: true }).click();
  await expect(page.locator('.memory-postcard-large')).toContainText('우리가 찾은 세계');
  await shot(page, 'ch23-album');
  expect(errors).toEqual([]);
});

test('memory: normal motion rapid input, timer isolation, known-only hints, keyboard and 320px resume', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  // Seed round creation, without making any hidden face accessible to the player.
  await seedRounds(page);
  await page.goto('/');
  await page.evaluate(key => localStorage.setItem(key, JSON.stringify({ schemaVersion: 2, stars: { 'memory-1-01': 1, 'memory-1-02': 1, 'last-run': 3 }, stories: ['memory'], last: { world: 'memory', stage: 'memory-1-03' } })), PROGRESS_KEY);
  await page.reload();
  await page.getByRole('button', { name: /이어하기/ }).click();
  const help = page.getByRole('button', { name: '본 짝 알려주기 · 사용하면 최대 ★★', exact: true });
  await help.click();
  await expect(page.locator('.memory-note')).toHaveText('카드를 조금 더 만나 봐요');
  await expect(page.locator('.memory-limits')).not.toContainText('힌트 사용');
  await coverOption(page).check();
  const faces = await observe(page);
  await shuffle(page).click();
  const a = 0, b = faces.findIndex(f => f !== faces[a]);
  const c = faces.findIndex((_, i) => i !== a && i !== b);
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 100));
  // These click events arrive in the same task, during the visual effects.
  await cards(page).evaluateAll((nodes, [a, b, c]) => { (nodes[a] as HTMLButtonElement).click(); (nodes[b] as HTMLButtonElement).click(); (nodes[c] as HTMLButtonElement).click(); }, [a, b, c]);
  await expect(cards(page).nth(a)).toHaveAttribute('aria-label', /뒷면$/);
  await expect(cards(page).nth(b)).toHaveAttribute('aria-label', /뒷면$/);
  await expect(cards(page).nth(c)).not.toHaveAttribute('aria-label', /뒷면$/);
  await page.clock.runFor(1000);
  await expect(cards(page).nth(c)).not.toHaveAttribute('aria-label', /뒷면$/);
  await expect(page.locator('.memory-score')).toContainText('안 맞은 횟수 1');
  // Restart while a mismatch timer is pending; it must not cover this new first card.
  const d = faces.findIndex((f, i) => i !== c && f !== faces[c]);
  await cards(page).nth(d).click();
  await page.clock.runFor(40);
  await shuffle(page).click();
  await cards(page).nth(a).focus(); await page.keyboard.press('Enter');
  await page.clock.runFor(900);
  await expect(cards(page).nth(a)).not.toHaveAttribute('aria-label', /뒷면$/);
  await expect(page.locator('.memory-score')).toContainText('안 맞은 횟수 0');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await cards(page).nth(b).click();
  await page.clock.runFor(899);
  await expect(page.locator('.memory-card.is-up')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.memory-card.is-up')).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await coverOption(page).check();
  await cards(page).nth(a).click();
  await cards(page).nth(b).click();
  await page.clock.runFor(2000);
  await expect(page.locator('.memory-card.is-up')).toHaveCount(2);
  await cards(page).nth(c).click();
  await help.click();
  await expect(page.locator('.memory-limits')).toContainText('힌트 사용');
  await expect(page.locator('.memory-card.is-hint')).toHaveCount(1);
  await page.clock.runFor(650);
  await expect(page.locator('.memory-card.is-hint')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: '← 스테이지 고르기', exact: true }).click();
  await page.locator('.stage-card').nth(2).click();
  await expect(page.locator('.memory-card.is-up')).toHaveCount(0);
  await expect(page.locator('.memory-score')).toContainText('안 맞은 횟수 0');
  await page.reload();
  await page.getByRole('button', { name: /이어하기/ }).click();
  await expect(page.locator('.memory-screen h1')).toHaveText(MEMORY_STAGES[2].title);
  await expect(page.locator('.memory-card.is-up')).toHaveCount(0);
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{}').stars['last-run'], PROGRESS_KEY)).toBe(3);
});

async function restoreMemory(page: Page, stars: Record<string, number>, stage: string, bye = true) {
  await page.goto('/');
  await page.evaluate(({ key, stars, stage, bye }) => localStorage.setItem(key, JSON.stringify({ schemaVersion: 2, stars: { 'last-run': 3, ...stars }, stories: bye ? ['memory', 'memory:bye'] : ['memory'], last: { world: 'memory', stage } })), { key: PROGRESS_KEY, stars, stage, bye });
  await page.reload();
  await page.getByRole('button', { name: /이어하기|다음 퍼즐/ }).click();
}

test('memory: legacy save, partial rewards, storage event and 8/10-pair responsive input', async ({ page }) => {
  await seedRounds(page);
  const legacy = Object.fromEntries(MEMORY_STAGES.slice(0, 10).map(s => [s.id, 1]));
  await restoreMemory(page, legacy, 'memory-1-10');
  await expect(page.locator('.memory-screen h1')).toHaveText('안개 너머 역');
  await page.getByRole('button', { name: '← 스테이지 고르기', exact: true }).click();
  await page.getByRole('button', { name: '발견한 엽서 0 / 20 +', exact: true }).click();
  await expect(page.locator('#memory-album .memory-landscape')).toHaveCount(0);
  await expect(page.locator('.stage-card').nth(10)).toBeEnabled();
  await expect(page.locator('.stage-card').nth(11)).toBeDisabled();

  await restoreMemory(page, { 'memory-2-10': 1 }, 'memory-2-10');
  await expect(page.locator('.memory-screen h1')).toHaveText('물결의 입구');

  // A later-only restored code must not fill earlier map pieces or claim all 30 stages.
  await restoreMemory(page, { 'memory-3-09': 1 }, 'memory-3-10');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await coverOption(page).check();
  const faces = await observe(page);
  await shuffle(page).click();
  const first = 0, mate = faces.findIndex((f, i) => i !== first && f === faces[first]);
  const third = faces.findIndex((_, i) => i !== first && i !== mate);
  await cards(page).evaluateAll((nodes, [a, b, c]) => { for (const i of [a, b, c]) (nodes[i] as HTMLButtonElement).click(); }, [first, mate, third]);
  await expect(page.locator('.memory-card.is-matched')).toHaveCount(2);
  await expect(cards(page).nth(third)).not.toHaveAttribute('aria-label', /뒷면$/);
  await expect(page.locator('.memory-postcard .is-revealed')).toHaveCount(1);
  await expect(page.locator('.memory-shelf')).toContainText('1 / 10');
  await expect(page.locator('.memory-postcard-covers span').first()).toHaveCSS('transition-duration', '0.18s');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.memory-postcard-covers span').first()).toHaveCSS('transition-duration', '0s');
  await shuffle(page).click();
  await expect(page.locator('.memory-postcard .is-revealed')).toHaveCount(0);
  // A valid hint changes stars, never reveals any postcard piece itself.
  for (let i = 0; i < faces.length; i++) await cards(page).nth(i).click();
  const revealed = await page.locator('.memory-postcard .is-revealed').count();
  await page.getByRole('button', { name: '본 짝 알려주기 · 사용하면 최대 ★★', exact: true }).click();
  await expect(page.locator('.memory-postcard .is-revealed')).toHaveCount(revealed);
  await expect(page.locator('.memory-limits')).toContainText('힌트 사용');
  await solve(page, faces);
  const result = page.getByRole('region', { name: '스테이지 완료', exact: true });
  await expect(result.getByRole('button')).toHaveText(['스테이지 고르기']);
  await expect(result).not.toContainText('탐험 지도 완성');
  await expect(result).not.toContainText('30판을 모두');
  await expect(result.locator('.memory-result-postcard svg')).toBeVisible();
  await expect(page.getByRole('button', { name: '다음 스테이지 →', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '스테이지 고르기', exact: true }).click();
  await page.getByRole('button', { name: '발견한 엽서 2 / 20 +', exact: true }).click();
  await expect(page.locator('.memory-map .memory-map-missing')).toHaveCount(8);
  await expect(page.locator('.memory-map .memory-landscape')).toHaveCount(2);
  // Existing application storage listener updates an already-open collection.
  await page.evaluate(key => {
    const p = JSON.parse(localStorage.getItem(key)!);
    p.stars['memory-2-04'] = 1;
    localStorage.setItem(key, JSON.stringify(p));
    dispatchEvent(new StorageEvent('storage', { key, newValue: JSON.stringify(p) }));
  }, PROGRESS_KEY);
  await expect(page.locator('.memory-collection-toggle')).toContainText('3 / 20');
  for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1280, height: 800 }]) {
    await page.setViewportSize(viewport);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.locator('.stage-card').nth(29).click();
  await expect(page.locator('.memory-place')).toContainText('이미 모은 엽서');
  await expect(page.locator('.memory-postcard .is-revealed')).toHaveCount(0);

  for (const n of [10, 13, 29]) {
    const stage = MEMORY_STAGES[n];
    await restoreMemory(page, { [MEMORY_STAGES[n - 1].id]: 1 }, stage.id);
    for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1280, height: 800 }]) {
      await page.setViewportSize(viewport);
      const dimensions = await cards(page).evaluateAll(nodes => nodes.map(node => ({ width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height })));
      for (const size of dimensions) { expect(size.width).toBeGreaterThanOrEqual(44); expect(size.height).toBeGreaterThanOrEqual(44); }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.locator('.memory-board')).toHaveCSS('grid-template-columns', new RegExp(`^(\\S+ ){${stage.cols - 1}}\\S+$`));
      if (viewport.width === 390) expect((await page.locator('.memory-tools').boundingBox())!.y + (await page.locator('.memory-tools').boundingBox())!.height).toBeLessThanOrEqual(viewport.height);
    }
    await page.setViewportSize({ width: 320, height: 568 });
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    await expect(page.locator('.memory-heading h1')).toHaveCSS('font-size', '52px');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
  }
});
