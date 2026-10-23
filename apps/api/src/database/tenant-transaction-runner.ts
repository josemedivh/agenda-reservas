import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from './prisma.service.js';

export type TenantTransaction = Prisma.TransactionClient;

@Injectable()
export class TenantTransactionRunner {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Runs `work` in a transaction scoped to `businessId`: the setting is local to the
   * transaction, so RLS policies only expose and accept rows of that business.
   */
  run<T>(businessId: string, work: (tx: TenantTransaction) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_business_id', ${businessId}, true)`;
      return work(tx);
    });
  }
}
