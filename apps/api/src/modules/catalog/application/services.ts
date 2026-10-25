import { Injectable } from '@nestjs/common';
import type { BusinessScope, MembershipSummary, Service, ServiceInput } from '@turnero/shared';
import {
  assertAssignableProfessionals,
  assertCanManageCatalog,
  validateServiceInput,
} from '../domain/catalog-rules.js';
import { ServiceNotFoundError } from '../domain/errors.js';
import { ProfessionalRepository, ServiceRepository } from './ports.js';

async function activeProfessionalIds(
  professionals: ProfessionalRepository,
  businessId: string,
): Promise<Set<string>> {
  const list = await professionals.list(businessId);
  return new Set(list.filter((professional) => professional.active).map(({ id }) => id));
}

@Injectable()
export class ListServices {
  constructor(private readonly services: ServiceRepository) {}

  execute(scope: BusinessScope): Promise<Service[]> {
    return this.services.list(scope.businessId);
  }
}

@Injectable()
export class GetService {
  constructor(private readonly services: ServiceRepository) {}

  async execute(scope: BusinessScope, serviceId: string): Promise<Service> {
    const service = await this.services.findById(scope.businessId, serviceId);
    if (!service) {
      throw new ServiceNotFoundError();
    }
    return service;
  }
}

@Injectable()
export class CreateService {
  constructor(
    private readonly services: ServiceRepository,
    private readonly professionals: ProfessionalRepository,
  ) {}

  async execute(membership: MembershipSummary, input: ServiceInput): Promise<Service> {
    assertCanManageCatalog(membership.role);
    const service = validateServiceInput(input);
    assertAssignableProfessionals(
      service.professionalIds,
      await activeProfessionalIds(this.professionals, membership.businessId),
    );
    return this.services.create(membership.businessId, service);
  }
}

@Injectable()
export class UpdateService {
  constructor(
    private readonly services: ServiceRepository,
    private readonly professionals: ProfessionalRepository,
  ) {}

  async execute(
    membership: MembershipSummary,
    serviceId: string,
    input: ServiceInput,
  ): Promise<Service> {
    assertCanManageCatalog(membership.role);
    const service = validateServiceInput(input);
    const current = await this.services.findById(membership.businessId, serviceId);
    if (!current) {
      throw new ServiceNotFoundError();
    }
    const allowed = await activeProfessionalIds(this.professionals, membership.businessId);
    for (const id of current.professionalIds) {
      allowed.add(id);
    }
    assertAssignableProfessionals(service.professionalIds, allowed);
    return this.services.update(membership.businessId, serviceId, service);
  }
}

/** Services are never deleted: they are deactivated and can come back. */
@Injectable()
export class SetServiceActive {
  constructor(private readonly services: ServiceRepository) {}

  async execute(
    membership: MembershipSummary,
    serviceId: string,
    active: boolean,
  ): Promise<Service> {
    assertCanManageCatalog(membership.role);
    return await this.services.setActive(membership.businessId, serviceId, active);
  }
}
