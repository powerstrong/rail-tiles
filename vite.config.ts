import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { serviceWorker } from './scripts/serviceWorker';

export default defineConfig({
  // Relative asset URLs so the same build works at a domain root or under a
  // subpath such as https://<user>.github.io/rail-tiles/.
  base: './',
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
