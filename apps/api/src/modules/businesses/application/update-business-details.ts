import { Injectable } from '@nestjs/common';
import { canEditBusiness, type BusinessDetails, type MembershipSummary } from '@turnero/shared';
import { validateBusinessProfile, type BusinessProfileInput } from '../domain/business-profile.js';
import { BusinessEditForbiddenError } from '../domain/errors.js';
import { toBusinessDetails } from './business-details.js';
import { BusinessRepository } from './ports.js';

@Injectable()
export class UpdateBusinessDetails {
  constructor(private readonly businesses: BusinessRepository) {}

  async execute(
    membership: MembershipSummary,
    command: BusinessProfileInput,
  ): Promise<BusinessDetails> {
    if (!canEditBusiness(membership.role)) {
      throw new BusinessEditForbiddenError();
    }
    const profile = validateBusinessProfile(command);
    const business = await this.businesses.updateProfile(membership.businessId, profile);
    return toBusinessDetails(business, membership.role);
  }
}
