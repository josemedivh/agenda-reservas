import { Injectable } from '@nestjs/common';
import type { BusinessDetails, MembershipSummary } from '@turnero/shared';
import { BusinessNotFoundError } from '../domain/errors.js';
import { toBusinessDetails } from './business-details.js';
import { BusinessRepository } from './ports.js';

@Injectable()
export class GetBusiness {
  constructor(private readonly businesses: BusinessRepository) {}

  async execute(membership: MembershipSummary): Promise<BusinessDetails> {
    const business = await this.businesses.findById(membership.businessId);
    if (!business) {
      throw new BusinessNotFoundError();
    }
    return toBusinessDetails(business, membership.role);
  }
}
