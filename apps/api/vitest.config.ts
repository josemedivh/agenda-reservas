import { existsSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

// The .env file lives at the monorepo root; values already in the environment win.
const rootEnvFile = new URL('../../.env', import.meta.url);
if (existsSync(rootEnvFile)) {
  process.loadEnvFile(rootEnvFile);
}

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/*.spec.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['src/**/*.int-spec.ts'],
          globalSetup: ['./test/integration-global-setup.ts'],
          env: { DATABASE_URL: process.env.TEST_DATABASE_URL ?? '' },
          fileParallelism: false,
        },
      },
    ],
  },
});
