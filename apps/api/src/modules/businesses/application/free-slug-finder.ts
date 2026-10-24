import { Injectable } from '@nestjs/common';
import { slugAlternatives } from '../domain/slug-alternatives.js';
import { BusinessRepository } from './ports.js';

const ALTERNATIVES_TO_TRY = 20;

@Injectable()
export class FreeSlugFinder {
  constructor(private readonly businesses: BusinessRepository) {}

  /** First free "<slug>-N", or null when the first few are all taken. */
  async alternativeTo(slug: string): Promise<string | null> {
    for (const candidate of slugAlternatives(slug, ALTERNATIVES_TO_TRY)) {
      if (!(await this.businesses.isSlugTaken(candidate))) {
        return candidate;
      }
    }
    return null;
  }
}
