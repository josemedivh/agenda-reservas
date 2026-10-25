import { Injectable } from '@nestjs/common';
import {
  MAX_ACTIVE_PROFESSIONALS,
  type BusinessScope,
  type MembershipSummary,
  type Professional,
  type ProfessionalInput,
} from '@turnero/shared';
import { assertCanManageCatalog, validateProfessionalInput } from '../domain/catalog-rules.js';
import { ProfessionalNotFoundError } from '../domain/errors.js';
import { ProfessionalRepository } from './ports.js';

@Injectable()
export class ListProfessionals {
  constructor(private readonly professionals: ProfessionalRepository) {}

  execute(scope: BusinessScope): Promise<Professional[]> {
    return this.professionals.list(scope.businessId);
  }
}

@Injectable()
export class GetProfessional {
  constructor(private readonly professionals: ProfessionalRepository) {}

  async execute(scope: BusinessScope, professionalId: string): Promise<Professional> {
    const professional = await this.professionals.findById(scope.businessId, professionalId);
    if (!professional) {
      throw new ProfessionalNotFoundError();
    }
    return professional;
  }
}

@Injectable()
export class CreateProfessional {
  constructor(private readonly professionals: ProfessionalRepository) {}

  async execute(membership: MembershipSummary, input: ProfessionalInput): Promise<Professional> {
    assertCanManageCatalog(membership.role);
    return await this.professionals.create(
      membership.businessId,
      validateProfessionalInput(input),
      MAX_ACTIVE_PROFESSIONALS,
    );
  }
}

@Injectable()
export class UpdateProfessional {
  constructor(private readonly professionals: ProfessionalRepository) {}

  async execute(
    membership: MembershipSummary,
    professionalId: string,
    input: ProfessionalInput,
  ): Promise<Professional> {
    assertCanManageCatalog(membership.role);
    return await this.professionals.update(
      membership.businessId,
      professionalId,
      validateProfessionalInput(input),
    );
  }
}

/** Professionals are never deleted: they are deactivated and can come back. */
@Injectable()
export class SetProfessionalActive {
  constructor(private readonly professionals: ProfessionalRepository) {}

  async execute(
    membership: MembershipSummary,
    professionalId: string,
    active: boolean,
  ): Promise<Professional> {
    assertCanManageCatalog(membership.role);
    return await this.professionals.setActive(
      membership.businessId,
      professionalId,
      active,
      MAX_ACTIVE_PROFESSIONALS,
    );
  }
}
