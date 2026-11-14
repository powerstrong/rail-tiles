import { test as base, expect, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { act, KINDS, type Stage, type State } from '../src/lab/model';
import { LAB_PROGRESS_KEY } from '../src/lab/storage';
import { PROGRESS_KEY } from '../src/storage';

// Every move goes through the real controls. Solutions are fixtures, never injected into React.
const allStages: Stage[] = JSON.parse(readFileSync(new URL('../src/lab/stages.generated.json', import.meta.url), 'utf8'));
const directions = ['위로 움직이기', '오른쪽으로 움직이기', '아래로 움직이기', '왼쪽으로 움직이기'];
const arrows = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'];
const officialSave = JSON.stringify({ stars: {}, stories: ['train-arrival'], lookSeen: 4 });
const test = base.extend<{ runtimeErrors: void }>({
  runtimeErrors: [async ({ context }, use) => {
    const errors: string[] = [];
    context.on('page', page => {
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    });
    await use();
    expect(errors, 'browser runtime errors').toEqual([]);
  }, { auto: true }],
});

async function enterLab(page: Page) {
  await page.goto('/');
  await page.locator('.lab-entry').click();
  await expect(page.getByRole('heading', { name: '상상 실험실', exact: true })).toBeFocused();
  await expect(page.locator('.lab-concept')).toHaveCount(10);
}

async function selectKind(page: Page, kind: Stage['kind']) {
  await page.locator(`.lab-concept.lab-${kind}`).click();
  await expect(page.locator('.lab-stage')).toHaveCount(30);
  await expect(page.locator('.lab-stage:disabled')).toHaveCount(0);
}

async function openStage(page: Page, number: number) {
  await page.locator('.lab-stage').nth(number - 1).click();
  await expect(page.locator('.lab-play h1')).toBeFocused();
}

async function move(page: Page, stage: Stage, state: State, action: number, touch = false): Promise<State> {
  const next = act(stage, state, action);
  expect(next, `${stage.id}: fixture action ${action} is legal`).not.toBeNull();
  const cell = Math.floor(action / 3), value = action % 3;
  const activate = (control: Locator) => touch ? control.tap() : control.click();
  switch (stage.kind) {
    case 'acorn': case 'twins':
      await activate(page.getByRole('button', { name: directions[action], exact: true })); break;
    case 'lights': await activate(page.locator('.lb-lantern-cell').nth(action)); break;
    case 'coral':
      await activate(page.locator('.lb-color-button').nth([...new Set(stage.start)].sort((a, b) => a - b).indexOf(action))); break;
    case 'cloud': case 'balance':
      for (let n = 0; n < (value - state[cell] + 3) % 3; n++) {
        await activate(page.locator(stage.kind === 'cloud' ? '.lb-stitch-cell' : '.lb-candy-card').nth(cell));
      }
      break;
    case 'moon':
      await activate(page.locator('.lb-moon-cell').nth(Math.floor(action / state.length)));
      await activate(page.locator('.lb-moon-cell').nth(action % state.length)); break;
    case 'mosaic': await activate(page.locator('.lb-mosaic-cell').nth(action)); break;
    case 'bee': await activate(page.locator('.lb-bee-cell').nth(action)); break;
    case 'bridges':
      for (let n = 0; n < (value - state[cell] + 3) % 3; n++) {
        const [a, b] = stage.edges![cell];
        await activate(page.locator('.lb-island').nth(a));
        await activate(page.locator('.lb-island').nth(b));
      }
      break;
  }
  return next!;
}

async function hint(page: Page) {
  await page.getByRole('button', { name: '한 걸음 힌트', exact: true }).click();
  await expect(page.locator('.lab-tools button').last()).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('.lab-play-canvas .lb-hint').first()).toBeVisible();
  await expect(page.locator('.lab-clear')).toHaveCount(0);
}

for (const kind of KINDS) test(`${kind}: all 30 stages finish through browser controls`, async ({ page }, info) => {
  await page.goto('/');
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [PROGRESS_KEY, officialSave]);
  await enterLab(page);
  await selectKind(page, kind);
  // The final stage is immediately available, before earning any stamps.
  await openStage(page, 30);
  await expect(page.locator('.lab-play h1')).toHaveText(allStages.find(s => s.kind === kind && s.number === 30)!.title);
  await page.locator('.lab-top .lab-back').click();
  await openStage(page, 1);
  for (const stage of allStages.filter(s => s.kind === kind)) {
    await expect(page.locator('.lab-play h1')).toHaveText(stage.title);
    if ([1, 15, 30].includes(stage.number)) {
      await hint(page);
      await page.getByRole('button', { name: '처음부터', exact: true }).click();
      await expect(page.locator('.lb-hint')).toHaveCount(0);
    }
    if (stage.number === 15) {
      await move(page, stage, stage.start, stage.solution[0]);
      await page.getByRole('button', { name: '되돌리기', exact: true }).click();
      await expect(page.getByRole('button', { name: '되돌리기', exact: true })).toBeDisabled();
      await page.getByRole('button', { name: '처음부터', exact: true }).click();
    }
    let state = stage.start;
    for (const action of stage.solution) state = await move(page, stage, state, action);
    await expect(page.getByRole('region', { name: '스테이지 완료', exact: true })).toBeVisible();
    await expect(page.locator('.lab-clear h2')).toBeFocused();
    await expect.poll(() => page.evaluate(([key, id]) => JSON.parse(localStorage.getItem(key) ?? '{}').completed?.[id], [LAB_PROGRESS_KEY, stage.id])).toBe(true);
    expect(await page.evaluate(key => localStorage.getItem(key), PROGRESS_KEY)).toBe(officialSave);
    if (stage.number < 30) await page.getByRole('button', { name: '다음 여행으로 →', exact: true }).click();
  }
  await expect(page.getByRole('button', { name: '다음 판 →', exact: true })).toBeDisabled();
  await page.screenshot({ path: info.outputPath(`${kind}-completed.png`), fullPage: true });
  await page.getByRole('button', { name: '다른 세계 만나기 →', exact: true }).click();
  await expect(page.locator(`.lab-concept.lab-${kind}`)).toHaveAttribute('aria-label', /완료 30 \/ 30판/);
});

test('title and route map entries return to their own screen', async ({ page }) => {
  await enterLab(page);
  await page.getByRole('button', { name: '돌아가기', exact: true }).click();
  await expect(page.locator('.title')).toBeVisible();
  await page.getByRole('button', { name: '시작하기', exact: true }).click();
  await page.getByRole('button', { name: /새로운 세계 실험실/ }).click();
  await expect(page.locator('.lab-home')).toBeVisible();
  await page.getByRole('button', { name: '돌아가기', exact: true }).click();
  await expect(page.locator('.route-map')).toBeVisible();
});

for (const viewport of [{ width: 320, height: 568 }, { width: 360, height: 640 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
  test(`${viewport.width}x${viewport.height}: all boards fit and enlargement scrolls locally`, async ({ page }, info) => {
    await page.setViewportSize(viewport);
    await enterLab(page);
    const fits = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await fits();
    for (const kind of KINDS) {
      await selectKind(page, kind);
      await fits();
      await openStage(page, 30);
      await fits();
      if (kind === 'cloud' || kind === 'twins') {
        await page.getByRole('button', { name: kind === 'cloud' ? '자수 칸 크게 보기' : '숲 크게 보기', exact: true }).click();
        await fits();
        if (kind === 'cloud' && viewport.width === 320) {
          const scroll = page.getByRole('region', { name: '확대한 자수판. 좌우로 밀어 볼 수 있어요.', exact: true });
          expect(await scroll.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true);
          await scroll.evaluate(el => { el.scrollLeft = el.scrollWidth; });
          expect(await scroll.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
        }
      }
      if (viewport.width === 320) await page.screenshot({ path: info.outputPath(`${kind}-320px.png`), fullPage: true });
      await page.locator('.lab-top .lab-back').click();
      await page.locator('.lab-top .lab-back').click();
    }
  });
}

test('keyboard movement, undo, rules and stage navigation', async ({ page }) => {
  await enterLab(page); await selectKind(page, 'acorn'); await openStage(page, 15);
  const stage = allStages.find(s => s.kind === 'acorn' && s.number === 15)!;
  const undo = page.getByRole('button', { name: '되돌리기', exact: true });
  await page.keyboard.press(arrows[stage.solution[0]]);
  await expect(undo).toBeEnabled();
  await page.keyboard.press('ControlOrMeta+z');
  await expect(undo).toBeDisabled();
  await page.getByRole('button', { name: '처음부터', exact: true }).focus();
  await page.keyboard.press(arrows[stage.solution[0]]);
  await expect(undo).toBeEnabled();
  const rules = page.getByRole('button', { name: /규칙 접기/ });
  await rules.focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('region', { name: '게임 규칙', exact: true })).toHaveCount(0);
  await page.keyboard.press('Space');
  await expect(page.getByRole('region', { name: '게임 규칙', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '← 이전 판', exact: true }).click();
  await expect(page.locator('.lab-play h1')).toHaveText(allStages.find(s => s.kind === 'acorn' && s.number === 14)!.title);
});

test('a blocked move explains the rule and completion can be undone and retried', async ({ page }) => {
  await enterLab(page); await selectKind(page, 'acorn'); await openStage(page, 1);
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('.lab-feedback-line')).toContainText('앞이 막혀 있어요');
  await expect(page.getByRole('button', { name: '되돌리기', exact: true })).toBeDisabled();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.lab-clear')).toBeVisible();
  await page.getByRole('button', { name: '되돌리기', exact: true }).click();
  await expect(page.locator('.lab-clear')).toHaveCount(0);
  await hint(page);
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.lab-clear')).toBeVisible();
  await page.getByRole('button', { name: '처음부터', exact: true }).click();
  await expect(page.locator('.lab-clear')).toHaveCount(0);
  await expect(page.locator('.lab-done-tag')).toBeVisible();
});

test.describe('mobile touch', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('first and final stages of every game finish with touch input', async ({ page }) => {
    await enterLab(page);
    for (const kind of KINDS) {
      await selectKind(page, kind);
      for (const number of [1, 30]) {
        await openStage(page, number);
        const stage = allStages.find(s => s.kind === kind && s.number === number)!;
        let state = stage.start;
        for (const action of stage.solution) state = await move(page, stage, state, action, true);
        await expect(page.locator('.lab-clear')).toBeVisible();
        await page.locator('.lab-top .lab-back').click();
      }
      await page.locator('.lab-top .lab-back').click();
    }
  });
});

test('stamps and ratings survive reloads and synchronize between tabs', async ({ page, context }) => {
  await enterLab(page); await selectKind(page, 'acorn'); await openStage(page, 1);
  await page.getByRole('button', { name: directions[1], exact: true }).click();
  await expect(page.locator('.lab-clear')).toBeVisible();
  await page.locator('.lab-top .lab-back').click();
  await page.getByRole('button', { name: '또 하고 싶어요', exact: true }).click();
  const second = await context.newPage();
  await enterLab(second); await selectKind(second, 'acorn');
  await expect(second.getByRole('button', { name: '또 하고 싶어요', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(second.locator('.lab-stage').first()).toHaveAttribute('aria-label', /완료/);
  await second.getByRole('button', { name: '다듬으면 좋아요', exact: true }).click();
  await expect(page.getByRole('button', { name: '다듬으면 좋아요', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await enterLab(page); await selectKind(page, 'acorn');
  await expect(page.getByRole('button', { name: '다듬으면 좋아요', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.lab-stage').first()).toHaveAttribute('aria-label', /완료/);
});

test('storage failures show a notice without interrupting play', async ({ page }) => {
  await page.addInitScript(key => {
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException('Full storage', 'QuotaExceededError');
      set.call(this, name, value);
    };
  }, LAB_PROGRESS_KEY);
  await enterLab(page); await selectKind(page, 'acorn'); await openStage(page, 1);
  await page.getByRole('button', { name: directions[1], exact: true }).click();
  await expect(page.locator('.lab-clear')).toBeVisible();
  await expect(page.locator('.lab-storage-notice')).toBeVisible();
  await page.getByRole('button', { name: '다음 여행으로 →', exact: true }).click();
  await expect(page.locator('.lab-play h1')).toHaveText('새싹 옆에서');
});

test('a fresh offline reload can lazy-load every board and run hint Workers', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise<void>(resolve => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }));
  });
  await context.setOffline(true);
  await enterLab(page);
  for (const kind of KINDS) {
    await selectKind(page, kind); await openStage(page, 30);
    await hint(page);
    await page.locator('.lab-top .lab-back').click();
    await page.locator('.lab-top .lab-back').click();
  }
});
