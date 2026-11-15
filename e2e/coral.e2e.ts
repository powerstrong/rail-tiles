import { expectCompletion } from './assertCompletion';
import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { count, Reef, type CoralStage } from '../src/coral/model';
const CORAL_STAGES: CoralStage[] = JSON.parse(readFileSync(new URL('../src/coral/stages.generated.json', import.meta.url), 'utf8'));

async function open(page: Page, number: number, extraStars: Record<string, number> = {}) {
  const stage = CORAL_STAGES[number - 1];
  await page.goto('/');
  await page.evaluate(({ stage, earlier, extraStars }) => localStorage.setItem('rail-tiles:progress', JSON.stringify({
    schemaVersion: 2, stars: { ...Object.fromEntries(earlier.map(s => [s.id, 1])), ...extraStars },
    stories: ['coral'], last: { world: 'coral', stage: stage.id },
  })), { stage, earlier: CORAL_STAGES.slice(0, number - 1), extraStars });
  await page.reload();
  await page.getByRole('button', { name: /이어하기/ }).click();
  await expect(page.locator('.coral-heading h1')).toHaveText(stage.title);
  return stage;
}
const color = (page: Page, c: number) => page.locator(`.coral-color[data-color="${c}"]`);
const saved = (page: Page, stage: CoralStage) => page.evaluate(id => JSON.parse(localStorage.getItem('rail-tiles:progress')!).stars?.[id], stage.id);

test('coral: initial station, sequential unlocks, all 30 solutions and official three-star saves', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await page.getByRole('button', { name: '시작하기', exact: true }).click();
  await page.getByRole('button', { name: /^무지개 산호초, 별 0\/90/ }).click();
  await page.getByRole('button', { name: /이 세계로|출발|놀러|들어가기/ }).last().click();
  await page.getByRole('button', { name: '건너뛰기', exact: true }).click();
  await expect(page.locator('.stage-card')).toHaveCount(30);
  await expect(page.locator('.stage-card').nth(1)).toBeDisabled();
  await page.locator('.stage-card').first().click();
  for (const s of CORAL_STAGES) {
    await expect(page.locator('.coral-heading h1')).toHaveText(s.title);
    const reef = new Reef(s); let state = reef.initial();
    for (const c of s.solution) {
      const gain = count(reef.expand(state.mask, c)) - count(state.mask);
      await expect(color(page, c)).toHaveAccessibleName(new RegExp(`${gain}칸 커져요`));
      await color(page, c).focus();
      await expect(page.locator('.coral-cell.is-preview')).toHaveCount(gain);
      await color(page, c).click();
      state = reef.move(state, c)!;
    }
    await expect(page.getByRole('region', { name: '스테이지 완료', exact: true })).toBeVisible();
    await expectCompletion(page.getByRole('region', { name: '스테이지 완료', exact: true }));
    await expect(page.getByRole('region', { name: '스테이지 완료', exact: true }).getByRole('button').first()).toBeFocused();
    await expect.poll(() => saved(page, s)).toBe(3);
    if (s.number < 30) await page.getByRole('button', { name: '다음 스테이지 →', exact: true }).click();
  }
  expect(errors).toEqual([]);
});

test('coral: inefficient play still completes, hint caps survive undo, reset and best records work', async ({ page }) => {
  const stage = await open(page, 10, { 'last-run': 3 });
  const reef = new Reef(stage); let state = reef.initial();
  await page.getByRole('button', { name: '한 걸음 힌트', exact: true }).click();
  await expect(page.locator('.coral-color.is-hint')).toHaveCount(1);
  const hinted = Number(await page.locator('.is-hint').getAttribute('data-color'));
  await color(page, hinted).click();
  await page.getByRole('button', { name: '↶ 되돌리기', exact: true }).click();
  await expect(page.locator('.coral-feedback')).toContainText('최대 ★★');
  for (const c of stage.solution) await color(page, c).click();
  await expect.poll(() => saved(page, stage)).toBe(2);
  await page.getByRole('button', { name: '↻ 처음부터', exact: true }).click();
  await expect(page.locator('.coral-feedback')).not.toContainText('힌트 사용');
  for (const c of stage.solution.slice(0, -1)) { await color(page, c).click(); state = reef.move(state, c)!; }
  const last = stage.solution.at(-1)!;
  for (let i = 0; i < 6; i++) {
    const c = reef.palette.find(c => c !== state.color && c !== last)!;
    await color(page, c).click(); state = reef.move(state, c)!;
  }
  await expect(page.getByTestId('coral-moves')).toHaveText(`${stage.par + 5}번`);
  await color(page, last).click();
  await expect(page.locator('.coral-clear .star-row')).toHaveAccessibleName('별 1개');
  await expect.poll(() => saved(page, stage)).toBe(2);
  await page.getByRole('button', { name: '↻ 처음부터', exact: true }).click();
  for (const c of stage.solution) await color(page, c).click();
  await expect.poll(() => saved(page, stage)).toBe(3);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('rail-tiles:progress')!).stars['last-run'])).toBe(3);
  await page.reload();
  await page.getByRole('button', { name: /다음 퍼즐/ }).click();
  await expect(page.locator('.coral-heading h1')).toHaveText(CORAL_STAGES[10].title);
});

test('coral: touch at 390px, rock cells, instant input during waves and offline worker hints', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'no-preference' });
  const page = await context.newPage();
  const stage = await open(page, 30), reef = new Reef(stage);
  await expect(page.locator('.coral-cell.is-rock')).toHaveCount(stage.start.filter(c => c < 0).length);
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload();
  await page.getByRole('button', { name: /이어하기/ }).click();
  await context.setOffline(true);
  await page.getByRole('button', { name: '한 걸음 힌트', exact: true }).tap();
  await expect(page.locator('.coral-color.is-hint')).toHaveCount(1);
  // Dispatch two real button clicks in a single browser task, before any animation can end.
  await page.evaluate(([a, b]) => {
    (document.querySelector(`[data-color="${a}"]`) as HTMLButtonElement).click();
    (document.querySelector(`[data-color="${b}"]`) as HTMLButtonElement).click();
  }, stage.solution.slice(0, 2));
  await expect(page.getByTestId('coral-moves')).toHaveText('2번');
  const second = reef.move(reef.move(reef.initial(), stage.solution[0])!, stage.solution[1])!;
  await expect(page.locator('.coral-cell.is-owned')).toHaveCount(count(second.mask));
  await page.getByRole('button', { name: '↶ 되돌리기', exact: true }).tap();
  await expect(page.getByTestId('coral-moves')).toHaveText('1번');
  for (const c of stage.solution.slice(1)) await color(page, c).tap();
  await expect(page.locator('.coral-clear .star-row')).toHaveAccessibleName('별 2개');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(overflow).toBe(0);
  await context.close();
});
