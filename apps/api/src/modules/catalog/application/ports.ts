import type { Professional, ProfessionalInput } from '@turnero/shared';

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
