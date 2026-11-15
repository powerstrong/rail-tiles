import { test, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { renderServiceWorker } from '../scripts/serviceWorker';
import { CONCEPTS } from '../src/lab/catalog';

test('deployment waits for old tabs, preserves their lazy assets, then upgrades offline at a Pages subpath', async ({ browser }) => {
  // A previously deployed page that has not requested its lazy game module yet.
  const legacy = new Map([
    ['index.html', '<!doctype html><button onclick="import(\'./old-game.js\').then(m => m.open())">Old game</button>'],
    ['old-game.js', 'export function open() { document.body.textContent = "Old game ready"; }'],
    ['sw.js', renderServiceWorker(['index.html', 'old-game.js'], 'legacy-upgrade-test') + '\nself.addEventListener("install", () => self.skipWaiting());'],
  ]);
  const mime: Record<string, string> = { html: 'text/html', js: 'text/javascript', css: 'text/css', svg: 'image/svg+xml', png: 'image/png', webmanifest: 'application/manifest+json' };
  let deployed = false;
  const server = createServer(async (req, res) => {
    const pathname = new URL(req.url!, 'http://localhost').pathname;
    if (!pathname.startsWith('/rail-tiles/')) { res.writeHead(404).end(); return; }
    const file = pathname.slice('/rail-tiles/'.length) || 'index.html';
    try {
      const body = deployed ? await readFile(new URL(`../dist/${file}`, import.meta.url)) : legacy.get(file);
      if (body === undefined) { res.writeHead(404).end(); return; }
      res.writeHead(200, { 'Content-Type': mime[file.split('.').at(-1)!] ?? 'application/octet-stream', 'Cache-Control': 'no-store' }).end(body);
    } catch { res.writeHead(404).end(); }
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as { port: number };
  const url = `http://127.0.0.1:${address.port}/rail-tiles/`;
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const errors: string[] = [];
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  try {
    const oldPage = await context.newPage();
    await oldPage.goto(url);
    await oldPage.evaluate(async () => {
      await navigator.serviceWorker.register('./sw.js');
      await navigator.serviceWorker.ready;
      localStorage.setItem('rail-tiles:progress', JSON.stringify({ schemaVersion: 2,
        stars: { 'last-run': 3, 't2-boss-1': 2, 't2-busy-crossing': 3 },
        look: { body: 'body-red' }, stories: ['train', 'train2'],
      }));
      localStorage.setItem('rail-tiles-lab-v1', JSON.stringify({ completed: { 'lab-v1-bee-1': true, 'lab-v1-twins-2': true } }));
    });
    await oldPage.reload();
    const otherTab = await context.newPage();
    await otherTab.goto(url);
    deployed = true;
    const workerStarted = context.waitForEvent('serviceworker');
    await oldPage.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())!.update(); });
    const newWorker = await workerStarted;
    await expect.poll(() => oldPage.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())!.waiting)).toBe(true);
    await oldPage.close();
    await context.setOffline(true);
    await otherTab.reload();
    await otherTab.getByRole('button', { name: 'Old game' }).click();
    await expect(otherTab.locator('body')).toHaveText('Old game ready');
    await otherTab.close();
    await expect.poll(() => newWorker.evaluate(async () => !(await caches.keys()).includes('rail-tiles-legacy-upgrade-test'))).toBe(true);

    // The new version was fully cached before activation, so even its first launch works offline.
    const next = await context.newPage();
    await next.goto(url);
    await expect(next.locator('.lab-entry')).toHaveCount(0);
    await next.getByRole('button', { name: '시작하기', exact: true }).click();
    for (const title of ['거울 토끼의 숲', '꿀벌의 한붓 꽃길']) {
      await expect(next.getByRole('button', { name: new RegExp(`^${title}, 별 1/${CONCEPTS.find(c => c.title === title)!.chapters.length * 30}`) })).toBeVisible();
    }
    for (const title of ['기차 차고지', '우주 정거장']) {
      await expect(next.getByRole('button', { name: new RegExp(`^${title}, 별`) })).toBeVisible();
    }
    const saved = await next.evaluate(() => JSON.parse(localStorage.getItem('rail-tiles:progress')!));
    expect(saved.stars).toEqual({ 'last-run': 3, 't2-boss-1': 2, 't2-busy-crossing': 3 });
    expect(saved.look).toEqual({ body: 'body-red' });
    expect(errors).toEqual([]);
  } finally {
    await context.close();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
