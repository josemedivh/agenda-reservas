import type { OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

/**
 * Prisma client connected as the runtime role (subject to row level security).
 * Tenant tables must be accessed through TenantTransactionRunner, or RLS returns no rows.
 */
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(connectionString: string) {
    super({ adapter: new PrismaPg({ connectionString }) });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
