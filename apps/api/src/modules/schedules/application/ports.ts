import type { Block, MembershipSummary, ProfessionalSchedule, WorkingRange } from '@turnero/shared';

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

export interface NewBlock {
  professionalId: string | null;
  startsAt: string;
  endsAt: string;
  reason: string | null;
}

export abstract class BlockRepository {
  /** Blocks that have not ended at `now`, earliest start first. */
  abstract listEndingAfter(businessId: string, now: Date): Promise<Block[]>;
  abstract create(businessId: string, block: NewBlock): Promise<Block>;
  /** False when there was no such block in the business. */
  abstract delete(businessId: string, blockId: string): Promise<boolean>;
}

/** The business's IANA time zone (owned by the businesses module). */
export abstract class BusinessTimeZones {
  abstract timeZoneOf(membership: MembershipSummary): Promise<string>;
}

export abstract class Clock {
  abstract now(): Date;
}
