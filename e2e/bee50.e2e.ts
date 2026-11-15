import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { act, actions, type Stage, type State } from '../src/lab/model';
import { BeeSearch } from '../src/lab/beeSearch';
const stages: Stage[] = JSON.parse(readFileSync(new URL('../src/lab/bee50/stages.generated.json', import.meta.url), 'utf8'));
const key = 'rail-tiles:progress';
const oldStars = { 'first-line': 2, 'lab-v1-twins-1': 3,
  ...Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`lab-v1-bee-${i + 1}`, i % 3 + 1])) };
async function open(page: Page, number: number, last = `lab-v1-bee-${number}`) {
  await page.goto('/');
  await page.evaluate(({ key, stars, last, earlier }) => localStorage.setItem(key, JSON.stringify({ schemaVersion: 2,
    stars: { ...stars, ...Object.fromEntries(earlier.map(id => [id, 1])) }, stories: ['bee'], last: { world: 'bee', stage: last },
  })), { key, stars: oldStars, last, earlier: stages.filter(s => s.number < number).map(s => s.id) });
  await page.reload();
  await page.getByRole('button', { name: /이어하기|다음 퍼즐/ }).click();
  const stage = stages[number - 31];
  await expect(page.locator('.lab-play h1')).toHaveText(stage.title);
  return stage;
}
async function tap(page: Page, cell: number) { await page.locator(`[data-bee-cell="${cell}"]`).tap(); }
async function saved(page: Page) { return page.evaluate(key => JSON.parse(localStorage.getItem(key)!).stars, key); }
function deadEnd(stage: Stage) {
  const search = new BeeSearch(stage);
  let state = stage.start;
  for (const action of stage.solution) {
    expect(search.query(state, 6_000, Infinity).answer).toBe('possible');
    for (const a of actions(stage, state)) {
      const next = act(stage, state, a);
      if (next && next.length > state.length && search.query(next, 6_000, Infinity).answer === 'impossible') return { prefix: state, action: a };
    }
    state = act(stage, state, action)!;
  }
  throw Error('Expected a recoverable branch');
}

test.describe('bee 50-stage mobile course', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('old final save continues to 31, with sequential unlock and old stars intact', async ({ page }) => {
    const stage = await open(page, 31, 'lab-v1-bee-30');
    await page.getByRole('button', { name: '← 스테이지 고르기', exact: true }).click();
    await expect(page.locator('.stage-card')).toHaveCount(50);
    await expect(page.locator('.stage-card').nth(30)).toBeEnabled();
    await expect(page.locator('.stage-card').nth(31)).toBeDisabled();
    await page.locator('.stage-card').nth(30).tap();
    for (const a of stage.solution) await tap(page, a);
    await expect(page.locator('.lab-clear')).toBeVisible();
    await page.getByRole('button', { name: '다음 스테이지 →', exact: true }).tap();
    await expect(page.locator('.lab-play h1')).toHaveText(stages[1].title);
    expect(await saved(page)).toMatchObject({ ...oldStars, 'lab-v1-bee-31': 3 });
  });
  test('arrow introduction responds immediately, rejects the wrong exit, and allows retracing', async ({ page }) => {
    const stage = await open(page, 41);
    await page.getByRole('button', { name: '규칙 보기', exact: true }).tap();
    await expect(page.getByRole('region', { name: '게임 규칙' })).toContainText('화살표 쪽으로 나가요');
    await page.getByRole('button', { name: '규칙 접기', exact: true }).tap();
    await expect(page.locator('[data-bee-cell="0"]')).toHaveAttribute('aria-label', /화살표 꽃.*오른쪽/);
    // Exercise a physical wrong tap despite aria-disabled announcing an unavailable exit.
    await page.locator('[data-bee-cell="5"]').tap({ force: true });
    await expect(page.locator('.lab-feedback-line')).toContainText('화살표 쪽으로');
    await expect(page.locator('.lb-bee-visited')).toHaveCount(1);
    await tap(page, 1); await tap(page, 6);
    await expect(page.locator('.lb-bee-visited')).toHaveCount(3);
    await tap(page, 1); await tap(page, 0);
    await expect(page.locator('.lb-bee-visited')).toHaveCount(1);
    for (const a of stage.solution) await tap(page, a);
    await expect(page.locator('.lab-clear')).toBeVisible();
    expect(await saved(page)).toMatchObject({ ...oldStars, [stage.id]: 3 });
  });
  test('6×6 final garden fits 44px targets; a dead end recovers and offline hints cap stars', async ({ page, context }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const stage = await open(page, 50), dead = deadEnd(stage);
    for (const [width, height] of [[390, 844], [360, 740], [320, 568]]) {
      await page.setViewportSize({ width, height });
      await expect.poll(async () => {
        const cell = await page.locator('.lb-bee-cell').first().boundingBox();
        return Math.min(cell!.width, cell!.height);
      }).toBeGreaterThanOrEqual(44);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    }
    for (const a of dead.prefix.slice(1)) await tap(page, a);
    await tap(page, dead.action);
    await expect(page.locator('.lab-stuck')).toBeVisible();
    await expect(page.locator('.lb-bee-retrace')).toBeEnabled();
    await page.getByRole('button', { name: '마지막으로 풀 수 있던 지점으로 되돌리기' }).tap();
    await expect(page.locator('.lab-stuck')).toHaveCount(0);
    await expect(page.locator('.lb-bee-visited')).toHaveCount(dead.prefix.length);
    await page.getByRole('button', { name: '처음부터', exact: true }).tap();
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await page.reload();
    await context.setOffline(true);
    await page.reload();
    await page.getByRole('button', { name: /이어하기/ }).click();
    await page.getByRole('button', { name: '한 걸음 힌트', exact: true }).tap();
    await expect(page.locator('.lb-hint')).toHaveCount(1);
    let state: State = stage.start;
    for (const a of stage.solution) { await tap(page, a); state = act(stage, state, a)!; }
    await expect(page.locator('.lab-clear')).toBeVisible();
    await expect(page.getByRole('region', { name: '스테이지 완료', exact: true }).getByRole('button')).toHaveText(['스테이지 고르기']);
    await expect(page.getByRole('button', { name: '다음 스테이지 →', exact: true })).toHaveCount(0);
    expect(await saved(page)).toMatchObject({ ...oldStars, [stage.id]: 2 });
    expect(errors).toEqual([]);
    await context.setOffline(false);
  });
});
