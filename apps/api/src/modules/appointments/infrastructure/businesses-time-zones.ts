import { Injectable } from '@nestjs/common';
import type { BusinessScope } from '@turnero/shared';
import { GetBusinessProfile } from '../../businesses/application/public-business.js';
import { BusinessTimeZones } from '../application/ports.js';

/** Asks the businesses module (its public use case), instead of reading its tables. */
@Injectable()
export class BusinessesTimeZones extends BusinessTimeZones {
  constructor(private readonly getBusinessProfile: GetBusinessProfile) {
    super();
  }

  async timeZoneOf(scope: BusinessScope): Promise<string> {
    return (await this.getBusinessProfile.execute(scope)).timeZone;
  }
}
