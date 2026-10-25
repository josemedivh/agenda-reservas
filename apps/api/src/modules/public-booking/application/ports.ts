import type {
  Appointment,
  AvailabilityDaysQuery,
  AvailabilityQuery,
  BusinessScope,
  DayAvailability,
  DayAvailabilitySummary,
  Professional,
  Service,
} from '@turnero/shared';
import type {
  AppointmentRequest,
  RecordedAppointment,
} from '../../appointments/application/appointments.js';

// The public booking page owns no data: each port is implemented with the public use cases of
// the module that owns it. Abstract classes so NestJS can use them as injection tokens.

export interface PublicBusinessRecord {
  id: string;
  name: string;
  slug: string;
  phone: string;
  address: string | null;
  timeZone: string;
}

export abstract class BusinessDirectory {
  /** @throws BusinessNotFoundError when no active business has that link. */
  abstract findBySlug(slug: string): Promise<PublicBusinessRecord>;
}

export abstract class CatalogReader {
  abstract listServices(scope: BusinessScope): Promise<Service[]>;
  /** Inactive ones included (an old booking still names its professional). */
  abstract listProfessionals(scope: BusinessScope): Promise<Professional[]>;
}

export abstract class AvailabilityReader {
  abstract day(scope: BusinessScope, query: AvailabilityQuery): Promise<DayAvailability>;
  abstract days(
    scope: BusinessScope,
    query: AvailabilityDaysQuery,
  ): Promise<DayAvailabilitySummary[]>;
}

export abstract class AppointmentBook {
  /** Appointments (not cancelled) overlapping [from, to). */
  abstract busy(scope: BusinessScope, from: Date, to: Date): Promise<{ professionalId: string }[]>;
  /** Null when the professional got booked at that time in the meantime. */
  abstract tryRecord(
    scope: BusinessScope,
    request: AppointmentRequest,
  ): Promise<RecordedAppointment | null>;
  abstract findByCode(scope: BusinessScope, code: string): Promise<Appointment | null>;
}
