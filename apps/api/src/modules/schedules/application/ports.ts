import type { MembershipSummary, ProfessionalSchedule, WorkingRange } from '@turnero/shared';

// Abstract classes so NestJS can use them as injection tokens.

export abstract class WorkingHoursRepository {
  /** Professionals of the business that have at least one range. */
  abstract listByBusiness(businessId: string): Promise<ProfessionalSchedule[]>;
  abstract findForProfessional(businessId: string, professionalId: string): Promise<WorkingRange[]>;
  /** Replaces the whole week atomically. Ranges arrive validated and sorted. */
  abstract replaceForProfessional(
    businessId: string,
    professionalId: string,
    ranges: WorkingRange[],
  ): Promise<WorkingRange[]>;
}

/** Answers whether a professional belongs to the business (owned by the catalog module). */
export abstract class ProfessionalDirectory {
  abstract exists(membership: MembershipSummary, professionalId: string): Promise<boolean>;
}
