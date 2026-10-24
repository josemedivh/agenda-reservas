import type { BusinessStatus } from '@turnero/shared';
import type { BusinessProfile } from '../domain/business-profile.js';

export interface BusinessRecord extends BusinessProfile {
  id: string;
  slug: string;
  status: BusinessStatus;
}

export interface NewBusiness extends BusinessProfile {
  slug: string;
}

// Abstract class so NestJS can use it as an injection token.
export abstract class BusinessRepository {
  /** Looks across all businesses (slugs are global), not only the current one. */
  abstract isSlugTaken(slug: string): Promise<boolean>;
  /**
   * Creates the business and the owner membership atomically.
   * @throws SlugTakenError when another business got the slug first.
   */
  abstract createWithOwner(business: NewBusiness, ownerUserId: string): Promise<BusinessRecord>;
  abstract findById(businessId: string): Promise<BusinessRecord | null>;
  abstract updateProfile(businessId: string, profile: BusinessProfile): Promise<BusinessRecord>;
}
