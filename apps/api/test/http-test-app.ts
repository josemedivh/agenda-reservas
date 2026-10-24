import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import type { Type } from '@nestjs/common';
import type { BusinessDetails } from '@turnero/shared';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll } from 'vitest';
import { configureApp } from '../src/app.setup.js';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { TenantTransactionRunner } from '../src/database/tenant-transaction-runner.js';

// Helpers for HTTP integration tests (real app, test database).

export const TEST_PASSWORD = 'contraseña-segura';

export function uniqueEmail(): string {
  return `ana-${randomUUID()}@example.test`;
}

export interface TestApp {
  app: NestExpressApplication;
  server: Server;
  prisma: PrismaService;
  tenants: TenantTransactionRunner;
}

/**
 * Boots the full app once per describe block (so each block has its own rate-limit counters)
 * and closes it afterwards. Extra modules can add test-only routes.
 */
export function useTestApp(extraModules: Type[] = []): TestApp {
  const context = {} as TestApp;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule, ...extraModules],
    }).compile();
    context.app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(context.app);
    await context.app.init();
    context.server = context.app.getHttpServer();
    context.prisma = moduleRef.get(PrismaService);
    context.tenants = moduleRef.get(TenantTransactionRunner);
  });

  afterAll(async () => {
    await context.app.close();
  });

  return context;
}

/** Registers a new user and returns an agent that keeps their session cookie. */
export async function signedInAgent(server: Server) {
  const agent = request.agent(server);
  const response = await agent
    .post('/auth/register')
    .send({ name: 'Ana', email: uniqueEmail(), password: TEST_PASSWORD })
    .expect(201);
  return { agent, userId: (response.body as { user: { id: string } }).user.id };
}

/** A signed-in owner with a brand-new business (unique link). */
export async function ownerWithBusiness(server: Server) {
  const owner = await signedInAgent(server);
  const response = await owner.agent
    .post('/businesses')
    .send({
      name: 'Barbería El Faro',
      slug: `barberia-${randomUUID().slice(0, 8)}`,
      phone: '0991234567',
      timeZone: 'America/Guayaquil',
    })
    .expect(201);
  return { ...owner, business: response.body as BusinessDetails };
}
