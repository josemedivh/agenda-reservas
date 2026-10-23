import { Module } from '@nestjs/common';
import { requireEnv } from '../config/env.js';
import { PrismaService } from './prisma.service.js';
import { TenantTransactionRunner } from './tenant-transaction-runner.js';

@Module({
  providers: [
    {
      provide: PrismaService,
      useFactory: () => new PrismaService(requireEnv('DATABASE_URL')),
    },
    TenantTransactionRunner,
  ],
  exports: [PrismaService, TenantTransactionRunner],
})
export class DatabaseModule {}
