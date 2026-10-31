import { describe, expect, it } from 'vitest';
import { renderServiceWorker } from '../scripts/serviceWorker';

describe('service worker', () => {
  const files = ['assets/index-abc.js', 'assets/daily.worker-def.js', 'index.html', 'icon-192.png'];
  const source = renderServiceWorker(files, 'v123');

  it('is valid JavaScript', () => {
    expect(() => new Function(source)).not.toThrow();
  });

  it('precaches the page and every file the build made', () => {
    const list = JSON.parse(source.match(/const FILES = (.*);/)![1]) as string[];
    expect(list).toEqual(['./', ...files.map((f) => `./${f}`)]);
  });

  it('matches crossorigin module scripts even when the server sends Vary: Origin', () => {
    expect(source).toContain('cache.match(req, { ignoreVary: true })');
  });

  it('uses a cache per version and clears the others, including the old fixed one', () => {
    expect(source).toContain("const CACHE = 'rail-tiles-v123';");
    expect(source).toContain("k.startsWith('rail-tiles-') && k !== CACHE");
  });
});
