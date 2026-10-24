import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.spec.{ts,tsx}'],
    exclude: ['node_modules/**', '.next/**'],
    // Components run in a simulated browser; files that need Node opt out with
    // `// @vitest-environment node`.
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
});
