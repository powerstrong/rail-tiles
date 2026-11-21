import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { serviceWorker } from './scripts/serviceWorker';
import { execFileSync } from 'node:child_process';

let revision = 'dev';
try {
  revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || 'dev';
} catch { /* Source archives and environments without git still build. */ }
const buildVersion = `v${new Date().toISOString().slice(0, 10).replaceAll('-', '.')}-${revision}`;

export default defineConfig({
  // Relative asset URLs so the same build works at a domain root or under a
  // subpath such as https://<user>.github.io/rail-tiles/.
  base: './',
  define: { __APP_VERSION__: JSON.stringify(buildVersion) },
  plugins: [react(), serviceWorker()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Solver-heavy suites otherwise compete for CPU and memory on small runners.
    maxWorkers: 1,
    // Full graph audits can exceed five seconds even without competing workers.
    testTimeout: 10_000,
  },
});
