import { Injectable } from '@nestjs/common';
import type { BusinessDetails } from '@turnero/shared';
import {
  validateBusinessProfile,
  validateSlug,
  type BusinessProfileInput,
} from '../domain/business-profile.js';
import { SlugTakenError } from '../domain/errors.js';
import { toBusinessDetails } from './business-details.js';
import { FreeSlugFinder } from './free-slug-finder.js';
import { BusinessRepository } from './ports.js';

export interface CreateBusinessCommand extends BusinessProfileInput {
  slug: string;
}

@Injectable()
export class CreateBusiness {
  constructor(
    private readonly businesses: BusinessRepository,
    private readonly freeSlugs: FreeSlugFinder,
  ) {}

  async execute(userId: string, command: CreateBusinessCommand): Promise<BusinessDetails> {
    const profile = validateBusinessProfile(command);
    const slug = validateSlug(command.slug);
    if (await this.businesses.isSlugTaken(slug)) {
      throw new SlugTakenError(await this.freeSlugs.alternativeTo(slug));
    }

    try {
      const business = await this.businesses.createWithOwner({ ...profile, slug }, userId);
      return toBusinessDetails(business, 'owner');
    } catch (error) {
      // Someone else took the slug between the check and the insert.
      if (error instanceof SlugTakenError) {
        throw new SlugTakenError(await this.freeSlugs.alternativeTo(slug));
      }
      throw error;
    }
  }
}
