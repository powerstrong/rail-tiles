import { expect, test, type Page } from '@playwright/test';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { act, actions, type Stage } from '../src/lab/model';
import { BeeSearch } from '../src/lab/beeSearch';
const stages: Stage[] = ['../src/lab/stages.generated.json', '../src/lab/bee50/stages.generated.json']
  .flatMap(path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'))).filter(s => s.kind === 'bee');
const shots = '/tmp/ux1-shots';
function deadEnd(stage: Stage) {
  const search = new BeeSearch(stage);
  let state = stage.start;
  for (const action of stage.solution) {
    const dead = actions(stage, state).map(a => act(stage, state, a)).find(next => next && next.length > state.length && search.query(next, 6000, Infinity).answer === 'impossible');
    if (dead) return dead;
    state = act(stage, state, action)!;
  }
  return undefined;
}
async function open(page: Page, number: number) {
  await page.goto('/');
  await page.evaluate(({ ids, number }) => localStorage.setItem('rail-tiles:progress', JSON.stringify({ schemaVersion: 2,
    stars: Object.fromEntries(ids.filter((_, index) => index !== number - 1).map(id => [id, 2])), stories: ['bee', 'bee:bye'], last: { world: 'bee', stage: ids[number - 1] },
  })), { ids: stages.map(s => s.id), number });
  await page.reload(); await page.getByRole('button', { name: /이어하기|다음 퍼즐/ }).click();
}
async function metrics(page: Page) {
  return page.evaluate(() => {
    const box = (s: string) => { const r = document.querySelector(s)!.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom }; };
    return { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight, board: box('.lb-bee-frame'), cell: box('.lb-bee-cell'), tools: box('.lab-tools') };
  });
}
async function fits(page: Page) {
  const m = await metrics(page);
  expect(m.scrollWidth).toBeLessThanOrEqual(m.width);
  expect(m.scrollHeight).toBeLessThanOrEqual(m.height);
  expect(m.cell.width).toBeGreaterThanOrEqual(44);
  expect(m.cell.height).toBeGreaterThanOrEqual(44);
  expect(m.board.y).toBeGreaterThanOrEqual(0);
  expect(m.tools.bottom).toBeLessThanOrEqual(m.height);
  return m;
}
for (const [width, height] of [[390, 844], [360, 740], [320, 568]]) {
  test(`bee: all 50 boards and recovery fit ${width}×${height} without scrolling`, async ({ page }) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width, height });
    await open(page, 1);
    const measurements = [];
    for (const stage of stages) {
      await expect(page.locator('.lab-play h1')).toHaveText(stage.title);
      measurements.push({ stage: stage.number, ...await fits(page) });
      // One genuine move and its undo also keep feedback from pushing the controls down.
      await page.locator(`[data-bee-cell="${stage.solution[0]}"]`).click();
      await fits(page);
      await page.getByRole('button', { name: '되돌리기', exact: true }).click();
      await fits(page);
      // Exercise real dead ends on every board that offers a wrong forward choice.
      const dead = deadEnd(stage);
      if (stage.number > 3) expect(dead, `stage ${stage.number} must exercise recovery`).toBeDefined();
      if (dead) {
        const before = await metrics(page);
        for (const action of dead.slice(1)) await page.locator(`[data-bee-cell="${action}"]`).click();
        await expect(page.locator('.lab-stuck')).toBeVisible();
        const after = await fits(page);
        expect(after.board).toEqual(before.board);
        expect(after.tools).toEqual(before.tools);
        const recovery = page.getByRole('button', { name: '마지막으로 풀 수 있던 지점으로 되돌리기', exact: true });
        const box = await recovery.boundingBox();
        expect(box!.height).toBeGreaterThanOrEqual(44);
        expect(box!.y + box!.height).toBeLessThanOrEqual(height);
        const notice = await page.locator('.lab-stuck').boundingBox();
        expect(notice!.y + notice!.height).toBeLessThanOrEqual(after.tools.y);
        measurements[measurements.length - 1] = { ...measurements.at(-1)!, stuck: after };
        await recovery.click();
        await expect(page.locator('.lab-stuck')).toHaveCount(0);
        await page.getByRole('button', { name: '처음부터', exact: true }).click();
      }
      if (stage.number < 50) {
        await page.getByRole('button', { name: '← 스테이지 고르기', exact: true }).click();
        await page.locator('.stage-card').nth(stage.number).click();
      }
    }
    await page.getByRole('button', { name: '한 걸음 힌트', exact: true }).click();
    await expect(page.locator('.lb-hint')).toHaveCount(1);
    await fits(page);
    await page.getByRole('button', { name: '처음부터', exact: true }).click();
    const stage = stages[49], search = new BeeSearch(stage);
    let state = stage.start, dead: number[] | undefined;
    for (const action of stage.solution) {
      const alternative = actions(stage, state).map(a => act(stage, state, a)).find(next => next && next.length > state.length && search.query(next, 6000, Infinity).answer === 'impossible');
      if (alternative) { dead = alternative; break; }
      state = act(stage, state, action)!;
    }
    expect(dead).toBeDefined();
    mkdirSync(shots, { recursive: true });
    if (width === 390) {
      for (const action of stage.solution.slice(0, Math.floor(stage.solution.length / 2))) await page.locator(`[data-bee-cell="${action}"]`).click();
      await fits(page);
      await page.screenshot({ path: `${shots}/bee-50-playing.png` });
      await page.getByRole('button', { name: '처음부터', exact: true }).click();
    }
    const before = await metrics(page);
    for (const action of dead!.slice(1)) await page.locator(`[data-bee-cell="${action}"]`).click();
    await expect(page.locator('.lab-stuck')).toBeVisible();
    const after = await fits(page);
    expect(after.board).toEqual(before.board);
    expect(after.tools).toEqual(before.tools);
    const recovery = page.getByRole('button', { name: '마지막으로 풀 수 있던 지점으로 되돌리기', exact: true });
    const box = await recovery.boundingBox();
    expect(box!.y + box!.height).toBeLessThanOrEqual(height);
    expect(box!.height).toBeGreaterThanOrEqual(44);
    await expect(page.locator('.lb-bee-retrace')).toBeEnabled();
    if (width === 390) await page.screenshot({ path: `${shots}/bee-50-stuck.png` });
    await recovery.click();
    await expect(page.locator('.lab-stuck')).toHaveCount(0);
    await page.getByRole('button', { name: '처음부터', exact: true }).click();
    for (const action of stage.solution) await page.locator(`[data-bee-cell="${action}"]`).click();
    const result = page.getByRole('region', { name: '스테이지 완료', exact: true });
    await expect(result.getByRole('button')).toHaveText(['스테이지 고르기']);
    await expect(result.getByRole('button')).toBeFocused();
    await expect(result).toHaveText('스테이지 고르기');
    await expect(result.locator('.star-row')).toHaveAttribute('aria-label', '별 3개');
    await fits(page);
    if (width === 390) await page.screenshot({ path: `${shots}/bee-50-complete.png` });
    writeFileSync(`${shots}/measurements-${width}x${height}.json`, JSON.stringify(measurements, null, 2));
  });
}
