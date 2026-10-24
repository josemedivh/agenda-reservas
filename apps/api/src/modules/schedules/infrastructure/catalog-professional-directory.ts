import { Injectable } from '@nestjs/common';
import type { MembershipSummary } from '@turnero/shared';
import { GetProfessional } from '../../catalog/application/professionals.js';
import { ProfessionalNotFoundError } from '../../catalog/domain/errors.js';
import { ProfessionalDirectory } from '../application/ports.js';

/** Asks the catalog module (its public use case), instead of reading its tables. */
@Injectable()
export class CatalogProfessionalDirectory extends ProfessionalDirectory {
  constructor(private readonly getProfessional: GetProfessional) {
    super();
  }

  async exists(membership: MembershipSummary, professionalId: string): Promise<boolean> {
    try {
      await this.getProfessional.execute(membership, professionalId);
      return true;
    } catch (error) {
      if (error instanceof ProfessionalNotFoundError) {
        return false;
      }
      throw error;
    }
  }
}
