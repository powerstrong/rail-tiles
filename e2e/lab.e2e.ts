import { test as base, expect, type Locator, type Page } from '@playwright/test';
import { act, KINDS, type Stage, type State } from '../src/lab/model';
import { readFileSync } from 'node:fs';
const stages: Stage[] = JSON.parse(readFileSync(new URL('../src/lab/stages.generated.json', import.meta.url), 'utf8'));
const stagesFor = (kind: Stage['kind']) => stages.filter(s => s.kind === kind);
import { explore, forward, reachability } from '../src/lab/reachability';
import { PROGRESS_KEY } from '../src/storage';

const directions = ['위로 움직이기', '오른쪽으로 움직이기', '아래로 움직이기', '왼쪽으로 움직이기'];
const test = base.extend<{ runtimeErrors: void }>({
  runtimeErrors: [async ({ context }, use) => {
    const errors: string[] = [];
    context.on('page', page => {
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    });
    await use();
    expect(errors).toEqual([]);
  }, { auto: true }],
});
async function open(page: Page, kind: Stage['kind'], number = 1) {
  const stages = stagesFor(kind), stage = stages[number - 1];
  await page.goto('/');
  await page.evaluate(({ key, kind, stage, earlier }) => localStorage.setItem(key, JSON.stringify({
    schemaVersion: 2, stars: { 'last-run': 3, ...Object.fromEntries(earlier.map(id => [id, 1])) },
    stories: [kind], last: { world: kind, stage },
  })), { key: PROGRESS_KEY, kind, stage: stage.id, earlier: stages.slice(0, number - 1).map(s => s.id) });
  await page.reload();
  await page.getByRole('button', { name: /이어하기/ }).click();
  await expect(page.locator('.lab-play h1')).toHaveText(stage.title);
  return stage;
}
async function move(page: Page, stage: Stage, state: State, action: number, touch = false) {
  const next = act(stage, state, action);
  expect(next).not.toBeNull();
  const activate = (control: Locator) => touch ? control.tap() : control.click();
  if (stage.kind === 'twins') await activate(page.getByRole('button', { name: directions[action], exact: true }));
  else await activate(page.locator('.lb-bee-cell').nth(action));
  return next!;
}
async function hint(page: Page) {
  await page.getByRole('button', { name: '한 걸음 힌트', exact: true }).click();
  await expect(page.locator('.lab-tools button').last()).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('.lb-hint').first()).toBeVisible();
}
for (const kind of KINDS) test(`${kind}: all 30 official stages finish through controls and save stars`, async ({ page }) => {
  await open(page, kind);
  for (const stage of stagesFor(kind)) {
    await expect(page.locator('.lab-play h1')).toHaveText(stage.title);
    if ([1, 15, 30].includes(stage.number)) {
      await hint(page);
      await page.getByRole('button', { name: '처음부터', exact: true }).click();
      await expect(page.locator('.lb-hint')).toHaveCount(0);
    }
    let state = stage.start;
    for (const action of stage.solution) state = await move(page, stage, state, action);
    await expect(page.getByRole('region', { name: '스테이지 완료', exact: true })).toBeVisible();
    await expect(page.locator('.lab-clear h2')).toBeFocused();
    await expect.poll(() => page.evaluate(([key, id]) => JSON.parse(localStorage.getItem(key) ?? '{}').stars?.[id], [PROGRESS_KEY, stage.id])).toBe(3);
    if (stage.number < 30) await page.getByRole('button', { name: '다음 스테이지 →', exact: true }).click();
  }
  await expect(page.getByRole('button', { name: '다음 스테이지 →', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '스테이지 고르기', exact: true }).last().click();
  await page.getByRole('button', { name: '건너뛰기', exact: true }).click();
  await expect(page.locator('.stage-card')).toHaveCount(30);
});

test('new games are available from the initial route map and lab entrances are gone', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.lab-entry')).toHaveCount(0);
  await page.getByRole('button', { name: '시작하기', exact: true }).click();
  await expect(page.locator('.route-map')).toBeVisible();
  await expect(page.locator('.lab-entry')).toHaveCount(0);
  for (const title of ['거울 토끼의 숲', '꿀벌의 한붓 꽃길']) await expect(page.getByRole('button', { name: new RegExp(`^${title}, 별 0/90`) })).toBeVisible();
});

test('rabbits show both directions, waiting, and homes remain movable', async ({ page }) => {
  let stage = await open(page, 'twins', 2);
  await expect(page.locator('.lb-rabbit-preview').nth(0)).toContainText('→');
  await expect(page.locator('.lb-rabbit-preview').nth(1)).toContainText('←');
  await expect(page.locator('.lb-home-rule')).toContainText('다시 움직여요');
  stage = await open(page, 'twins', 3);
  let state = stage.start;
  for (const action of stage.solution) {
    const next = act(stage, state, action)!;
    await move(page, stage, state, action);
    if (next.some((cell, i) => cell === state[i])) await expect(page.locator('.lb-rabbit-reaction')).toContainText('벽에 막혀 쉬었어요');
    state = next;
  }
});

test('bee dead ends stay interactive and recover to the last finishable prefix', async ({ page }) => {
  const stage = stagesFor('bee')[9], graph = explore(stage);
  let prefix = stage.start, dead: State | undefined;
  for (const action of stage.solution) {
    // Query actual alternative choices instead of relying on a complete graph.
    reachability(graph, prefix);
    dead = Array.from({ length: stage.cols * stage.rows }, (_, a) => forward(stage, prefix, a))
      .find((v): v is State => v !== null && reachability(graph, v) === 'impossible');
    if (dead) break;
    prefix = forward(stage, prefix, action)!;
  }
  expect(dead).toBeDefined();
  await open(page, 'bee', stage.number);
  let state = stage.start;
  for (const action of dead!.slice(1)) state = await move(page, stage, state, action);
  await expect(page.locator('.lab-stuck')).toBeVisible();
  await expect(page.locator('.lb-bee-retrace')).toBeEnabled();
  await page.getByRole('button', { name: '마지막으로 풀 수 있던 지점으로 되돌리기' }).click();
  await expect(page.locator('.lab-stuck')).toHaveCount(0);
  await hint(page);
});

test('bee taps and drags retrace exactly one adjacent cell without skipping', async ({ page }) => {
  const stage = await open(page, 'bee');
  await expect(page.locator('.lb-hive-lock')).toContainText('남은 꽃을 먼저');
  let state = await move(page, stage, stage.start, stage.solution[0]);
  state = await move(page, stage, state, stage.solution[1]);
  state = await move(page, stage, state, state[state.length - 2]);
  await expect(page.locator('.lb-bee-visited')).toHaveCount(2);
  const point = async (cell: number) => {
    const box = await page.locator('.lb-bee-cell').nth(cell).boundingBox();
    return { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 };
  };
  await page.mouse.move(...Object.values(await point(state.at(-1)!)) as [number, number]);
  await page.mouse.down();
  const jump = await point(stage.solution[7]); await page.mouse.move(jump.x, jump.y);
  await expect(page.locator('.lb-bee-visited')).toHaveCount(2);
  const next = await point(stage.solution[1]); await page.mouse.move(next.x, next.y);
  await expect(page.locator('.lb-bee-visited')).toHaveCount(3);
  const previous = await point(stage.solution[0]); await page.mouse.move(previous.x, previous.y);
  await expect(page.locator('.lb-bee-visited')).toHaveCount(2);
  await page.mouse.up();
  await page.keyboard.press('ControlOrMeta+z');
  await expect(page.locator('.lb-bee-visited')).toHaveCount(1);
});

for (const width of [320, 390, 844]) test(`${width}px: boards fit without page overflow`, async ({ page }) => {
  await page.setViewportSize({ width, height: width === 844 ? 390 : 700 });
  for (const kind of KINDS) {
    await open(page, kind, 30);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    if (kind === 'bee') {
      const lock = await page.locator('.lb-hive-lock').boundingBox();
      const hive = await page.locator('.lb-bee-cell').nth(stagesFor('bee')[29].goal[0]).boundingBox();
      expect(lock!.x).toBeGreaterThanOrEqual(hive!.x);
      expect(lock!.x + lock!.width).toBeLessThanOrEqual(hive!.x + hive!.width);
      expect(lock!.height).toBeLessThan(hive!.height / 2);
    }
    if (kind === 'bee' && width === 390) {
      const cell = await page.locator('.lb-bee-cell').first().boundingBox();
      expect(cell!.width).toBeGreaterThanOrEqual(44);
      expect(cell!.height).toBeGreaterThanOrEqual(44);
    }
    if (kind === 'twins') {
      await page.getByRole('button', { name: '숲 크게 보기', exact: true }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    }
  }
});

test.describe('mobile touch', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('both games finish first and final stages with taps', async ({ page }) => {
    for (const kind of KINDS) for (const number of [1, 30]) {
      const stage = await open(page, kind, number);
      let state = stage.start;
      for (const action of stage.solution) state = await move(page, stage, state, action, true);
      await expect(page.locator('.lab-clear')).toBeVisible();
    }
  });
});

test('official hints cap stars and legacy stamps migrate without losing existing records', async ({ page }) => {
  const stage = await open(page, 'twins');
  await hint(page);
  await move(page, stage, stage.start, stage.solution[0]);
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).stars['lab-v1-twins-1'], PROGRESS_KEY)).toBe(2);
  await page.evaluate(() => localStorage.setItem('rail-tiles-lab-v1', JSON.stringify({ completed: { 'lab-v1-bee-30': true } })));
  await page.reload();
  await page.getByRole('button', { name: /다음 퍼즐/ }).click();
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).stars['lab-v1-bee-30'], PROGRESS_KEY)).toBe(1);
});

test('offline reload can play both worlds and run the bundled hint worker', async ({ page, context }) => {
  await open(page, 'bee');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('button', { name: /이어하기/ }).click();
  await hint(page);
  await open(page, 'twins');
  await hint(page);
  await context.setOffline(false);
});

test('penguin warns immediately after the first bad slide and remains movable', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(key => localStorage.setItem(key, JSON.stringify({ schemaVersion: 2,
    stars: { 'last-run': 3 }, stories: ['ice'], last: { world: 'ice', stage: 'ice-first-slide' },
  })), PROGRESS_KEY);
  await page.reload(); await page.getByRole('button', { name: /이어하기/ }).click();
  const intro = page.getByRole('button', { name: '알았어요!', exact: true });
  if (await intro.count()) await intro.click();
  await page.getByRole('button', { name: '위로 밀기', exact: true }).click();
  await expect(page.locator('.ice-stuck')).toBeVisible();
  await expect(page.getByRole('button', { name: '왼쪽으로 밀기', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '마지막으로 풀 수 있던 지점으로 되돌리기' }).click();
  await expect(page.locator('.ice-stuck')).toHaveCount(0);
  await page.getByRole('button', { name: '왼쪽으로 밀기', exact: true }).click();
  await expect(page.getByRole('button', { name: '아래로 밀기', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '아래로 밀기', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '스테이지 클리어', exact: true })).toBeVisible();
});

test('rail retry can cancel into editing, preserve rails, and verify quickly', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(key => localStorage.setItem(key, JSON.stringify({ schemaVersion: 2, stars: {},
    stories: ['train'], last: { world: 'train', stage: 'first-line' },
  })), PROGRESS_KEY);
  await page.reload(); await page.getByRole('button', { name: /이어하기/ }).click();
  const cell = async (x: number, y: number) => {
    const point = await page.locator('svg.board').evaluate((svg, [x, y]) => {
      const point = (svg as SVGSVGElement).createSVGPoint(); point.x = (x + 0.5) * 100; point.y = (y + 0.5) * 100;
      const screen = point.matrixTransform((svg as SVGSVGElement).getScreenCTM()!);
      return { x: screen.x, y: screen.y };
    }, [x, y]);
    await page.mouse.click(point.x, point.y);
  };
  for (const x of [1, 2, 3]) await cell(x, 2);
  await expect(page.locator('.rail-spin')).toHaveCount(3);
  await expect(page.getByRole('button', { name: '빠르게 확인', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '출발', exact: true }).click();
  await page.getByRole('button', { name: '운행 취소 후 바로 수정', exact: true }).click();
  await expect(page.locator('.rail-spin')).toHaveCount(3);
  await expect(page.getByRole('button', { name: '되돌리기', exact: true })).toBeEnabled();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).stars['first-line'], PROGRESS_KEY)).toBeUndefined();
  await page.getByRole('button', { name: '빠르게 확인', exact: true }).click();
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).stars['first-line'], PROGRESS_KEY), { timeout: 2000 }).toBe(3);
});

test('device routes live inside Wildflower and preserved boss records still unlock depot and space', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(key => localStorage.setItem(key, JSON.stringify({ schemaVersion: 2,
    stars: { 'last-run': 3, 't2-boss-1': 2, 't2-busy-crossing': 3 }, stories: ['train', 'train2'],
    last: { world: 'train', stage: 'first-line' },
  })), PROGRESS_KEY);
  await page.reload(); await page.getByRole('button', { name: /이어하기/ }).click();
  await page.getByRole('button', { name: '스테이지 목록', exact: true }).click();
  await page.getByRole('button', { name: '장치 노선 20판', exact: true }).click();
  await expect(page.locator('.stage-card')).toHaveCount(20);
  await expect(page.locator('.select h1')).toHaveText('들꽃 장치 노선');
  await expect(page.locator('.stage-card').nth(3).getByLabel('별 2개')).toBeVisible();
  await page.getByRole('button', { name: '여행지 목록으로', exact: true }).click();
  await expect(page.locator('.route-station')).toHaveCount(9);
  for (const title of ['기차 차고지', '우주 정거장']) await expect(page.getByRole('button', { name: new RegExp(`^${title}, 별`) })).toBeVisible();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).stars['t2-busy-crossing'], PROGRESS_KEY)).toBe(3);
});

test('official world result buttons wait for the card before accepting keyboard focus', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(key => localStorage.setItem(key, JSON.stringify({
    schemaVersion: 2, stars: { 'last-run': 3 }, stories: ['ice'],
    last: { world: 'ice', stage: 'ice-first-slide' },
  })), PROGRESS_KEY);
  await page.reload();
  await page.getByRole('button', { name: /이어하기/ }).click();
  const intro = page.getByRole('button', { name: '알았어요!', exact: true });
  if (await intro.count()) await intro.click();
  await page.getByRole('button', { name: '왼쪽으로 밀기', exact: true }).click();
  await page.getByRole('button', { name: '아래로 밀기', exact: true }).click();
  const overlay = page.getByRole('dialog', { name: '스테이지 클리어', exact: true });
  await expect(overlay).toHaveClass('overlay arming');
  const next = overlay.locator('.result-actions .primary');
  // Focusing an invisible button used to succeed (including its React autoFocus).
  await next.evaluate(button => button.focus());
  await expect(next).not.toBeFocused();
  await page.keyboard.press('Enter');
  await expect(overlay).toBeVisible();
  await expect(overlay).toHaveClass('overlay');
  await expect(next).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(overlay).toHaveCount(0);
});


test.describe('puzzle win celebration', () => {
  test.use({ reducedMotion: 'no-preference' });
  test('lets the finished board celebrate before the result card takes focus', async ({ page }) => {
    const stage = await open(page, 'twins');
    await move(page, stage, stage.start, stage.solution[0]);
    await expect(page.locator('.lab-celebrate')).toBeVisible();
    await expect(page.locator('.lab-clear')).toHaveCount(0);
    await expect(page.locator('.lab-clear')).toBeVisible();
    await expect(page.locator('.lab-clear h2')).toBeFocused();
    await page.keyboard.press('ControlOrMeta+z');
    await expect(page.locator('.lab-clear')).toHaveCount(0);
    await expect(page.getByRole('button', { name: '위로 움직이기', exact: true })).toBeEnabled();
  });
});
