import { createEditor, placeRail, rotateRail } from '../src/engine/editor';
import { GONE } from '../src/depot/model';
import { shape, type PiecesStage } from '../src/pieces/model';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
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
  { world: 'train', stages: STAGES, board: 'svg.board', tools: '.dock' },
  { world: 'ice', stages: ICE_STAGES, board: 'svg.board', tools: '.dock' },
  { world: 'bee', stages: labStages.filter(s => s.kind === 'bee'), board: '.lb-bee-frame', tools: '' },
  { world: 'flow', stages: FLOW_STAGES, board: '.flow-cloth', tools: '' },
  { world: 'memory', stages: MEMORY_STAGES, board: '.memory-board', tools: '' },
  { world: 'twins', stages: labStages.filter(s => s.kind === 'twins'), board: '.lb-forest-pair', tools: '.lb-dpad' },
  { world: 'train2', stages: S2_STAGES, board: 'svg.board', tools: '.dock' },
  { world: 'depot', stages: DEPOT_STAGES, board: 'svg.board', tools: '' },
  { world: 'space', stages: SPACE_STAGES, board: 'svg.board', tools: '.dock' },
  { world: 'machine', stages: MACHINE_STAGES, board: 'svg.board', tools: '' },
  { world: 'clock', stages: CLOCK_STAGES, board: 'svg.board', tools: '.dock' },
  { world: 'volcano', stages: VOLCANO_STAGES, board: 'svg.board', tools: '.erupt-row' },
  { world: 'pieces', stages: data('../src/pieces/stages.generated.json'), board: '.pieces-canvas', tools: '.pieces-tray, .pieces-transform' },
  { world: 'coral', stages: data('../src/coral/stages.generated.json'), board: '.coral-ocean', tools: '.coral-palette' },
  { world: 'balance', stages: data('../src/balance/stages.generated.json'), board: '.balance-scales', tools: '' },
  { world: 'cloud', stages: data('../src/cloud/patterns.json'), board: '.cloud-board', tools: '.cloud-toolbar' },
];
const photographed = new Set(['train', 'ice', 'bee', 'flow', 'memory', 'twins', 'pieces', 'cloud', 'coral', 'balance']);
const shots = '/tmp/boardfirst-shots';
mkdirSync(shots, { recursive: true });

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
/** Replay the public controls at their fitted size, then exercise the real result. */
async function finish(page: Page, course: Course, index: number) {
  const point = async (x: number, y: number) => page.locator('svg.board').evaluate((svg, [x, y]) => {
    const p = (svg as SVGSVGElement).createSVGPoint(); p.x = x * 100; p.y = y * 100;
    const screen = p.matrixTransform((svg as SVGSVGElement).getScreenCTM()!);
    return { x: screen.x, y: screen.y };
  }, [x, y]);
  const tapCell = async (x: number, y: number) => { const p = await point(x, y); await page.mouse.click(p.x, p.y); };
  switch (course.world) {
    case 'train': case 'train2': {
      const stage = (course.world === 'train' ? STAGES : S2_STAGES)[index];
      let editor = createEditor();
      for (const p of stage.solution) {
        await page.getByRole('radio', { name: new RegExp({ straight: '직선', curve: '곡선', cross: '교차' }[p.rail.kind]) }).click();
        await tapCell(p.x + .5, p.y + .5);
        editor = placeRail(stage, editor, p.x, p.y, p.rail.kind);
        while (editor.placed[`${p.x},${p.y}`].rot !== p.rail.rot) {
          await tapCell(p.x + .5, p.y + .5); editor = rotateRail(editor, p.x, p.y);
        }
      }
      await page.getByRole('button', { name: '출발', exact: true }).click();
      break;
    }
    case 'ice': {
      const stage = ICE_STAGES[index];
      for (const push of stage.solution) {
        if (stage.penguins.length > 1) await page.getByRole('radio', { name: `펭귄 ${push.penguin + 1}`, exact: true }).click();
        await page.locator(`.dpad-${push.dir}`).click();
      }
      break;
    }
    case 'space':
      for (const [i, dir] of SPACE_STAGES[index].solution.entries()) {
        await page.locator(`.dpad-${dir}`).click();
        await expect(page.locator('.board-first-status')).toContainText(`중력 ${i + 1}번`);
      }
      break;
    case 'clock': for (const action of CLOCK_STAGES[index].solution) await page.locator(action === 4 ? '.clock-rest' : `.dpad-${action}`).click(); break;
    case 'machine': for (const device of MACHINE_STAGES[index].solution) await page.getByRole('button', { name: `거울 ${device + 1} 돌리기`, exact: true }).click(); break;
    case 'volcano': {
      const stage = VOLCANO_STAGES[index];
      for (const cell of stage.solution) await tapCell(cell % stage.width + .5, Math.floor(cell / stage.width) + .5);
      if (!stage.race) await page.locator('.erupt-btn').click();
      break;
    }
    case 'depot': {
      const stage = DEPOT_STAGES[index], state = [...stage.start];
      for (const [i, move] of stage.solution.entries()) {
        const v = stage.vehicles[move.vehicle], from = state[move.vehicle];
        const to = move.to === GONE ? (v.exit === 1 || v.exit === 2 ? (v.horizontal ? stage.width : stage.height) - v.len + 1 : -1) : move.to;
        const a = await point(v.horizontal ? from + v.len / 2 : v.line + .5, v.horizontal ? v.line + .5 : from + v.len / 2);
        const b = await point(v.horizontal ? to + v.len / 2 : v.line + .5, v.horizontal ? v.line + .5 : to + v.len / 2);
        await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 5 }); await page.mouse.up();
        state[move.vehicle] = move.to;
        if (i < stage.solution.length - 1) await expect(page.getByRole('button', { name: '힌트 보기', exact: true })).toBeEnabled();
      }
      break;
    }
    case 'bee': case 'twins': {
      const stage = labStages.filter(s => s.kind === course.world)[index];
      for (const action of stage.solution) await page.locator(stage.kind === 'bee' ? `[data-bee-cell="${action}"]` : `.lb-direction-${action}`).click();
      break;
    }
    case 'flow': for (const path of FLOW_STAGES[index].solution) for (const cell of path) await page.locator(`.flow-grid [data-cell="${cell}"]`).click(); break;
    case 'pieces': {
      const stage: PiecesStage = data('../src/pieces/stages.generated.json')[index];
      for (const [i, pose] of stage.solution.entries()) {
        await page.locator('.pieces-piece').nth(i).click();
        if (pose.flip) await page.getByRole('button', { name: '↔ 뒤집기', exact: true }).click();
        for (let turn = 0; turn < pose.turn; turn++) await page.getByRole('button', { name: '↻ 돌리기', exact: true }).click();
        const anchor = shape(stage.pieces[i], pose.turn, pose.flip)[0];
        await page.locator(`.pieces-cell[data-cell="${pose.x + anchor[0]},${pose.y + anchor[1]}"]`).click();
      }
      break;
    }
    case 'balance': for (const group of data('../src/balance/stages.generated.json')[index].solution) await page.locator(`.balance-candy[data-group="${group}"]`).first().click(); break;
    case 'coral': for (const color of data('../src/coral/stages.generated.json')[index].solution) await page.locator(`.coral-color[data-color="${color}"]`).click(); break;
    case 'cloud': {
      let tool = 1;
      for (const step of data('../src/cloud/proofs.generated.json').stages[index].solution) {
        if (step.value !== tool) { await page.getByRole('button', { name: step.value === 1 ? '✚ 수놓기' : '× 빈칸', exact: true }).click(); tool = step.value; }
        await page.locator(`.cloud-cell[data-cell="${step.cell}"]`).click();
      }
      break;
    }
    case 'memory': {
      await page.getByRole('checkbox', { name: '다음 카드를 누를 때 덮기', exact: true }).check();
      await page.locator('.board-first').evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
      const cards = page.locator('.memory-card'), faces: string[] = [];
      for (const card of await cards.all()) {
        if ((await card.getAttribute('aria-label'))!.includes('뒷면')) await card.click();
        faces.push((await card.getAttribute('aria-label'))!.split(', ')[1]);
      }
      while (await page.locator('.memory-card:not(.is-matched)').count()) {
        const states = await cards.evaluateAll(nodes => nodes.map(el => ({ up: el.classList.contains('is-up'), matched: el.classList.contains('is-matched') })));
        const up = states.findIndex(s => s.up && !s.matched);
        const a = up < 0 ? states.findIndex(s => !s.matched) : up;
        const b = faces.findIndex((face, i) => i !== a && face === faces[a]);
        if (up < 0) await cards.nth(a).click();
        await cards.nth(b).click();
      }
      break;
    }
  }
  const result = page.getByRole('region', { name: '스테이지 완료', exact: true });
  await expect(result).toBeVisible({ timeout: 60_000 });
  for (const button of await result.getByRole('button').all()) {
    await inViewport(button, page);
    await button.click({ trial: true });
  }
  if (index === 0) {
    await result.getByRole('button', { name: '다음 스테이지 →', exact: true }).click();
    await inViewport(page.locator(course.board), page);
    await inViewport(page.locator('.board-first-status'), page);
  }
}

async function checkPlay(page: Page, course: Course) {
  await noHorizontalScroll(page);
  await inViewport(page.locator(course.board), page);
  await inViewport(page.locator('.board-first-status'), page);
  // Inspect every scroll container between the real drawing surface and the play
  // viewport. Checking only an outer wrapper missed the cropped grids previously.
  expect(await page.locator(course.board).evaluate(el => {
    const bad: string[] = [];
    for (let node: Element | null = el; node && !node.classList.contains('board-first'); node = node.parentElement) {
      if (node.clientHeight && (node.scrollHeight > node.clientHeight + 1 || node.scrollWidth > node.clientWidth + 1)) bad.push(node.getAttribute('class') ?? node.tagName);
    }
    return bad;
  })).toEqual([]);
  if (course.tools) {
    for (const tools of await page.locator(course.tools).all()) {
      await inViewport(tools, page);
      for (const button of await tools.locator('button').all()) {
        await inViewport(button, page);
        const box = (await button.boundingBox())!;
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
        if (await button.isEnabled()) await button.click({ trial: true });
      }
    }
  }
  // Every cell, including the last row, must be visible without scrolling a board.
  const cells = course.world === 'twins' ? '.lb-forest-cell' : course.world === 'bee' ? '.lb-bee-cell' : course.world === 'flow' ? '.flow-grid button' : course.world === 'memory' ? '.memory-card' : course.world === 'pieces' ? '.pieces-cell' : course.world === 'cloud' ? '.cloud-cell' : '';
  if (cells) for (const cell of await page.locator(cells).all()) await inViewport(cell, page);
  expect(await page.locator('header').first().evaluate(el => el.getBoundingClientRect().bottom)).toBeLessThanOrEqual(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await inViewport(page.locator('header').first(), page);
  const back = page.locator('header').first().getByRole('button').first();
  await back.click({ trial: true });
  await page.locator('.board-first').evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await inViewport(page.locator(course.board), page);
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
      if (viewport.width === 360) await page.screenshot({ path: `${shots}/title-${viewport.height}.png` });
      await page.getByRole('button', { name: '시작하기', exact: true }).click();
      await inViewport(page.locator('.route-card'), page);
      await inViewport(page.getByRole('button', { name: '놀러 가기', exact: true }), page);
      await noHorizontalScroll(page);
      if (viewport.width === 360) await page.screenshot({ path: `${shots}/route-map-${viewport.height}.png` });
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
          await page.screenshot({ path: `${shots}/${course.world}-${viewport.height}.png` });
        }
        await finish(page, course, 0);
        await open(page, course, course.stages.length - 1);
        await checkPlay(page, course);
        await finish(page, course, course.stages.length - 1);
      });
    }

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
      await result.getByRole('button', { name: '다음 스테이지 →', exact: true }).tap();
      await inViewport(page.locator('svg.board'), page);
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

    test('every piece and transform fits, and secondary hint actions remain reachable', async ({ page }) => {
      const course = courses.find(c => c.world === 'pieces')!;
      await open(page, course, course.stages.length - 1);
      for (const button of await page.locator('.pieces-tray button, .pieces-transform button').all()) {
        await inViewport(button, page);
        if (await button.isEnabled()) await button.click({ trial: true });
      }
      await page.getByRole('button', { name: '한 조각 힌트', exact: true }).tap();
      await inViewport(page.locator('.pieces-hint-apply'), page);
      await page.locator('.pieces-hint-apply').tap();
      await expect(page.locator('.pieces-hint-apply')).toHaveCount(0);
      await page.locator('.pieces-tools').scrollIntoViewIfNeeded();
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

for (const theme of ['light', 'dark'] as const) {
  test(`360×330 ${theme}: title, route, photographed twins and play screens`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 330 });
    await page.emulateMedia({ colorScheme: theme });
    await page.goto('/');
    await page.screenshot({ path: `${shots}/title-${theme}.png` });
    await page.getByRole('button', { name: '시작하기', exact: true }).click();
    await page.screenshot({ path: `${shots}/route-map-${theme}.png` });
    for (const course of courses.filter(c => photographed.has(c.world))) {
      await open(page, course, course.world === 'twins' ? 3 : 0);
      await checkPlay(page, course);
      await page.screenshot({ path: `${shots}/${course.world}${course.world === 'twins' ? '-1-4' : '-1-1'}-${theme}.png` });
    }
  });
}

test('restarting from secondary tools returns to the board; reduced motion never animates entry', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 300 });
  for (const world of ['bee', 'twins', 'flow', 'memory', 'pieces', 'cloud', 'balance', 'coral']) {
    const course = courses.find(c => c.world === world)!;
    await open(page, course);
    const reset = page.getByRole('button', { name: /처음부터|새로 섞어 시작/ }).last();
    await reset.click();
    await inViewport(page.locator(course.board), page);
    await inViewport(page.locator('.board-first-status'), page);
  }
});

test('reading menus survives state changes, resize and fold/unfold without scroll jumps', async ({ page }) => {
  const settle = () => page.evaluate(() => new Promise<void>(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
  for (const world of ['train', 'cloud', 'balance', 'twins']) {
    await page.setViewportSize({ width: 360, height: 330 });
    await open(page, courses.find(c => c.world === world)!);
    await inViewport(page.locator('.board-first-status'), page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.getByRole('button', { name: /소리 켜기|소리 끄기/ }).click();
    await settle();
    expect(await page.evaluate(() => scrollY)).toBe(0);
    for (const viewport of [{ width: 360, height: 300 }, { width: 390, height: 844 }, { width: 360, height: 330 }]) {
      await page.setViewportSize(viewport);
      await settle();
      expect(await page.evaluate(() => scrollY)).toBe(0);
      await inViewport(page.locator('header').first(), page);
    }
  }
});

test('cloud clues and balance pans remain legible at 360×330', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 330 });
  const cloud = courses.find(c => c.world === 'cloud')!;
  // The first pattern really is a single stitch, not a missing grid.
  await open(page, cloud);
  await checkPlay(page, cloud);
  await expect(page.locator('.cloud-cell')).toHaveCount(1);
  await expect(page.locator('.cloud-clue')).toHaveText(['1', '1']);
  await page.screenshot({ path: `${shots}/fixed-cloud-330.png` });
  await open(page, cloud, cloud.stages.length - 1);
  const pattern = data('../src/cloud/patterns.json').at(-1);
  await expect(page.locator('.cloud-cell')).toHaveCount(pattern.rows * pattern.cols);
  await expect(page.locator('.cloud-clue')).toHaveCount(pattern.rows + pattern.cols);
  await checkPlay(page, cloud);
  await page.screenshot({ path: `${shots}/fixed-cloud-dense-330.png` });

  const balance = courses.find(c => c.world === 'balance')!;
  for (const index of [0, balance.stages.length - 1]) {
    await open(page, balance, index);
    await checkPlay(page, balance);
    for (const pan of await page.locator('.balance-pan').all()) {
      const panBox = (await pan.boundingBox())!;
      for (const candy of await pan.locator('.balance-candy, .balance-fixed').all()) {
        const box = (await candy.boundingBox())!;
        expect(box.y + box.height).toBeLessThan(panBox.y + panBox.height - 5);
        expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(31);
      }
    }
    await page.screenshot({ path: `${shots}/fixed-balance${index ? '-dense' : ''}-330.png` });
  }
});

test('cover handles allow native touch scrolling to menus and secondary tools', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 330 });
  const cdp = await page.context().newCDPSession(page);
  const swipe = async (y: number, distance: number) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 180, y }] });
    for (let step = 1; step <= 8; step++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 180, y: y + distance * step / 8 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  for (const world of ['train', 'twins', 'pieces', 'cloud']) {
    const course = courses.find(c => c.world === world)!;
    await open(page, course);
    const menu = (await page.locator('.board-first-handle').first().boundingBox())!;
    await swipe(menu.y + menu.height / 2, 240);
    await inViewport(page.locator('header').first(), page);
    await page.locator('.board-first').evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
    const more = (await page.locator('.board-first-more').boundingBox())!;
    const before = await page.evaluate(() => scrollY);
    await swipe(more.y + more.height / 2, -230);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before + 40);
  }
});

test('bonus resources remain visible beside the move count', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 300 });
  const bonuses = [
    { world: 'machine', index: MACHINE_STAGES.findIndex(s => s.battery !== undefined), label: '배터리' },
    { world: 'depot', index: DEPOT_STAGES.findIndex(s => s.limit !== undefined), label: '남은 이동' },
    { world: 'space', index: SPACE_STAGES.findIndex(s => s.limit !== undefined), label: '산소' },
    { world: 'clock', index: CLOCK_STAGES.findIndex(s => s.limit !== undefined), label: '남은' },
  ];
  for (const bonus of bonuses) {
    expect(bonus.index).toBeGreaterThanOrEqual(0);
    const course = courses.find(c => c.world === bonus.world)!;
    await open(page, course, bonus.index);
    await inViewport(page.locator(course.board), page);
    await inViewport(page.locator('.board-first-status'), page);
    await expect(page.locator('.board-first-status')).toContainText(bonus.label);
  }
});
