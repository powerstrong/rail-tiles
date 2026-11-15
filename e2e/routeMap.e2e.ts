import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

// Every station, including six that retain their original boss gates. train2 is
// a course within Wildflower, so it must never add a sixteenth map station.
const STATIONS = [
  ['들꽃 기차 마을', 120, true], ['거울 토끼의 숲', 90, true], ['꿀벌의 한붓 꽃길', 150, true],
  ['색깔 길 잇기', 90, true], ['조각 맞추기', 90, true], ['무지개 산호초', 90, true],
  ['별사탕 저울', 90, true], ['구름 자수 공방', 90, true], ['미지의 세계', 90, true],
  ['펭귄 얼음 나라', 90, false], ['기차 차고지', 90, false], ['우주 정거장', 90, false],
  ['로봇 공장', 90, false], ['시계탑', 90, false], ['화산 섬', 90, false],
] as const;

test('390px route map: all fifteen stations have separate labels and touch areas and can be selected', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: '시작하기', exact: true }).click();
  await expect(page.locator('.route-station')).toHaveCount(STATIONS.length);
  await expect(page.locator('.route-station.open')).toHaveCount(9);
  await expect(page.locator('.route-station.locked')).toHaveCount(6);
  await expect(page.getByRole('button', { name: /^들꽃 장치 노선,/ })).toHaveCount(0);
  await expect(page.locator('.route-guide')).toContainText('15개 여행지');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);

  const bounds = await page.locator('.route-station').evaluateAll(stations => stations.map(station => {
    const r = station.getBoundingClientRect();
    const label = station.querySelector('.route-name')!.getBoundingClientRect();
    return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height, labelLeft: label.left, labelRight: label.right };
  }));
  for (let i = 0; i < bounds.length; i++) {
    const a = bounds[i];
    expect(a.width).toBeGreaterThanOrEqual(44);
    expect(a.height).toBeGreaterThanOrEqual(44);
    expect(a.labelLeft).toBeGreaterThanOrEqual(0);
    expect(a.labelRight).toBeLessThanOrEqual(390);
    for (const b of bounds.slice(i + 1)) {
      expect(a.right <= b.x || b.right <= a.x || a.bottom <= b.y || b.bottom <= a.y).toBe(true);
    }
  }
  await mkdir('/tmp/newworlds-shots', { recursive: true });
  await page.screenshot({ path: '/tmp/newworlds-shots/map-all.png' });
  // Capture the lower unlock branches inside the real scrolling phone viewport.
  await page.locator('.route-scroll').evaluate(el => { el.scrollTop = el.scrollHeight; });
  await page.screenshot({ path: '/tmp/newworlds-shots/map-lower.png' });

  // The train station is selected initially; tapping it again intentionally enters.
  for (const [title, stars, open] of [...STATIONS.slice(1), STATIONS[0]]) {
    const station = page.getByRole('button', { name: new RegExp(`^${title}, ${open ? `별 0/${stars}` : '잠김'}`) });
    await station.click();
    await expect(page.locator('.route-card strong')).toHaveText(title);
    await expect(page.locator('.route-card .primary')).toHaveCount(open ? 1 : 0);
    if (!open) await expect(page.locator('.route-card')).toContainText('깨면 열려요');
  }
  // Keyboard selection still reaches a new world after scrolling to the last branch.
  const cloud = page.getByRole('button', { name: /^구름 자수 공방,/ });
  await cloud.focus();
  await cloud.press('Enter');
  await expect(page.locator('.route-card strong')).toHaveText('구름 자수 공방');
  await page.getByRole('button', { name: '놀러 가기', exact: true }).click();
  await page.getByRole('button', { name: '건너뛰기', exact: true }).click();
  await expect(page.locator('.select h1')).toHaveText('구름 자수 공방');
  await expect(page.locator('.stage-card')).toHaveCount(30);
  expect(errors).toEqual([]);
});

test('existing boss records still open every original station alongside the new worlds', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('rail-tiles:progress', JSON.stringify({
    schemaVersion: 2,
    stars: { 'last-run': 3, 'ice-big-adventure': 1, 'mc-boss-1': 2, 't2-boss-1': 1, 'sp-boss-1': 3 },
    stories: ['train', 'train2', 'memory:bye'], look: { body: 'body-red' },
  })));
  await page.reload();
  await page.getByRole('button', { name: '시작하기', exact: true }).click();
  await expect(page.locator('.route-station')).toHaveCount(15);
  await expect(page.locator('.route-station.locked')).toHaveCount(0);
  await expect(page.locator('.route-stars')).toHaveAttribute('aria-label', '모은 별 10개');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('rail-tiles:progress')!));
  expect(saved.schemaVersion).toBe(2);
  expect(saved.stories).toEqual(['train', 'train2', 'memory:bye']);
  expect(saved.look).toEqual({ body: 'body-red' });
});
