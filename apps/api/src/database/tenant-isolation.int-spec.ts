import { randomUUID } from 'node:crypto';
import { Test, type TestingModule } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MemberRole } from '../generated/prisma/enums.js';
import { DatabaseModule } from './database.module.js';
import { PrismaService } from './prisma.service.js';
import { TenantTransactionRunner } from './tenant-transaction-runner.js';

describe('Row level security by business', () => {
  const businessA = randomUUID();
  const businessB = randomUUID();
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let tenants: TenantTransactionRunner;

  async function createUser(): Promise<string> {
    const user = await prisma.user.create({
      data: { email: `${randomUUID()}@example.test`, passwordHash: 'not-a-hash', name: 'Dueño' },
    });
    return user.id;
  }

  async function createBusinessWithOwner(businessId: string): Promise<void> {
    const userId = await createUser();
    await tenants.run(businessId, async (tx) => {
      await tx.business.create({
        data: {
          id: businessId,
          name: 'Barbería El Faro',
          slug: `barberia-${businessId}`,
          phone: '+593991234567',
          timeZone: 'America/Guayaquil',
        },
      });
      await tx.member.create({ data: { businessId, userId, role: MemberRole.OWNER } });
    });
  }

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({ imports: [DatabaseModule] }).compile();
    prisma = moduleRef.get(PrismaService);
    tenants = moduleRef.get(TenantTransactionRunner);
    await createBusinessWithOwner(businessA);
    await createBusinessWithOwner(businessB);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('connects with a role that cannot bypass RLS', async () => {
    const [role] = await prisma.$queryRaw<
      { rolsuper: boolean; rolbypassrls: boolean; owned_tables: number }[]
    >`
      SELECT rolsuper, rolbypassrls,
        (SELECT count(*)::int FROM pg_tables WHERE tableowner = current_user) AS owned_tables
      FROM pg_roles WHERE rolname = current_user`;

    // Table owners skip RLS just like superusers, so the runtime role must own nothing.
    expect(role).toEqual({ rolsuper: false, rolbypassrls: false, owned_tables: 0 });
  });

  it('hides every tenant row when no business is set', async () => {
    expect(await prisma.business.findMany()).toEqual([]);
    expect(await prisma.member.findMany()).toEqual([]);
  });

  it('only exposes rows of the current business', async () => {
    const visible = await tenants.run(businessA, async (tx) => ({
      businesses: await tx.business.findMany({ select: { id: true } }),
      members: await tx.member.findMany({ select: { businessId: true } }),
    }));

    expect(visible.businesses).toEqual([{ id: businessA }]);
    expect(visible.members).toEqual([{ businessId: businessA }]);
  });

  it('rejects inserting rows for another business', async () => {
    const userId = await createUser();

    await expect(
      tenants.run(businessA, (tx) =>
        tx.member.create({ data: { businessId: businessB, userId, role: MemberRole.EMPLOYEE } }),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it('cannot update or delete rows of another business', async () => {
    const result = await tenants.run(businessA, async (tx) => ({
      updated: await tx.business.updateMany({ where: { id: businessB }, data: { name: 'Otro' } }),
      deleted: await tx.member.deleteMany({ where: { businessId: businessB } }),
    }));

    expect(result).toEqual({ updated: { count: 0 }, deleted: { count: 0 } });
    const businessBAfter = await tenants.run(businessB, (tx) =>
      tx.business.findUniqueOrThrow({ where: { id: businessB }, include: { members: true } }),
    );
    expect(businessBAfter.name).toBe('Barbería El Faro');
    expect(businessBAfter.members).toHaveLength(1);
  });

  it('does not keep the business set after the transaction ends', async () => {
    await tenants.run(businessA, (tx) => tx.business.findMany());

    expect(await prisma.business.findMany()).toEqual([]);
  });
});
