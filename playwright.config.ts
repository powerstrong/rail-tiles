import { defineConfig } from '@playwright/test';

// PW_PORT lets several worktrees run browser tests at the same time.
const port = Number(process.env.PW_PORT ?? 4174);

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  timeout: 180_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: 2,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: 'list',
  use: {
    browserName: 'chromium',
    baseURL: `http://127.0.0.1:${port}`,
    viewport: { width: 1280, height: 900 },
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `npm run preview -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
  },
});
