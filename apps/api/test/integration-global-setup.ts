import { execSync } from 'node:child_process';
import { PrismaPg } from '@prisma/adapter-pg';
import { requireEnv } from '../src/config/env.js';
import { PrismaClient } from '../src/generated/prisma/client.js';

const TRUNCATE_ALL_TABLES = `
  DO $$
  DECLARE tables text;
  BEGIN
    SELECT string_agg(format('%I', tablename), ', ') INTO tables
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations';
    IF tables IS NOT NULL THEN
      EXECUTE 'TRUNCATE ' || tables || ' CASCADE';
    END IF;
  END $$`;

// Brings the test database to the latest migration and empties it, connected as the owner role.
export default async function setup(): Promise<void> {
  const migrationUrl = requireEnv('TEST_MIGRATION_DATABASE_URL');
  execSync('pnpm exec prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, MIGRATION_DATABASE_URL: migrationUrl },
  });

  const owner = new PrismaClient({ adapter: new PrismaPg({ connectionString: migrationUrl }) });
  try {
    await owner.$executeRawUnsafe(TRUNCATE_ALL_TABLES);
  } finally {
    await owner.$disconnect();
  }
}
