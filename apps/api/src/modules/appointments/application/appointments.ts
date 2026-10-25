import { Injectable } from '@nestjs/common';
import type {
  Appointment,
  AppointmentSource,
  AppointmentsQuery,
  BusinessScope,
  MembershipSummary,
} from '@turnero/shared';
import { appointmentSpan, localDaysInterval } from '../domain/appointment-rules.js';
import { AppointmentNotFoundError } from '../domain/errors.js';
import {
  AppointmentCodes,
  AppointmentRepository,
  BusinessTimeZones,
  type BusySpan,
} from './ports.js';

export interface AppointmentRequest {
  professionalId: string;
  serviceId: string;
  /** Copied into the appointment as they are now. */
  serviceName: string;
  priceCents: number;
  durationMinutes: number;
  bufferMinutes: number;
  startsAt: Date;
  source: AppointmentSource;
  customer: { name: string; phone: string };
}

export interface RecordedAppointment {
  appointment: Appointment;
  /** For the client's link; only its hash is stored. */
  code: string;
}

/**
 * Saves an appointment. Callers check the availability first (working hours, blocks, notice);
 * this only guarantees, through the database, that the professional is not booked twice.
 */
@Injectable()
export class RecordAppointment {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly codes: AppointmentCodes,
  ) {}

  async execute(scope: BusinessScope, request: AppointmentRequest): Promise<RecordedAppointment> {
    const { code, codeHash } = this.codes.issue();
    const appointment = await this.appointments.create(scope.businessId, {
      ...appointmentSpan(request.startsAt, request.durationMinutes, request.bufferMinutes),
      professionalId: request.professionalId,
      serviceId: request.serviceId,
      serviceName: request.serviceName,
      priceCents: request.priceCents,
      // No confirmation step yet: a booked time is a confirmed time.
      status: 'confirmed',
      source: request.source,
      codeHash,
      customer: request.customer,
    });
    return { appointment, code };
  }
}

/** When each professional is taken between two instants (for the availability). */
@Injectable()
export class ListBusyTimes {
  constructor(private readonly appointments: AppointmentRepository) {}

  execute(scope: BusinessScope, from: Date, to: Date): Promise<BusySpan[]> {
    return this.appointments.listBusy(scope.businessId, from, to);
  }
}

/** The appointment behind a client's link. */
@Injectable()
export class FindAppointmentByCode {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly codes: AppointmentCodes,
  ) {}

  async execute(scope: BusinessScope, code: string): Promise<Appointment> {
    const appointment = await this.appointments.findByCodeHash(
      scope.businessId,
      this.codes.hashOf(code),
    );
    if (!appointment) {
      throw new AppointmentNotFoundError();
    }
    return appointment;
  }
}

/** The panel's appointments, by local days of the business. Any member can see them. */
@Injectable()
export class ListAppointments {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly timeZones: BusinessTimeZones,
  ) {}

  async execute(membership: MembershipSummary, query: AppointmentsQuery): Promise<Appointment[]> {
    const timeZone = await this.timeZones.timeZoneOf(membership);
    const { from, to } = localDaysInterval(query.from, query.days, timeZone);
    return this.appointments.listStartingBetween(membership.businessId, from, to);
  }
}
