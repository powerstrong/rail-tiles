import { expect, test, type Page } from '@playwright/test';
import { mkdir, readFile, readdir } from 'node:fs/promises';
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

const data = (path: string): { id: string; kind?: string }[] => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const lab = [...data('../src/lab/stages.generated.json'), ...data('../src/lab/bee50/stages.generated.json')];
const courses = [
  { world: 'train', stages: STAGES, board: '.board-wrap' },
  { world: 'train2', stages: S2_STAGES, board: '.board-wrap' },
  { world: 'ice', stages: ICE_STAGES, board: '.board-wrap' },
  { world: 'depot', stages: DEPOT_STAGES, board: '.board-wrap' },
  { world: 'space', stages: SPACE_STAGES, board: '.board-wrap' },
  { world: 'machine', stages: MACHINE_STAGES, board: '.board-wrap' },
  { world: 'clock', stages: CLOCK_STAGES, board: '.board-wrap' },
  { world: 'volcano', stages: VOLCANO_STAGES, board: '.board-wrap' },
  { world: 'memory', stages: MEMORY_STAGES, board: '.memory-board' },
  { world: 'bee', stages: lab.filter(s => s.kind === 'bee'), board: '.lb-bee-frame' },
  { world: 'twins', stages: lab.filter(s => s.kind === 'twins'), board: '.lb-forest-pair' },
  ...['flow', 'pieces', 'coral', 'balance', 'cloud'].map(world => ({ world,
    stages: data(`../src/${world}/${world === 'cloud' ? 'patterns.json' : 'stages.generated.json'}`),
    board: ({ flow: '.flow-cloth', pieces: '.pieces-canvas', coral: '.coral-ocean', balance: '.balance-scales', cloud: '.cloud-scroll' } as Record<string, string>)[world],
  })),
];
const shots = '/tmp/theme-shots';

async function noOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
}
// Audit actual rendered text, including inherited and inline world colours.
// Puzzle SVG artwork and disabled controls have separate visual semantics.
async function readableText(page: Page) {
  const failures = await page.evaluate(() => {
    const rgb = (value: string) => {
      const components = value.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0];
      return value.startsWith('color(srgb') ? components.map((n, i) => i < 3 ? n * 255 : n) : components;
    };
    const luminance = (color: number[]) => color.slice(0, 3).map(n => n / 255)
      .map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4)
      .reduce((sum, n, i) => sum + n * [.2126, .7152, .0722][i], 0);
    return Array.from(document.querySelectorAll<HTMLElement>('body *')).flatMap(el => {
      if (el instanceof SVGElement || el.closest('button:disabled, [aria-hidden=true]')
        || !Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent?.trim())) return [];
      const box = el.getBoundingClientRect();
      if (!box.width || !box.height) return [];
      for (let p: HTMLElement | null = el; p; p = p.parentElement) {
        const style = getComputedStyle(p);
        if (style.opacity === '0' || style.visibility === 'hidden') return [];
      }
      const foreground = rgb(getComputedStyle(el).color);
      let background = [0, 0, 0], remaining = 1;
      for (let p: HTMLElement | null = el; p; p = p.parentElement) {
        const color = rgb(getComputedStyle(p).backgroundColor), alpha = color[3] ?? 1;
        background = background.map((n, i) => n + color[i] * alpha * remaining);
        remaining *= 1 - alpha;
        if (remaining < .001) break;
      }
      const [bright, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
      const ratio = (bright + .05) / (dark + .05);
      return ratio < 4.5 ? [`${el.className}: ${el.textContent?.trim().slice(0, 50)} (${ratio.toFixed(2)}:1)`] : [];
    });
  });
  expect(failures, 'visible text needs at least 4.5:1 contrast').toEqual([]);
}
async function theme(page: Page, value: 'dark' | 'light') {
  await expect(page.locator('html')).toHaveAttribute('data-theme', value);
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', value === 'dark' ? '#252733' : '#f4e9d6');
  expect(await page.locator('html').evaluate(el => getComputedStyle(el).colorScheme)).toBe(value);
}
async function photograph(page: Page, name: string) {
  await mkdir(shots, { recursive: true });
  await page.screenshot({ path: `${shots}/${name}.png` });
}
async function open(page: Page, course: typeof courses[number], index = 0) {
  await page.goto('/');
  await page.evaluate(({ world, ids, index }) => localStorage.setItem('rail-tiles:progress', JSON.stringify({
    schemaVersion: 2, stars: Object.fromEntries(ids.slice(0, index).map(id => [id, 1])),
    stories: [world], last: { world, stage: ids[index] },
  })), { world: course.world, ids: course.stages.map(s => s.id), index });
  await page.reload();
  await page.getByRole('button', { name: /이어하기|다음 퍼즐/ }).click();
  const intro = page.locator('.intro-overlay');
  if (await intro.count()) {
    await expect(intro).toHaveCSS('opacity', '1');
    await expect(intro.locator('.result-card')).toHaveCSS('opacity', '1');
    await readableText(page);
    await intro.getByRole('button').last().click();
  }
  await expect(page.locator(course.board)).toBeVisible();
}

for (const scheme of ['light', 'dark'] as const) {
  test(`system ${scheme} is applied before React loads`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.route('**/assets/*.js', route => route.abort());
    await page.route('**/assets/*.css', route => route.abort());
    await page.goto('/');
    await theme(page, scheme);
    await expect(page.locator('html')).toHaveCSS('background-color', scheme === 'dark' ? 'rgb(37, 39, 51)' : 'rgb(244, 233, 214)');
    await expect(page.locator('#root')).toBeEmpty();
    expect(await page.evaluate(() => localStorage.getItem('rail-tiles:theme'))).toBeNull();
  });
}

test('system changes until toggled; saved choice persists and synchronizes with another tab', async ({ page, context }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await theme(page, 'light');
  await page.emulateMedia({ colorScheme: 'dark' });
  await theme(page, 'dark');
  const toggle = page.getByRole('button', { name: '밝은 화면으로', exact: true });
  const box = (await toggle.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
  await toggle.click();
  await theme(page, 'light');
  expect(await page.evaluate(() => localStorage.getItem('rail-tiles:theme'))).toBe('light');
  await page.reload();
  await theme(page, 'light');
  const other = await context.newPage();
  await other.goto('/');
  await theme(other, 'light');
  await page.getByRole('button', { name: '어두운 화면으로', exact: true }).click();
  await theme(other, 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await theme(page, 'dark');
  await page.getByRole('button', { name: '시작하기', exact: true }).click();
  await page.getByRole('button', { name: '밝은 화면으로', exact: true }).click();
  await theme(page, 'light');
  await other.close();
});

test('blocked storage and invalid stored values still allow system defaults and toggling', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.addInitScript(() => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = function (key) {
      if (key === 'rail-tiles:theme') throw new Error('storage blocked');
      return original.call(this, key);
    };
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'rail-tiles:theme') throw new Error('storage blocked');
      set.call(this, key, value);
    };
  });
  await page.goto('/');
  await theme(page, 'dark');
  await page.getByRole('button', { name: '밝은 화면으로', exact: true }).click();
  await theme(page, 'light');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.emulateMedia({ colorScheme: 'dark' });
  await theme(page, 'light');
});

test('invalid preference follows system, and removing a choice restores system tracking', async ({ page, context }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('rail-tiles:theme', 'invalid'));
  await page.reload();
  await theme(page, 'dark');
  await page.getByRole('button', { name: '밝은 화면으로', exact: true }).click();
  const other = await context.newPage();
  await other.goto('/');
  await other.evaluate(() => localStorage.removeItem('rail-tiles:theme'));
  await theme(page, 'dark');
  await other.close();
});

for (const viewport of [{ width: 390, height: 844 }, { width: 360, height: 330 }]) {
  test.describe(`night ${viewport.width}×${viewport.height}`, () => {
    test.use({ viewport, colorScheme: 'dark' });
    test('title, map, version and toggle fit without covering controls', async ({ page }) => {
      await page.goto('/');
      const bundleNames = await readdir(new URL('../dist/assets/', import.meta.url));
      const bundle = await readFile(new URL(`../dist/assets/${bundleNames.find(n => /^index-.*\.js$/.test(n))}`, import.meta.url), 'utf8');
      const injected = bundle.match(/v\d{4}\.\d{2}\.\d{2}-(?:[a-f0-9]+|dev)/)![0];
      for (const name of ['title', 'route-map']) {
        await theme(page, 'dark');
        await noOverflow(page);
        await readableText(page);
        await expect(page.locator('.version-label')).toHaveText(injected);
        await expect(page.locator('.version-label')).toBeInViewport();
        expect(await page.locator('.version-label').evaluate(el => getComputedStyle(el).pointerEvents)).toBe('none');
        const label = (await page.locator('.version-label').boundingBox())!;
        const toggle = (await page.locator('.theme-toggle').boundingBox())!;
        expect(toggle.width).toBeGreaterThanOrEqual(44);
        expect(toggle.height).toBeGreaterThanOrEqual(44);
        for (const button of await page.locator('button').all()) {
          const box = await button.boundingBox();
          if (!box) continue;
          expect(box.x >= label.x + label.width || box.x + box.width <= label.x || box.y >= label.y + label.height || box.y + box.height <= label.y).toBe(true);
        }
        await page.locator('.theme-toggle').click({ trial: true });
        await photograph(page, `${name}${viewport.height === 330 ? '-cover' : ''}`);
        if (name === 'title') await page.getByRole('button', { name: '시작하기', exact: true }).click();
      }
    });
    for (const course of courses) {
      test(`${course.world}: first and dense board keep theme and geometry`, async ({ page }) => {
        await open(page, course);
        await theme(page, 'dark');
        await noOverflow(page);
        await readableText(page);
        if (viewport.height > 480) await expect(page.locator('h1')).toBeInViewport();
        else await expect(page.locator('.board-first-status')).toBeInViewport();
        await expect(page.locator('.version-label, .theme-toggle')).toHaveCount(0);
        await photograph(page, `${course.world}${viewport.height === 330 ? '-cover' : ''}`);
        await open(page, course, course.stages.length - 1);
        await noOverflow(page);
        await readableText(page);
        if (viewport.height > 480) await expect(page.locator('h1')).toBeInViewport();
        else await expect(page.locator('.board-first-status')).toBeInViewport();
      });
    }
    test('story, intro and result cards keep readable night surfaces', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: '시작하기', exact: true }).click();
      await page.getByRole('button', { name: '놀러 가기', exact: true }).click();
      await expect(page.locator('.story-bubble')).toBeVisible();
      await expect(page.locator('.story-bubble')).toHaveCSS('opacity', '1');
      await readableText(page);
      await photograph(page, `story${viewport.height === 330 ? '-cover' : ''}`);
      await page.getByRole('button', { name: '건너뛰기', exact: true }).click();
      await expect(page.locator('.select')).toBeVisible();
      await noOverflow(page);
      await readableText(page);
      await open(page, courses[0]);
      for (const { x, y } of STAGES[0].solution) {
        const cell = page.locator(`.hit-layer rect[x="${x * 100}"][y="${y * 100}"]`);
        await cell.scrollIntoViewIfNeeded();
        await cell.click();
      }
      await page.getByRole('button', { name: '출발', exact: true }).click();
      await expect(page.getByRole('region', { name: '스테이지 완료', exact: true })).toBeVisible();
      await expect(page.locator('.overlay')).not.toHaveClass(/arming/);
      await expect(page.locator('.overlay')).toHaveCSS('opacity', '1');
      await expect(page.locator('.result-card')).toHaveCSS('opacity', '1');
      await expect(page.locator('.result-stars svg').last()).toHaveCSS('opacity', '1');
      await expect(page.locator('.result-actions button').first()).toBeInViewport();
      await readableText(page);
      await photograph(page, `result${viewport.height === 330 ? '-cover' : ''}`);
    });
  });
}
