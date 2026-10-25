import type {
  Block,
  MembershipSummary,
  Professional,
  ProfessionalSchedule,
  Service,
} from '@turnero/shared';

// Availability owns no data: each port is implemented with the public use cases of the module
// that owns it. Abstract classes so NestJS can use them as injection tokens.

export abstract class CatalogReader {
  abstract findService(membership: MembershipSummary, serviceId: string): Promise<Service | null>;
  abstract listProfessionals(membership: MembershipSummary): Promise<Professional[]>;
}

export abstract class ScheduleReader {
  abstract workingHours(membership: MembershipSummary): Promise<ProfessionalSchedule[]>;
  /** Blocks that have not ended yet (availability never looks at the past). */
  abstract upcomingBlocks(membership: MembershipSummary): Promise<Block[]>;
}

export abstract class BusinessTimeZones {
  abstract timeZoneOf(membership: MembershipSummary): Promise<string>;
}

export interface BusyInterval {
  professionalId: string;
  startsAt: Date;
  /** Already extended by the appointment's preparation time. */
  endsAt: Date;
}

export abstract class AppointmentReader {
  abstract busyIntervals(
    membership: MembershipSummary,
    from: Date,
    to: Date,
  ): Promise<BusyInterval[]>;
}

export abstract class Clock {
  abstract now(): Date;
}
