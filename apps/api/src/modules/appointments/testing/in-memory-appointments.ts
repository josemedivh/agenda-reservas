import { randomUUID } from 'node:crypto';
import type { Appointment } from '@turnero/shared';
import {
  AppointmentCodes,
  AppointmentRepository,
  BusinessTimeZones,
  type BusySpan,
  type IssuedAppointmentCode,
  type NewAppointment,
} from '../application/ports.js';
import { AppointmentOverlapError } from '../domain/errors.js';

interface StoredAppointment {
  businessId: string;
  codeHash: string;
  busyUntil: Date;
  appointment: Appointment;
}

// Test doubles for the appointments ports. Only used by unit tests.

export class InMemoryAppointmentRepository extends AppointmentRepository {
  readonly stored: StoredAppointment[] = [];
  /** Customers by business and phone, like the unique index. */
  readonly customers = new Map<string, { id: string; name: string; phone: string }>();

  create(businessId: string, appointment: NewAppointment): Promise<Appointment> {
    const overlaps = this.stored.some(
      (other) =>
        other.businessId === businessId &&
        other.appointment.professionalId === appointment.professionalId &&
        other.appointment.status !== 'cancelled' &&
        new Date(other.appointment.startsAt) < appointment.busyUntil &&
        appointment.startsAt < other.busyUntil,
    );
    if (overlaps) {
      return Promise.reject(new AppointmentOverlapError());
    }
    const key = `${businessId}:${appointment.customer.phone}`;
    const customer = {
      ...(this.customers.get(key) ?? { id: randomUUID() }),
      ...appointment.customer,
    };
    this.customers.set(key, customer);
    const created: Appointment = {
      id: randomUUID(),
      professionalId: appointment.professionalId,
      serviceId: appointment.serviceId,
      serviceName: appointment.serviceName,
      priceCents: appointment.priceCents,
      startsAt: appointment.startsAt.toISOString(),
      endsAt: appointment.endsAt.toISOString(),
      status: appointment.status,
      source: appointment.source,
      customer,
    };
    this.stored.push({
      businessId,
      codeHash: appointment.codeHash,
      busyUntil: appointment.busyUntil,
      appointment: created,
    });
    return Promise.resolve(created);
  }

  listBusy(businessId: string, from: Date, to: Date): Promise<BusySpan[]> {
    return Promise.resolve(
      this.stored
        .filter(
          (entry) =>
            entry.businessId === businessId &&
            entry.appointment.status !== 'cancelled' &&
            new Date(entry.appointment.startsAt) < to &&
            entry.busyUntil > from,
        )
        .map((entry) => ({
          professionalId: entry.appointment.professionalId,
          startsAt: new Date(entry.appointment.startsAt),
          busyUntil: entry.busyUntil,
        })),
    );
  }

  listStartingBetween(businessId: string, from: Date, to: Date): Promise<Appointment[]> {
    return Promise.resolve(
      this.stored
        .filter((entry) => {
          const startsAt = new Date(entry.appointment.startsAt);
          return entry.businessId === businessId && startsAt >= from && startsAt < to;
        })
        .map((entry) => entry.appointment)
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    );
  }

  findByCodeHash(businessId: string, codeHash: string): Promise<Appointment | null> {
    return Promise.resolve(
      this.stored.find((entry) => entry.businessId === businessId && entry.codeHash === codeHash)
        ?.appointment ?? null,
    );
  }
}

/** Predictable codes: "code-1", "code-2"… stored as "hash:code-1". */
export class SequentialAppointmentCodes extends AppointmentCodes {
  private issued = 0;

  issue(): IssuedAppointmentCode {
    this.issued += 1;
    const code = `code-${String(this.issued)}`;
    return { code, codeHash: this.hashOf(code) };
  }

  hashOf(code: string): string {
    return `hash:${code}`;
  }
}

export class FixedTimeZones extends BusinessTimeZones {
  constructor(private readonly zone: string) {
    super();
  }

  timeZoneOf(): Promise<string> {
    return Promise.resolve(this.zone);
  }
}
