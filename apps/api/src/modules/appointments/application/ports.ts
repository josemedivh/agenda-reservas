import type {
  Appointment,
  AppointmentSource,
  AppointmentStatus,
  BusinessScope,
} from '@turnero/shared';
import type { AppointmentSpan } from '../domain/appointment-rules.js';

export interface NewAppointment extends AppointmentSpan {
  professionalId: string;
  serviceId: string;
  serviceName: string;
  priceCents: number;
  status: AppointmentStatus;
  source: AppointmentSource;
  codeHash: string;
  customer: { name: string; phone: string };
}

/** When a professional is taken (appointments that were not cancelled). */
export interface BusySpan {
  professionalId: string;
  startsAt: Date;
  busyUntil: Date;
}

// Abstract classes so NestJS can use them as injection tokens.

export abstract class AppointmentRepository {
  /**
   * Saves the customer (one per phone in the business; a new name replaces the old one) and the
   * appointment in one transaction.
   * @throws AppointmentOverlapError when the professional is already busy at that time.
   */
  abstract create(businessId: string, appointment: NewAppointment): Promise<Appointment>;
  /** Not cancelled and overlapping [from, to). */
  abstract listBusy(businessId: string, from: Date, to: Date): Promise<BusySpan[]>;
  /** Starting in [from, to), earliest first. */
  abstract listStartingBetween(businessId: string, from: Date, to: Date): Promise<Appointment[]>;
  abstract findByCodeHash(businessId: string, codeHash: string): Promise<Appointment | null>;
}

export interface IssuedAppointmentCode {
  /** Goes in the client's link. */
  code: string;
  /** What is stored. */
  codeHash: string;
}

export abstract class AppointmentCodes {
  abstract issue(): IssuedAppointmentCode;
  abstract hashOf(code: string): string;
}

export abstract class BusinessTimeZones {
  abstract timeZoneOf(scope: BusinessScope): Promise<string>;
}
