import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
const patterns = JSON.parse(readFileSync(new URL('../src/cloud/patterns.json', import.meta.url), 'utf8')) as { id: string; number: number; title: string; rows: number; cols: number }[];
const proofs = JSON.parse(readFileSync(new URL('../src/cloud/proofs.generated.json', import.meta.url), 'utf8')) as { stages: { id: string; solution: { cell: number; value: number }[] }[] };
async function open(page: Page, number: number) {
  await page.goto('/');
  await page.evaluate(({ id, previous }) => localStorage.setItem('rail-tiles:progress', JSON.stringify({ schemaVersion: 2,
    stars: Object.fromEntries(previous.map(id => [id, 1])), stories: ['cloud'], last: { world: 'cloud', stage: id },
  })), { id: patterns[number - 1].id, previous: patterns.slice(0, number - 1).map(s => s.id) });
  await page.reload(); await page.getByRole('button', { name: /이어하기/ }).click();
  await expect(page.locator('.cloud-heading h1')).toHaveText(patterns[number - 1].title);
}
async function finish(page: Page, number: number, touch = false) {
  let tool = 1;
  for (const step of proofs.stages[number - 1].solution) {
    if (step.value !== tool) {
      await page.getByRole('button', { name: step.value === 1 ? '✚ 수놓기' : '× 빈칸', exact: true }).click(); tool = step.value;
    }
    const cell = page.locator(`[data-cell="${step.cell}"]`);
    if (touch) await cell.tap(); else await cell.click();
  }
}
test('cloud opens from the fresh map, teaches one stitch, saves a coloured work and opens the next stage', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: '시작하기', exact: true }).click();
  await page.getByRole('button', { name: /^구름 자수 공방, 별 0\/90/ }).click();
  await page.getByRole('button', { name: '놀러 가기', exact: true }).click();
  await page.getByRole('button', { name: '건너뛰기', exact: true }).click();
  await expect(page.locator('.stage-card').nth(1)).toBeDisabled();
  await page.locator('.stage-card').first().click();
  await page.locator('[data-cell="0"]').click();
  await expect(page.getByRole('region', { name: '스테이지 완료', exact: true })).toBeVisible();
  await expect(page.locator('.cloud-board')).toHaveClass(/is-finished/);
  await expect(page.locator('[data-cell="0"]')).toHaveCSS('color', 'rgb(83, 126, 173)');
  await expect(page.getByRole('img', { name: '실 한 땀 완성 작품' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('rail-tiles:progress')!).stars['lab-v1-cloud-1'])).toBe(3);
  await page.getByRole('button', { name: /작품 모음/ }).click();
  await expect(page.locator('.cloud-gallery figure')).toHaveCount(1);
  await page.getByRole('button', { name: '다음 스테이지 →', exact: true }).click();
  await expect(page.locator('.cloud-heading h1')).toHaveText('둘이 꼭 붙어서');
});
test('cloud all thirty proofs finish through board controls and persist stars and the collection', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await open(page, 1);
  for (const stage of patterns) {
    await expect(page.locator('.cloud-heading h1')).toHaveText(stage.title);
    await finish(page, stage.number);
    await expect(page.getByRole('region', { name: '스테이지 완료', exact: true })).toBeVisible();
    await expect(page.locator('.cloud-stars')).toHaveAttribute('aria-label', '별 3개');
    await expect.poll(() => page.evaluate(id => JSON.parse(localStorage.getItem('rail-tiles:progress')!).stars[id], stage.id)).toBe(3);
    if (stage.number < 30) await page.getByRole('button', { name: '다음 스테이지 →', exact: true }).click();
  }
  await page.getByRole('button', { name: /작품 모음/ }).click();
  await expect(page.locator('.cloud-gallery figure')).toHaveCount(30);
  expect(errors).toEqual([]);
});
test('cloud touch lessons explain 2·1, contradictions, undo, erasing, hint star cap and restart', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
  const page = await context.newPage(); await open(page, 3);
  await expect(page.locator('.cloud-lesson')).toContainText('2·1');
  await page.locator('[data-cell="2"]').tap();
  await expect(page.locator('.cloud-feedback')).toContainText('맞지 않아요');
  await page.getByRole('button', { name: '직전 표시 되돌리기', exact: true }).tap();
  await expect(page.locator('[data-cell="2"]')).toHaveAttribute('data-mark', '0');
  await page.getByRole('button', { name: '한 줄 힌트', exact: true }).tap();
  await expect(page.locator('.cloud-feedback')).toContainText('1행 단서 2·1');
  await expect(page.locator('.cloud-feedback')).toContainText('방법이 하나뿐');
  await expect(page.locator('.cloud-hint-cell')).toHaveCount(1);
  await expect(page.getByRole('region', { name: '한 줄 힌트의 근거' })).toBeVisible();
  await finish(page, 3, true);
  await expect(page.locator('.cloud-stars')).toHaveAttribute('aria-label', '별 2개');
  await page.getByRole('button', { name: '↶ 되돌리기', exact: true }).tap();
  await expect(page.getByRole('region', { name: '스테이지 완료', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '↻ 처음부터', exact: true }).tap();
  await expect(page.locator('.cloud-score')).not.toContainText('힌트 사용');
  await finish(page, 3, true);
  await expect(page.locator('.cloud-stars')).toHaveAttribute('aria-label', '별 3개');
  await context.close();
});
test('cloud last board keeps phone cells at least 44px and supports zoom, line emphasis, keyboard and touch completion', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
  const page = await context.newPage(); await open(page, 30);
  const box = await page.locator('[data-cell="0"]').boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(44); expect(box!.height).toBeGreaterThanOrEqual(44);
  for (const width of [320, 390, 844]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: '+ 칸 크게 보기', exact: true }).tap();
  expect((await page.locator('[data-cell="0"]').boundingBox())!.width).toBe(56);
  expect(await page.locator('.cloud-scroll').evaluate(e => e.scrollWidth > e.clientWidth)).toBe(true);
  await page.getByRole('button', { name: '1행 단서 2·2', exact: true }).tap();
  await expect(page.locator('.cloud-board-row').first().locator('.line-active')).toHaveCount(6);
  await page.getByRole('button', { name: '− 한눈에 보기', exact: true }).tap();
  await page.locator('[data-cell="0"]').focus(); await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-cell="1"]')).toBeFocused(); await page.keyboard.press('Enter');
  await page.keyboard.press('Control+z'); await expect(page.locator('[data-cell="1"]')).toHaveAttribute('data-mark', '0');
  await finish(page, 30, true);
  await expect(page.getByRole('img', { name: '마음을 수놓아요 완성 작품' })).toBeVisible();
  await context.close();
});
