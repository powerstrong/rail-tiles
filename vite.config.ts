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
  },
});
