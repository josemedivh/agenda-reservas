import { defineConfig } from 'vitest/config';

// Runs every package's tests from the root (`pnpm vitest`); each package keeps its own config.
export default defineConfig({
  test: {
    projects: ['apps/*', 'packages/*'],
  },
});
