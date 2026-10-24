import { Injectable } from '@nestjs/common';
import type { SlugAvailabilityResponse } from '@turnero/shared';
import { validateSlug } from '../domain/business-profile.js';
import { FreeSlugFinder } from './free-slug-finder.js';
import { BusinessRepository } from './ports.js';

@Injectable()
export class CheckSlugAvailability {
  constructor(
    private readonly businesses: BusinessRepository,
    private readonly freeSlugs: FreeSlugFinder,
  ) {}

  async execute(rawSlug: string): Promise<SlugAvailabilityResponse> {
    const slug = validateSlug(rawSlug);
    if (!(await this.businesses.isSlugTaken(slug))) {
      return { slug, available: true, suggestion: null };
    }
    return { slug, available: false, suggestion: await this.freeSlugs.alternativeTo(slug) };
  }
}
