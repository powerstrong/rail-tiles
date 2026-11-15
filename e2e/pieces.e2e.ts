import { expectCompletion } from './assertCompletion';
import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { shape, type PiecesStage, type Pose } from '../src/pieces/model';
const stages: PiecesStage[] = JSON.parse(readFileSync(new URL('../src/pieces/stages.generated.json', import.meta.url), 'utf8'));
async function open(page: Page, number = 1) {
  await page.goto('/');
  await page.evaluate(({ number, stages }) => localStorage.setItem('rail-tiles:progress', JSON.stringify({
    schemaVersion: 2, stars: { 'last-run': 3, ...Object.fromEntries(stages.slice(0, number - 1).map(s => [s.id, 1])) }, stories: ['pieces'], last: { world: 'pieces', stage: `pieces-${number}` },
  })), { number, stages });
  await page.reload(); await page.getByRole('button', { name: /이어하기/ }).click();
  await expect(page.locator('.pieces h1')).toHaveText(stages[number - 1].title);
  return stages[number - 1];
}
async function place(page: Page, stage: PiecesStage, index: number, pose: Pose, touch = false) {
  const activate = async (selector: string) => touch ? page.locator(selector).tap() : page.locator(selector).click();
  await activate(`.pieces-piece:nth-child(${index + 1})`);
  if (pose.flip) await page.getByRole('button', { name: '↔ 뒤집기', exact: true }).click();
  for (let n = 0; n < pose.turn; n++) await page.getByRole('button', { name: '↻ 돌리기', exact: true }).click();
  const first = shape(stage.pieces[index], pose.turn, pose.flip)[0];
  await activate(`[data-cell="${pose.x + first[0]},${pose.y + first[1]}"]`);
}
test('pieces: all thirty stages replay through controls, save stars and unlock the next stage', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await open(page);
  for (const stage of stages) {
    await expect(page.locator('.pieces h1')).toHaveText(stage.title);
    if (stage.number < 21) await expect(page.getByRole('button', { name: '↔ 뒤집기', exact: true })).toHaveCount(0);
    for (const [index, pose] of stage.solution.entries()) await place(page, stage, index, pose);
    await expect(page.getByRole('region', { name: '스테이지 완료', exact: true })).toBeVisible();
    await expectCompletion(page.getByRole('region', { name: '스테이지 완료', exact: true }));
    await expect(page.locator('.pieces-picture')).toBeVisible();
    await expect(page.getByRole('region', { name: '스테이지 완료', exact: true }).getByRole('button').first()).toBeFocused();
    await expect.poll(() => page.evaluate(id => JSON.parse(localStorage.getItem('rail-tiles:progress')!).stars[id], stage.id)).toBe(3);
    if (stage.number < 30) await page.getByRole('button', { name: '다음 스테이지 →' }).click();
  }
  expect(errors).toEqual([]);
  await expect(page.getByRole('button', { name: '다음 스테이지 →' })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('rail-tiles:progress')!).stars['last-run'])).toBe(3);
});
test('pieces: dragging previews legal/illegal positions, pickup stays reversible, hint caps stars and reset releases cap', async ({ page }) => {
  const stage = await open(page, 2);
  const piece = page.locator('.pieces-piece').first();
  const pose = stage.solution[0];
  // Use the UI hint to orient the first held piece, then reset before the free drag checks.
  await page.getByRole('button', { name: '한 조각 힌트', exact: true }).click();
  await expect(page.locator('.pieces-ghost')).toHaveAttribute('data-valid', 'true');
  await page.getByRole('button', { name: '힌트대로 놓기' }).click();
  await expect(page.locator('.pieces-count')).toContainText('최대 ★★');
  await page.getByRole('button', { name: '↶ 되돌리기' }).click();
  await expect(page.locator('.pieces-board-caption')).toContainText('0 / 3');
  await page.getByRole('button', { name: '처음부터', exact: true }).click();
  await piece.click();
  for (let n = 0; n < pose.turn; n++) await page.getByRole('button', { name: '↻ 돌리기', exact: true }).click();
  const bounds = await piece.boundingBox();
  const first = shape(stage.pieces[0], pose.turn, pose.flip)[0];
  const cell = page.locator(`[data-cell="${pose.x + first[0]},${pose.y + first[1]}"]`);
  const cellBox = await cell.boundingBox();
  await page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2);
  await page.mouse.down();
  await page.mouse.move(cellBox!.x + cellBox!.width / 2, cellBox!.y + cellBox!.height / 2, { steps: 5 });
  await expect(page.locator('.pieces-ghost')).toHaveAttribute('data-valid', 'true');
  const boardBox = await page.locator('.pieces-board').boundingBox();
  await page.mouse.move(boardBox!.x + 2, boardBox!.y + 2);
  await expect(page.locator('.pieces-ghost')).toHaveAttribute('data-valid', 'false');
  await page.mouse.move(2, 2); await page.mouse.up();
  await expect(page.locator('.pieces-board-caption')).toContainText('0 / 3');
  // A valid drag commits immediately, and dragging that placed piece outside restores it.
  await page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2); await page.mouse.down();
  await page.mouse.move(cellBox!.x + cellBox!.width / 2, cellBox!.y + cellBox!.height / 2, { steps: 5 }); await page.mouse.up();
  await expect(page.locator('.pieces-board-caption')).toContainText('1 / 3');
  await page.mouse.down(); await page.mouse.move(2, 2, { steps: 5 }); await page.mouse.up();
  await expect(page.locator('.pieces-board-caption')).toContainText('1 / 3');
  await page.keyboard.press('Control+z');
  await expect(page.locator('.pieces-board-caption')).toContainText('0 / 3');
  await page.getByRole('button', { name: '한 조각 힌트', exact: true }).click();
  for (let i = 0; i < stage.pieces.length; i++) {
    if (i) await page.getByRole('button', { name: '한 조각 힌트', exact: true }).click();
    await page.getByRole('button', { name: '힌트대로 놓기' }).click();
  }
  await expect(page.locator('.pieces-clear .star-row')).toHaveAttribute('aria-label', '별 2개');
  // The picture never locks the board: lift a completed piece immediately, then undo.
  const pick = stage.solution[0], anchor = shape(stage.pieces[0], pick.turn, pick.flip)[0];
  await page.locator(`[data-cell="${pick.x + anchor[0]},${pick.y + anchor[1]}"]`).click();
  await page.getByRole('button', { name: '↓ 바구니로' }).click();
  await expect(page.locator('.pieces-clear')).toHaveCount(0);
  await page.getByRole('button', { name: '↶ 되돌리기' }).click();
  await expect(page.locator('.pieces-clear')).toBeVisible();
});
test('pieces: first and last stages fit 390px, touch/keyboard input works and screenshots show play', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const stage = await open(page);
  await mkdir('/tmp/newworlds-shots', { recursive: true });
  await page.screenshot({ path: '/tmp/newworlds-shots/poly-first.png' });
  const touch = await context.newCDPSession(page);
  const trayBox = await page.locator('.pieces-piece').first().boundingBox();
  const a = shape(stage.pieces[0])[0], at = stage.solution[0];
  const targetBox = await page.locator(`[data-cell="${at.x + a[0]},${at.y + a[1]}"]`).boundingBox();
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: trayBox!.x + trayBox!.width / 2, y: trayBox!.y + trayBox!.height / 2 }] });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: targetBox!.x + targetBox!.width / 2, y: targetBox!.y + targetBox!.height / 2 }] });
  await expect(page.locator('.pieces-ghost')).toHaveAttribute('data-valid', 'true');
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.locator('.pieces-board-caption')).toContainText('1 / 2');
  await place(page, stage, 1, stage.solution[1], true);
  await expect(page.locator('.pieces-clear')).toBeVisible();
  const last = await open(page, 30);
  for (const [index, pose] of last.solution.slice(0, 3).entries()) await place(page, last, index, pose, true);
  await expect(page.locator('.pieces-board-caption')).toContainText('3 / 7');
  await page.getByRole('button', { name: '한 조각 힌트', exact: true }).click();
  await page.screenshot({ path: '/tmp/newworlds-shots/poly-last-progress.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  // Finish the remaining pieces by real controls; reflection was necessary in the stage audit.
  while (await page.locator('.pieces-clear').count() === 0) {
    await page.getByRole('button', { name: '힌트대로 놓기' }).click();
    if (await page.locator('.pieces-clear').count() === 0) await page.getByRole('button', { name: '한 조각 힌트', exact: true }).click();
  }
  await expect(page.locator('.pieces-clear .star-row')).toHaveAttribute('aria-label', '별 2개');
  // Keyboard-only placement on the tutorial: select, then activate each target square.
  await open(page);
  for (const [index, pose] of stage.solution.entries()) {
    await page.locator('.pieces-piece').nth(index).focus(); await page.keyboard.press('Enter');
    const a = shape(stage.pieces[index])[0];
    await page.locator(`[data-cell="${pose.x + a[0]},${pose.y + a[1]}"]`).focus(); await page.keyboard.press('Enter');
  }
  await expect(page.locator('.pieces-clear')).toBeVisible();
  await context.close();
});
test('pieces: available from a fresh route map, sequential stage locks and continue survive reload', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: '시작하기', exact: true }).click();
  const station = page.getByRole('button', { name: /^조각 맞추기, 별 0\/90/ });
  await station.click();
  await page.getByRole('button', { name: '놀러 가기', exact: true }).click();
  await page.getByRole('button', { name: '건너뛰기', exact: true }).click();
  await expect(page.locator('.stage-card')).toHaveCount(30);
  await expect(page.locator('.stage-card').nth(1)).toBeDisabled();
  await page.locator('.stage-card').first().click();
  for (const [index, pose] of stages[0].solution.entries()) await place(page, stages[0], index, pose);
  await expect(page.locator('.pieces-clear')).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('rail-tiles:progress')!).stars['pieces-1'])).toBe(3);
  await page.reload(); await page.getByRole('button', { name: /다음 퍼즐/ }).click();
  await expect(page.locator('.pieces h1')).toHaveText(stages[1].title);
});

test('pieces: seven-column targets stay 44px on small phones and the last stage finishes by touch', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await context.newPage();
  const stage = await open(page, 30);
  for (const width of [390, 360, 320]) {
    await page.setViewportSize({ width, height: 844 });
    // A viewport resize can resolve before Chromium applies its media queries.
    await expect.poll(() => page.locator('.pieces-cell').evaluateAll(nodes => nodes.every(node => {
      const { width, height } = node.getBoundingClientRect(); return width >= 44 && height >= 44;
    }))).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  }
  for (const [index, pose] of stage.solution.entries()) await place(page, stage, index, pose, true);
  await expect(page.locator('.pieces-clear')).toBeVisible();
  await context.close();
});
