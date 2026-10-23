import { Injectable } from '@nestjs/common';
import type { MembershipSummary } from '@turnero/shared';
import { BusinessAccessDeniedError } from '../domain/errors.js';
import { MembershipReader } from './ports.js';

@Injectable()
export class AuthorizeBusinessMember {
  constructor(private readonly memberships: MembershipReader) {}

  async execute(userId: string, businessId: string): Promise<MembershipSummary> {
    const memberships = await this.memberships.listForUser(userId);
    const membership = memberships.find((candidate) => candidate.businessId === businessId);
    if (!membership) {
      throw new BusinessAccessDeniedError();
    }
    return membership;
  }
}
