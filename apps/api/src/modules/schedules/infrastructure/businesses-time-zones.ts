import { Injectable } from '@nestjs/common';
import type { MembershipSummary } from '@turnero/shared';
import { GetBusiness } from '../../businesses/application/get-business.js';
import { BusinessTimeZones } from '../application/ports.js';

/** Asks the businesses module (its public use case), instead of reading its tables. */
@Injectable()
export class BusinessesTimeZones extends BusinessTimeZones {
  constructor(private readonly getBusiness: GetBusiness) {
    super();
  }

  async timeZoneOf(membership: MembershipSummary): Promise<string> {
    return (await this.getBusiness.execute(membership)).timeZone;
  }
}
