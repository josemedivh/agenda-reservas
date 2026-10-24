import type { Professional, ProfessionalInput, Service, ServiceInput } from '@turnero/shared';

// Abstract class so NestJS can use it as an injection token. Every method is scoped to one
// business (row level security in the Prisma adapter).
export abstract class ProfessionalRepository {
  /** Active first, then by name. */
  abstract list(businessId: string): Promise<Professional[]>;
  abstract findById(businessId: string, professionalId: string): Promise<Professional | null>;
  /**
   * Creates an active professional. Counting and inserting happen atomically.
   * @throws ProfessionalLimitReachedError when `maxActive` are already active.
   * @throws ProfessionalNameTakenError when an active one has the same name (any case).
   */
  abstract create(
    businessId: string,
    input: ProfessionalInput,
    maxActive: number,
  ): Promise<Professional>;
  /**
   * @throws ProfessionalNotFoundError
   * @throws ProfessionalNameTakenError
   */
  abstract update(
    businessId: string,
    professionalId: string,
    input: ProfessionalInput,
  ): Promise<Professional>;
  /**
   * Reactivating checks the limit and the name like `create`.
   * @throws ProfessionalNotFoundError
   */
  abstract setActive(
    businessId: string,
    professionalId: string,
    active: boolean,
    maxActive: number,
  ): Promise<Professional>;
}

export abstract class ServiceRepository {
  /** Active first, then by name. */
  abstract list(businessId: string): Promise<Service[]>;
  abstract findById(businessId: string, serviceId: string): Promise<Service | null>;
  /** @throws ServiceNameTakenError when an active one has the same name (any case). */
  abstract create(businessId: string, input: ServiceInput): Promise<Service>;
  /**
   * Replaces details and assigned professionals.
   * @throws ServiceNotFoundError
   * @throws ServiceNameTakenError
   */
  abstract update(businessId: string, serviceId: string, input: ServiceInput): Promise<Service>;
  /**
   * @throws ServiceNotFoundError
   * @throws ServiceNameTakenError when reactivating and an active one has the same name.
   */
  abstract setActive(businessId: string, serviceId: string, active: boolean): Promise<Service>;
}
