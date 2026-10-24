import { execSync } from 'node:child_process';
import { PrismaPg } from '@prisma/adapter-pg';
import { requireEnv } from '../src/config/env.js';
import { PrismaClient } from '../src/generated/prisma/client.js';

/**
 * Rebuilds the test database from scratch, connected as the owner role: drops the schema
 * (data, failed migrations and all) and applies every migration again. Leftovers from an
 * earlier run can never break a new migration.
 */
export default async function setup(): Promise<void> {
  const migrationUrl = requireEnv('TEST_MIGRATION_DATABASE_URL');

  const owner = new PrismaClient({ adapter: new PrismaPg({ connectionString: migrationUrl }) });
  try {
    await owner.$executeRawUnsafe('DROP SCHEMA IF EXISTS public CASCADE');
    await owner.$executeRawUnsafe('CREATE SCHEMA public');
  } finally {
    await owner.$disconnect();
  }

  execSync('pnpm exec prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, MIGRATION_DATABASE_URL: migrationUrl },
  });
}
