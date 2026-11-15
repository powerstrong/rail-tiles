import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { move, totals, type BalanceStage, type State } from '../src/balance/model';

const BALANCE_STAGES: BalanceStage[] = JSON.parse(readFileSync(new URL('../src/balance/stages.generated.json', import.meta.url), 'utf8'));
const key = 'rail-tiles:progress';
async function open(page: Page, number = 1) {
  const stage = BALANCE_STAGES[number - 1];
  await page.goto('/');
  await page.evaluate(({ key, stage, earlier }) => localStorage.setItem(key, JSON.stringify({
    schemaVersion: 2, stars: { 'last-run': 3, ...Object.fromEntries(earlier.map(id => [id, 1])) },
    stories: ['balance'], last: { world: 'balance', stage },
  })), { key, stage: stage.id, earlier: BALANCE_STAGES.slice(0, number - 1).map(s => s.id) });
  await page.reload(); await page.getByRole('button', { name: /이어하기/ }).click();
  await expect(page.locator('.balance-play h1')).toContainText(stage.title);
  return stage;
}
async function press(page: Page, group: number, touch = false) {
  const candy = page.locator(`.balance-candy[data-group="${group}"]`).first();
  if (touch) await candy.tap(); else await candy.click();
}
async function checkTotals(page: Page, stage: BalanceStage, state: State) {
  for (const [scale, pair] of totals(stage, state).entries()) for (const [side, sum] of pair.entries()) {
    await expect(page.getByTestId(`total-${scale}-${side}`)).toHaveText(String(sum));
  }
}
test('balance: all 30 stages replay their minimum solutions and save three stars', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await open(page);
  for (const stage of BALANCE_STAGES) {
    await expect(page.locator('.balance-play h1')).toContainText(stage.title);
    let state = stage.start;
    await checkTotals(page, stage, state);
    for (const group of stage.solution) {
      await press(page, group); state = move(stage, state, group); await checkTotals(page, stage, state);
    }
    await expect(page.getByRole('region', { name: '스테이지 완료', exact: true })).toBeVisible();
    await expect(page.locator('.balance-clear h2')).toBeFocused();
    await expect.poll(() => page.evaluate(([key, id]) => JSON.parse(localStorage.getItem(key)!).stars[id], [key, stage.id])).toBe(3);
    if (stage.number < 30) await page.getByRole('button', { name: '다음 스테이지 →', exact: true }).click();
  }
  await expect(page.getByRole('button', { name: '다음 스테이지 →', exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('balance opens from the initial map, has sequential unlocks, and continues after reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '시작하기', exact: true }).click();
  await page.getByRole('button', { name: /^별사탕 저울, 별 0\/90/ }).click();
  await page.getByRole('button', { name: '놀러 가기', exact: true }).click();
  await page.getByRole('button', { name: '건너뛰기', exact: true }).click();
  await expect(page.locator('.stage-card')).toHaveCount(30);
  await expect(page.locator('.stage-card').nth(1)).toBeDisabled();
  await page.locator('.stage-card').first().click();
  await press(page, BALANCE_STAGES[0].solution[0]);
  await page.getByRole('button', { name: '다음 스테이지 →', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: /이어하기.*별사탕 저울/ }).click();
  await expect(page.locator('.balance-play h1')).toContainText(BALANCE_STAGES[1].title);
});

test.describe('balance with full motion', () => {
  test.use({ reducedMotion: 'no-preference' });
  test('rapid inputs, tilt, sums, undo and keyboard stay immediate; hint caps stars', async ({ page }) => {
    const stage = await open(page, 30);
    const groups = stage.solution.slice(0, 2);
    const beams = await page.getByTestId('balance-beam').evaluateAll(nodes => nodes.map(node => node.getAttribute('d')));
    await page.evaluate(groups => {
      for (const group of groups) (document.querySelector(`.balance-candy[data-group="${group}"]`) as HTMLButtonElement).click();
    }, groups);
    const state = groups.reduce((s, g) => move(stage, s, g), stage.start);
    await checkTotals(page, stage, state);
    expect(await page.getByTestId('balance-beam').evaluateAll(nodes => nodes.map(node => node.getAttribute('d')))).not.toEqual(beams);
    await expect(page.locator('.balance-candy').first()).toBeEnabled();
    await page.keyboard.press('ControlOrMeta+z');
    await checkTotals(page, stage, move(stage, stage.start, groups[0]));
    await page.getByRole('button', { name: '↻ 처음부터', exact: true }).click();
    await page.getByRole('button', { name: '✧ 힌트', exact: true }).click();
    await expect(page.locator('.balance-hint').first()).toBeVisible();
    for (const group of stage.solution) await press(page, group);
    await expect(page.locator('.balance-clear')).toBeVisible();
    await expect.poll(() => page.evaluate(([key, id]) => JSON.parse(localStorage.getItem(key)!).stars[id], [key, stage.id])).toBe(2);
    await page.getByRole('button', { name: '↶ 되돌리기', exact: true }).click();
    await expect(page.locator('.balance-clear')).toHaveCount(0);
    await expect(page.locator('.balance-star-guide')).toContainText('힌트 사용');
    await page.getByRole('button', { name: '↻ 처음부터', exact: true }).click();
    await expect(page.locator('.balance-star-guide')).not.toContainText('힌트 사용');
    for (const group of stage.solution) await press(page, group);
    await expect.poll(() => page.evaluate(([key, id]) => JSON.parse(localStorage.getItem(key)!).stars[id], [key, stage.id])).toBe(3);
  });
});

test.describe('balance mobile touch', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('first and final puzzles fit and finish with taps, including paired candies', async ({ page }) => {
    for (const number of [1, 30]) {
      const stage = await open(page, number);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      const sizes = await page.locator('.balance-candy').evaluateAll(nodes => nodes.map(node => ({ width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height })));
      expect(sizes.every(({ width, height }) => width >= 44 && height >= 44)).toBe(true);
      for (const group of stage.solution) await press(page, group, true);
      await expect(page.locator('.balance-clear')).toBeVisible();
    }
  });
});
