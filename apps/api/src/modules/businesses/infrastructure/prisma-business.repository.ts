import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';
import { TenantTransactionRunner } from '../../../database/tenant-transaction-runner.js';
import { Prisma } from '../../../generated/prisma/client.js';
import { BusinessStatus, MemberRole } from '../../../generated/prisma/enums.js';
import { BusinessRepository, type BusinessRecord, type NewBusiness } from '../application/ports.js';
import type { BusinessProfile } from '../domain/business-profile.js';
import { SlugTakenError } from '../domain/errors.js';

const BUSINESS_FIELDS = {
  id: true,
  name: true,
  slug: true,
  phone: true,
  address: true,
  timeZone: true,
  status: true,
} as const;

type BusinessRow = Prisma.BusinessGetPayload<{ select: typeof BUSINESS_FIELDS }>;

function toRecord(row: BusinessRow): BusinessRecord {
  return { ...row, status: row.status === BusinessStatus.ACTIVE ? 'active' : 'suspended' };
}

@Injectable()
export class PrismaBusinessRepository extends BusinessRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenants: TenantTransactionRunner,
  ) {
    super();
  }

  async isSlugTaken(slug: string): Promise<boolean> {
    const rows = await this.prisma.$queryRaw<{ taken: boolean }[]>`
      SELECT is_business_slug_taken(${slug}) AS taken`;
    return rows[0]?.taken ?? false;
  }

  async createWithOwner(business: NewBusiness, ownerUserId: string): Promise<BusinessRecord> {
    // The id is chosen here so the transaction can run as the new business (RLS WITH CHECK).
    const businessId = randomUUID();
    try {
      return await this.tenants.run(businessId, async (tx) => {
        const created = await tx.business.create({
          data: { id: businessId, ...business },
          select: BUSINESS_FIELDS,
        });
        await tx.member.create({
          data: { businessId, userId: ownerUserId, role: MemberRole.OWNER },
        });
        return toRecord(created);
      });
    } catch (error) {
      // The only unique value a new business can collide on is its slug.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new SlugTakenError();
      }
      throw error;
    }
  }

  async findById(businessId: string): Promise<BusinessRecord | null> {
    const row = await this.tenants.run(businessId, (tx) =>
      tx.business.findUnique({ where: { id: businessId }, select: BUSINESS_FIELDS }),
    );
    return row ? toRecord(row) : null;
  }

  async updateProfile(businessId: string, profile: BusinessProfile): Promise<BusinessRecord> {
    const row = await this.tenants.run(businessId, (tx) =>
      tx.business.update({ where: { id: businessId }, data: profile, select: BUSINESS_FIELDS }),
    );
    return toRecord(row);
  }
}
