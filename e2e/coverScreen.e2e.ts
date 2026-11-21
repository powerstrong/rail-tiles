import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { STAGES } from '../src/stages/stages';
import { S2_STAGES } from '../src/stages/season2';
import { ICE_STAGES } from '../src/penguin/stages';
import { DEPOT_STAGES } from '../src/depot/stages';
import { SPACE_STAGES } from '../src/space/stages';
import { MACHINE_STAGES } from '../src/machine/stages';
import { CLOCK_STAGES } from '../src/clock/stages';
import { VOLCANO_STAGES } from '../src/volcano/stages';
import { MEMORY_STAGES } from '../src/memory/stages';
import type { FlowStage } from '../src/flow/model';
import { act, actions, type Stage } from '../src/lab/model';
import { BeeSearch } from '../src/lab/beeSearch';

const data = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const labStages: Stage[] = [
  ...data('../src/lab/stages.generated.json'), ...data('../src/lab/bee50/stages.generated.json'),
];
const FLOW_STAGES: FlowStage[] = data('../src/flow/stages.generated.json');

type Course = { world: string; stages: { id: string }[]; board: string; tools: string };
const courses: Course[] = [
  { world: 'train', stages: STAGES, board: '.board-wrap', tools: '.dock' },
  { world: 'ice', stages: ICE_STAGES, board: '.board-wrap', tools: '.dock' },
  { world: 'bee', stages: labStages.filter(s => s.kind === 'bee'), board: '.lab-play-canvas', tools: '.lab-tools' },
  { world: 'flow', stages: FLOW_STAGES, board: '.flow-cloth', tools: '.flow-tools' },
  { world: 'memory', stages: MEMORY_STAGES, board: '.memory-board', tools: '.memory-tools' },
  { world: 'twins', stages: labStages.filter(s => s.kind === 'twins'), board: '.lab-play-canvas', tools: '.lab-tools' },
  { world: 'train2', stages: S2_STAGES, board: '.board-wrap', tools: '.dock' },
  { world: 'depot', stages: DEPOT_STAGES, board: '.board-wrap', tools: '.status-row' },
  { world: 'space', stages: SPACE_STAGES, board: '.board-wrap', tools: '.dock' },
  { world: 'machine', stages: MACHINE_STAGES, board: '.board-wrap', tools: '.status-row' },
  { world: 'clock', stages: CLOCK_STAGES, board: '.board-wrap', tools: '.dock' },
  { world: 'volcano', stages: VOLCANO_STAGES, board: '.board-wrap', tools: '.erupt-row' },
  { world: 'pieces', stages: data('../src/pieces/stages.generated.json'), board: '.pieces-canvas', tools: '.pieces-tools' },
  { world: 'coral', stages: data('../src/coral/stages.generated.json'), board: '.coral-ocean', tools: '.coral-tools' },
  { world: 'balance', stages: data('../src/balance/stages.generated.json'), board: '.balance-scales', tools: '.balance-tools' },
  { world: 'cloud', stages: data('../src/cloud/patterns.json'), board: '.cloud-scroll', tools: '.cloud-tools' },
];
const photographed = new Set(['train', 'ice', 'bee', 'flow', 'memory']);

async function inViewport(locator: Locator, page: Page) {
  await expect(locator).toBeVisible();
  const viewport = page.viewportSize()!;
  // Intro/story cards can still be entering after they become visible.
  await expect.poll(async () => {
    const box = await locator.boundingBox();
    return !!box && box.x >= 0 && box.y >= 0
      && box.x + box.width <= viewport.width + 1
      && box.y + box.height <= viewport.height + 1;
  }, { message: `${locator} should fit inside ${viewport.width}×${viewport.height}` }).toBe(true);
}
async function noHorizontalScroll(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
}
async function open(page: Page, course: Course, index = 0) {
  await page.goto('/');
  await page.evaluate(({ world, ids, index }) => localStorage.setItem('rail-tiles:progress', JSON.stringify({
    schemaVersion: 2,
    stars: Object.fromEntries(ids.slice(0, index).map(id => [id, 1])),
    stories: [world], last: { world, stage: ids[index] },
  })), { world: course.world, ids: course.stages.map(s => s.id), index });
  await page.reload();
  await page.getByRole('button', { name: /이어하기|다음 퍼즐/ }).click();
  const intro = page.locator('.intro-overlay');
  if (await intro.count()) {
    await inViewport(intro.getByRole('button').last(), page);
    await intro.getByRole('button').last().click();
  }
  await expect(page.locator(course.board)).toBeVisible();
}
async function checkPlay(page: Page, course: Course) {
  await noHorizontalScroll(page);
  await inViewport(page.locator('header').first(), page);
  await inViewport(page.locator('h1'), page);
  await inViewport(page.locator(course.board), page);
  await inViewport(page.locator(course.tools), page);
  for (const button of await page.locator(`${course.tools} button`).all()) {
    await inViewport(button, page);
    const box = await button.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
    if (await button.isEnabled()) await button.click({ trial: true });
  }
  // Scrolling dense boards must not steal the header or bottom tools.
  await page.locator(course.board).evaluate(el => { el.scrollTop = el.scrollHeight; });
  await inViewport(page.locator(course.tools), page);
  if (['bee', 'flow', 'memory'].includes(course.world)) {
    const cells = page.locator(course.world === 'bee' ? '.lb-bee-cell' : course.world === 'flow' ? '.flow-grid button' : '.memory-card');
    for (const cell of await cells.all()) {
      const box = await cell.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  }
  // SVG hit areas can be tiny even when the surrounding board fits perfectly.
  if (['train', 'train2', 'depot', 'machine', 'volcano'].includes(course.world)) {
    const scale = await page.locator('svg.board').evaluate(el => (el as SVGSVGElement).getScreenCTM()!.a);
    expect(scale * 100).toBeGreaterThanOrEqual(44);
  }
  if (course.world === 'pieces') {
    const cell = page.locator('.pieces-cell').last();
    await cell.scrollIntoViewIfNeeded();
    const box = (await cell.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    const region = (await page.locator(course.board).boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(region.y);
    expect(box.y + box.height).toBeLessThanOrEqual(region.y + region.height);
    await cell.click({ trial: true });
  }
  if (course.world === 'twins') {
    for (const button of await page.locator('.lb-direction').all()) {
      await inViewport(button, page);
      if (await button.isEnabled()) await button.click({ trial: true });
    }
  }
  await page.locator(course.board).evaluate(el => { el.scrollTop = 0; });
}

for (const viewport of [{ width: 360, height: 330 }, { width: 374, height: 300 }, { width: 360, height: 300 }]) {
  test.describe(`Flex Window ${viewport.width}×${viewport.height}`, () => {
    test.use({ viewport, hasTouch: true });
    test('unlocked orientation, title and route card stay in the viewport', async ({ page, request }) => {
      const manifest = await request.get('/manifest.webmanifest');
      expect(await manifest.json()).toMatchObject({ orientation: 'any', display: 'standalone' });
      await page.goto('/');
      await inViewport(page.locator('.logo'), page);
      await inViewport(page.getByRole('button', { name: '시작하기', exact: true }), page);
      await noHorizontalScroll(page);
      expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(viewport.height);
      if (viewport.width === 360) await page.screenshot({ path: test.info().outputPath('title.png') });
      await page.getByRole('button', { name: '시작하기', exact: true }).click();
      await inViewport(page.locator('.route-card'), page);
      await inViewport(page.getByRole('button', { name: '놀러 가기', exact: true }), page);
      await noHorizontalScroll(page);
      if (viewport.width === 360) await page.screenshot({ path: test.info().outputPath('route-map.png') });
      await page.getByRole('button', { name: /^구름 자수 공방,/ }).click();
      await inViewport(page.getByRole('button', { name: '놀러 가기', exact: true }), page);
      await page.getByRole('button', { name: '놀러 가기', exact: true }).click();
      await inViewport(page.getByRole('button', { name: '건너뛰기', exact: true }), page);
      await inViewport(page.locator('.story-actions button').last(), page);
    });

    for (const course of courses) {
      test(`${course.world}: first and dense final stage keep board and tools reachable`, async ({ page }) => {
        await open(page, course);
        await checkPlay(page, course);
        if (viewport.width === 360 && photographed.has(course.world)) {
          await page.screenshot({ path: test.info().outputPath(`${course.world}.png`) });
        }
        await open(page, course, course.stages.length - 1);
        await checkPlay(page, course);
      });
    }

    test('dense drawing boards scroll by touch from their margins without moving the tools', async ({ page }) => {
      const cdp = await page.context().newCDPSession(page);
      for (const world of ['bee', 'flow', 'train', 'depot', 'machine', 'volcano', 'pieces']) {
        const course = courses.find(c => c.world === world)!;
        await open(page, course, course.stages.length - 1);
        const region = page.locator(course.board);
        const box = (await region.boundingBox())!;
        const x = box.x + (world === 'bee' || world === 'flow' ? 12 : 6), start = box.y + box.height - 8;
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: start }] });
        for (let step = 1; step <= 6; step++) {
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: start - (box.height - 24) * step / 6 }] });
        }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await expect.poll(() => region.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
        await inViewport(page.locator(course.tools), page);
        await noHorizontalScroll(page);
        if (['train', 'depot', 'machine', 'volcano'].includes(world)) {
          const overflows = await region.evaluate(el => el.scrollWidth > el.clientWidth + 2);
          if (overflows) {
            await region.evaluate(el => { el.scrollLeft = 1; el.scrollTop = 20; });
            // Once both offsets are nonzero the ordinary side margins can be
            // offscreen; the sticky native pan strip must still accept gestures.
            const x = box.x + box.width / 2, y = box.y + box.height - 8;
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
            for (let step = 1; step <= 6; step++) {
              await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 80 * step / 6, y }] });
            }
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
            await expect.poll(() => region.evaluate(el => el.scrollLeft)).toBeGreaterThan(1);
            // Chromium can lock a gesture to one axis, so use a second swipe.
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
            for (let step = 1; step <= 6; step++) {
              await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - 40 * step / 6 }] });
            }
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
            await expect.poll(() => region.evaluate(el => el.scrollTop)).toBeGreaterThan(20);
            await inViewport(page.locator(course.tools), page);
          }
        }
      }
    });

    test('train cells can be tapped to complete a puzzle with result actions in reach', async ({ page }) => {
      await open(page, courses.find(c => c.world === 'train')!);
      for (const { x, y } of STAGES[0].solution) {
        const cell = page.locator(`.hit-layer rect[x="${x * 100}"][y="${y * 100}"]`);
        await cell.scrollIntoViewIfNeeded();
        await cell.tap();
      }
      await page.getByRole('button', { name: '출발', exact: true }).tap();
      const result = page.getByRole('region', { name: '스테이지 완료', exact: true });
      await expect(result).toBeVisible();
      for (const button of await result.getByRole('button').all()) {
        await inViewport(button, page);
        await button.click({ trial: true });
      }
      await noHorizontalScroll(page);
    });

    test('bee recovery and help stay reachable after a wrong turn on the dense board', async ({ page }) => {
      const course = courses.find(c => c.world === 'bee')!;
      const stage = labStages.find(s => s.id === course.stages.at(-1)!.id)!;
      const search = new BeeSearch(stage);
      let state = stage.start, dead: number[] | undefined;
      for (const action of stage.solution) {
        dead = actions(stage, state).map(a => act(stage, state, a)).find(next => next && next.length > state.length && search.query(next, 6000, Infinity).answer === 'impossible') ?? undefined;
        if (dead) break;
        state = act(stage, state, action)!;
      }
      expect(dead).toBeDefined();
      await open(page, course, course.stages.length - 1);
      for (const cell of dead!.slice(1)) await page.locator(`[data-bee-cell="${cell}"]`).tap();
      const recover = page.getByRole('button', { name: '마지막으로 풀 수 있던 지점으로 되돌리기', exact: true });
      await inViewport(recover, page);
      await inViewport(page.locator('.lab-tools'), page);
      await recover.tap();
      await expect(page.locator('.lab-stuck')).toHaveCount(0);
      await page.getByRole('button', { name: '규칙 보기', exact: true }).tap();
      const close = page.getByRole('button', { name: '알겠어요, 해 볼게요 ↓', exact: true });
      await close.scrollIntoViewIfNeeded();
      await inViewport(close, page);
      await close.tap();
      await expect(page.locator('.lab-play-rules')).toHaveCount(0);
      await noHorizontalScroll(page);
    });

    test('pieces tray scrolls by touch and hint actions leave the bottom tools reachable', async ({ page }) => {
      const course = courses.find(c => c.world === 'pieces')!;
      await open(page, course, course.stages.length - 1);
      const tray = page.locator('.pieces-tray');
      const box = (await tray.boundingBox())!;
      const cdp = await page.context().newCDPSession(page);
      const x = box.x + box.width - 25, y = box.y + box.height / 2;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      for (let step = 1; step <= 6; step++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 180 * step / 6, y }] });
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await expect.poll(() => tray.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
      await page.getByRole('button', { name: '한 조각 힌트', exact: true }).tap();
      await inViewport(page.locator('.pieces-hint-apply'), page);
      await page.locator('.pieces-hint-apply').tap();
      await expect(page.locator('.pieces-hint-apply')).toHaveCount(0);
      await inViewport(page.locator('.pieces-tools'), page);
      await noHorizontalScroll(page);
    });

    test('flow result actions and open help remain reachable', async ({ page }) => {
      const course = courses.find(c => c.world === 'flow')!;
      await open(page, course);
      await page.getByRole('button', { name: '도움말', exact: true }).click();
      await expect(page.locator('.flow-help')).toBeVisible();
      await inViewport(page.getByRole('button', { name: '접기', exact: true }), page);
      await page.getByRole('button', { name: '접기', exact: true }).click();
      // Public tap-to-connect path; completion also focuses the next-stage action.
      for (const cell of FLOW_STAGES[0].solution[0]) {
        await page.locator(`.flow-grid [data-cell="${cell}"]`).click();
      }
      const result = page.getByRole('region', { name: '스테이지 완료', exact: true });
      await expect(result).toBeVisible();
      for (const button of await result.getByRole('button').all()) await inViewport(button, page);
      await noHorizontalScroll(page);
    });
  });
}

for (const viewport of [{ width: 844, height: 390 }, { width: 1280, height: 480 }]) {
  test(`short landscape ${viewport.width}×${viewport.height}: every world keeps its controls`, async ({ page }) => {
    await page.setViewportSize(viewport);
    for (const course of courses) {
      await open(page, course, course.stages.length - 1);
      await checkPlay(page, course);
    }
  });
}

test('unfolding/resizing restores the existing phone, tablet and desktop layouts', async ({ page }) => {
  for (const world of ['train', 'bee', 'flow', 'pieces']) {
    await page.setViewportSize({ width: 360, height: 300 });
    await open(page, courses.find(c => c.world === world)!);
    for (const viewport of [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1280, height: 900 }, { width: 844, height: 481 }]) {
      await page.setViewportSize(viewport);
      await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--cover-top'))).toBe('');
      // Compare geometry with the cover media rule removed, including the built CSS order.
      const unchanged = await page.evaluate(() => {
        const boxes = () => JSON.stringify(Array.from(document.querySelectorAll('header, h1, button, svg.board, .pieces-canvas, .flow-cloth, .lab-play-canvas')).map(el => el.getBoundingClientRect().toJSON()));
        const before = boxes();
        const sheets = Array.from(document.styleSheets);
        const rules = sheets.flatMap(sheet => Array.from(sheet.cssRules)).filter((rule): rule is CSSMediaRule => rule instanceof CSSMediaRule && rule.conditionText === '(max-height: 480px)');
        const media = rules.map(rule => rule.media.mediaText);
        rules.forEach(rule => { rule.media.mediaText = 'not all'; });
        const same = before === boxes();
        rules.forEach((rule, i) => { rule.media.mediaText = media[i]; });
        return { same, count: rules.length };
      });
      expect(unchanged).toEqual({ same: true, count: 1 });
    }
  }
});
