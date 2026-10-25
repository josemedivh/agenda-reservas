import type {
  Block,
  BusinessScope,
  Professional,
  ProfessionalSchedule,
  Service,
} from '@turnero/shared';

// Availability owns no data: each port is implemented with the public use cases of the module
// that owns it. Abstract classes so NestJS can use them as injection tokens.

export abstract class CatalogReader {
  abstract findService(scope: BusinessScope, serviceId: string): Promise<Service | null>;
  abstract listProfessionals(scope: BusinessScope): Promise<Professional[]>;
}

export abstract class ScheduleReader {
  abstract workingHours(scope: BusinessScope): Promise<ProfessionalSchedule[]>;
  /** Blocks that have not ended yet (availability never looks at the past). */
  abstract upcomingBlocks(scope: BusinessScope): Promise<Block[]>;
}

export abstract class BusinessTimeZones {
  abstract timeZoneOf(scope: BusinessScope): Promise<string>;
}

export interface BusyInterval {
  professionalId: string;
  startsAt: Date;
  /** Already extended by the appointment's preparation time. */
  endsAt: Date;
}

export abstract class AppointmentReader {
  abstract busyIntervals(scope: BusinessScope, from: Date, to: Date): Promise<BusyInterval[]>;
}

export abstract class Clock {
  abstract now(): Date;
}
