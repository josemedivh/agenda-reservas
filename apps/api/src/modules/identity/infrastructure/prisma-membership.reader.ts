import { Injectable } from '@nestjs/common';
import { memberRoles, type MemberRole, type MembershipSummary } from '@turnero/shared';
import { PrismaService } from '../../../database/prisma.service.js';
import { MembershipReader } from '../application/ports.js';

interface MembershipRow {
  business_id: string;
  business_name: string;
  business_slug: string;
  role: string;
}

function toMemberRole(value: string): MemberRole {
  const role = memberRoles.find((candidate) => candidate === value);
  if (!role) {
    throw new Error(`Unknown member role "${value}"`);
  }
  return role;
}

// Reads through user_memberships(), a SECURITY DEFINER function: members has RLS and no
// business is selected yet when a user logs in.
@Injectable()
export class PrismaMembershipReader extends MembershipReader {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async listForUser(userId: string): Promise<MembershipSummary[]> {
    const rows = await this.prisma.$queryRaw<MembershipRow[]>`
      SELECT business_id, business_name, business_slug, role
      FROM user_memberships(${userId}::uuid)`;
    return rows.map((row) => ({
      businessId: row.business_id,
      businessName: row.business_name,
      businessSlug: row.business_slug,
      role: toMemberRole(row.role),
    }));
  }
}
