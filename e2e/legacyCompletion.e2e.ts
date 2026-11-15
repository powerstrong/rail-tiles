import { expect, test, type Page } from '@playwright/test';
import { expectCompletion } from './assertCompletion';
import { STAGES } from '../src/stages/stages';
import { S2_STAGES } from '../src/stages/season2';
import { createEditor, placeRail, rotateRail } from '../src/engine/editor';
import { type Stage } from '../src/engine/stage';

async function point(page: Page, selector: string, x: number, y: number) {
  return page.locator(selector).evaluate((svg, [x, y]) => {
    const p = (svg as SVGSVGElement).createSVGPoint(); p.x = x * 100; p.y = y * 100;
    const s = p.matrixTransform((svg as SVGSVGElement).getScreenCTM()!);
    return { x: s.x, y: s.y };
  }, [x, y]);
}
async function rail(page: Page, stage: Stage) {
  let state = createEditor();
  for (const p of stage.solution) {
    await page.getByRole('radio', { name: new RegExp({ straight: '직선', curve: '곡선', cross: '교차' }[p.rail.kind]) }).click();
    const pos = await point(page, 'svg.board', p.x + .5, p.y + .5);
    await page.mouse.click(pos.x, pos.y);
    state = placeRail(stage, state, p.x, p.y, p.rail.kind);
    while (state.placed[`${p.x},${p.y}`].rot !== p.rail.rot) {
      await page.mouse.click(pos.x, pos.y);
      state = rotateRail(state, p.x, p.y);
    }
  }
  await page.getByRole('button', { name: '출발', exact: true }).click();
}
const cases: { world: string; id: string; solve: (page: Page) => Promise<void> }[] = [
  { world: 'train', id: 'first-line', solve: page => rail(page, STAGES[0]) },
  { world: 'train2', id: 't2-first-gate', solve: page => rail(page, S2_STAGES[0]) },
  { world: 'ice', id: 'ice-first-slide', solve: async page => {
    for (const name of ['왼쪽으로 밀기', '아래로 밀기']) await page.getByRole('button', { name, exact: true }).click();
  } },
  { world: 'machine', id: 'mc-first-mirror', solve: async page => {
    await page.getByRole('button', { name: '거울 1 돌리기', exact: true }).click();
  } },
  { world: 'volcano', id: 'v-first-stone', solve: async page => {
    const p = await point(page, '.volcano-board', 2.5, 3.5); await page.mouse.click(p.x, p.y);
    await page.locator('.erupt-btn').click();
  } },
  { world: 'depot', id: 'dp-first-push', solve: async page => {
    const a = await point(page, 'svg.depot-board', 2.5, 1.5), b = await point(page, 'svg.depot-board', 2.5, .5);
    await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 5 }); await page.mouse.up();
    const r = await point(page, 'svg.depot-board', .5, 2.5), exit = await point(page, 'svg.depot-board', 4.8, 2.5);
    await page.mouse.move(r.x, r.y); await page.mouse.down(); await page.mouse.move(exit.x, exit.y, { steps: 10 }); await page.mouse.up();
  } },
  { world: 'space', id: 'sp-first-gravity', solve: async page => {
    for (const name of ['중력 위', '중력 위', '중력 오른쪽']) await page.getByRole('button', { name, exact: true }).click();
  } },
  { world: 'clock', id: 'ck-first-steps', solve: async page => {
    for (const name of ['아래로 한 칸', '아래로 한 칸', '아래로 한 칸', '왼쪽으로 한 칸']) await page.getByRole('button', { name, exact: true }).click();
  } },
];
for (const width of [390, 360]) for (const c of cases) test(`${c.world}: mobile ${width}px completion, focus, save and navigation`, async ({ page }) => {
  await page.setViewportSize({ width, height: width === 390 ? 844 : 740 });
  await page.goto('/');
  await page.evaluate(({ world, id }) => localStorage.setItem('rail-tiles:progress', JSON.stringify({
    schemaVersion: 2, stars: { 'last-run': 3, 'ice-big-adventure': 1, 'mc-boss-1': 2, 't2-boss-1': 1, 'sp-boss-1': 3 },
    stories: [world], last: { world, stage: id },
  })), { world: c.world, id: c.id });
  await page.reload(); await page.getByRole('button', { name: /이어하기/ }).click();
  const intro = page.getByRole('button', { name: '알았어요!', exact: true });
  if (await intro.count()) await intro.click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await c.solve(page);
  const card = page.getByRole('region', { name: '스테이지 완료', exact: true });
  await expectCompletion(card);
  await expect(card).toHaveText('다음 스테이지 →스테이지 고르기');
  const bounds = await card.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  await expect.poll(() => page.evaluate(id => JSON.parse(localStorage.getItem('rail-tiles:progress')!).stars[id], c.id)).toBe(3);
  await page.keyboard.press('Enter');
  await expect(card).toHaveCount(0);
  await page.reload();
  expect(await page.evaluate(id => JSON.parse(localStorage.getItem('rail-tiles:progress')!).stars[id], c.id)).toBe(3);
});
