import { existsSync } from 'node:fs';
import { defineConfig } from 'prisma/config';

// The .env file lives at the monorepo root; values already in the environment win.
const rootEnvFile = new URL('../../.env', import.meta.url);
if (existsSync(rootEnvFile)) {
  process.loadEnvFile(rootEnvFile);
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Migrations run as the schema owner, never as the runtime role.
    url: process.env.MIGRATION_DATABASE_URL,
  },
});
