import { existsSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

// The .env file lives at the monorepo root; values already in the environment win.
const rootEnvFile = new URL('../../.env', import.meta.url);
if (existsSync(rootEnvFile)) {
  process.loadEnvFile(rootEnvFile);
}

export default defineConfig({
  test: {
    // Tests never touch the development database.
    env: { DATABASE_URL: process.env.TEST_DATABASE_URL ?? '' },
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
          fileParallelism: false,
          // Hooks boot the whole app and hash passwords (Argon2), which can take more than the
          // default 10 s when other packages' tests run in parallel on the same machine.
          hookTimeout: 30_000,
          testTimeout: 15_000,
        },
      },
    ],
  },
});
