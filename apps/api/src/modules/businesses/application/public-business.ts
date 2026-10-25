import { Injectable } from '@nestjs/common';
import type { BusinessScope } from '@turnero/shared';
import { BusinessNotFoundError } from '../domain/errors.js';
import { BusinessRepository, type BusinessRecord } from './ports.js';

// Reads that need no membership: the public booking page and other modules that only want the
// business's own data (name, link, contact, time zone).

/** The active business behind a public link. */
@Injectable()
export class FindActiveBusinessBySlug {
  constructor(private readonly businesses: BusinessRepository) {}

  async execute(slug: string): Promise<BusinessRecord> {
    const businessId = await this.businesses.findActiveIdBySlug(slug);
    const business = businessId ? await this.businesses.findById(businessId) : null;
    if (!business) {
      throw new BusinessNotFoundError();
    }
    return business;
  }
}

@Injectable()
export class GetBusinessProfile {
  constructor(private readonly businesses: BusinessRepository) {}

  async execute(scope: BusinessScope): Promise<BusinessRecord> {
    const business = await this.businesses.findById(scope.businessId);
    if (!business) {
      throw new BusinessNotFoundError();
    }
    return business;
  }
}
