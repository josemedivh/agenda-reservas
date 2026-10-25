import { Injectable } from '@nestjs/common';
import {
  todayIn,
  type Appointment,
  type AvailabilityDaysQuery,
  type AvailabilityQuery,
  type BookingConfirmation,
  type BookingDetails,
  type BookingInput,
  type DayAvailability,
  type DayAvailabilitySummary,
  type Professional,
  type PublicBusiness,
} from '@turnero/shared';
import { DateTime } from 'luxon';
import { bookingCandidates } from '../domain/booking-candidates.js';
import { BookingNotFoundError, TimeNotAvailableError } from '../domain/errors.js';
import {
  AppointmentBook,
  AvailabilityReader,
  BusinessDirectory,
  CatalogReader,
  type PublicBusinessRecord,
} from './ports.js';

// What clients do on the business's public page, without an account. The business comes from
// its link (slug); a suspended or unknown one is simply not found.

function toBookingDetails(
  appointment: Appointment,
  business: PublicBusinessRecord,
  professionals: readonly Professional[],
): BookingDetails {
  const local = DateTime.fromISO(appointment.startsAt).setZone(business.timeZone);
  return {
    status: appointment.status,
    serviceName: appointment.serviceName,
    priceCents: appointment.priceCents,
    professionalName:
      professionals.find((professional) => professional.id === appointment.professionalId)?.name ??
      '',
    customerName: appointment.customer.name,
    startsAt: appointment.startsAt,
    endsAt: appointment.endsAt,
    date: local.toISODate() ?? '',
    time: local.toFormat('HH:mm'),
    business: {
      name: business.name,
      slug: business.slug,
      phone: business.phone,
      address: business.address,
    },
  };
}

/** The business, its bookable services and who performs them. */
@Injectable()
export class GetPublicBusiness {
  constructor(
    private readonly directory: BusinessDirectory,
    private readonly catalog: CatalogReader,
  ) {}

  async execute(slug: string): Promise<PublicBusiness> {
    const business = await this.directory.findBySlug(slug);
    const scope = { businessId: business.id };
    const [services, professionals] = await Promise.all([
      this.catalog.listServices(scope),
      this.catalog.listProfessionals(scope),
    ]);
    const active = new Set(
      professionals.filter((professional) => professional.active).map(({ id }) => id),
    );
    const bookable = services
      .filter((service) => service.active)
      .map((service) => ({
        id: service.id,
        name: service.name,
        durationMinutes: service.durationMinutes,
        priceCents: service.priceCents,
        professionalIds: service.professionalIds.filter((id) => active.has(id)),
      }))
      .filter((service) => service.professionalIds.length > 0);
    return {
      name: business.name,
      slug: business.slug,
      phone: business.phone,
      address: business.address,
      timeZone: business.timeZone,
      services: bookable,
      professionals: professionals
        .filter(({ id }) => bookable.some((service) => service.professionalIds.includes(id)))
        .map(({ id, name, color }) => ({ id, name, color })),
    };
  }
}

@Injectable()
export class GetPublicDayAvailability {
  constructor(
    private readonly directory: BusinessDirectory,
    private readonly availability: AvailabilityReader,
  ) {}

  async execute(slug: string, query: AvailabilityQuery): Promise<DayAvailability> {
    const business = await this.directory.findBySlug(slug);
    return this.availability.day({ businessId: business.id }, query);
  }
}

@Injectable()
export class GetPublicAvailabilityDays {
  constructor(
    private readonly directory: BusinessDirectory,
    private readonly availability: AvailabilityReader,
  ) {}

  async execute(slug: string, query: AvailabilityDaysQuery): Promise<DayAvailabilitySummary[]> {
    const business = await this.directory.findBySlug(slug);
    return this.availability.days({ businessId: business.id }, query);
  }
}

/**
 * Books an offered time. The availability is computed again right before saving (the page may
 * be minutes old); the database's exclusion constraint settles two bookings at the same instant.
 */
@Injectable()
export class BookAppointment {
  constructor(
    private readonly directory: BusinessDirectory,
    private readonly catalog: CatalogReader,
    private readonly availability: AvailabilityReader,
    private readonly book: AppointmentBook,
  ) {}

  async execute(slug: string, input: BookingInput): Promise<BookingConfirmation> {
    const business = await this.directory.findBySlug(slug);
    const scope = { businessId: business.id };
    const date = todayIn(business.timeZone, new Date(input.startsAt));
    // Also rejects inactive services and professionals who do not perform the service.
    const day = await this.availability.day(scope, {
      serviceId: input.serviceId,
      date,
      professionalId: input.professionalId,
    });
    const dayStart = DateTime.fromISO(date, { zone: business.timeZone }).startOf('day');
    const [services, professionals, busyThatDay] = await Promise.all([
      this.catalog.listServices(scope),
      this.catalog.listProfessionals(scope),
      this.book.busy(scope, dayStart.toJSDate(), dayStart.plus({ days: 1 }).toJSDate()),
    ]);
    const service = services.find((candidate) => candidate.id === input.serviceId);
    if (!service) {
      // The availability just found it: it can only have changed in between.
      throw new TimeNotAvailableError();
    }
    const candidates = bookingCandidates({
      slot: day.slots.find((slot) => slot.startsAt === input.startsAt),
      professionalId: input.professionalId,
      professionals,
      busyThatDay,
    });

    for (const professionalId of candidates) {
      const recorded = await this.book.tryRecord(scope, {
        professionalId,
        serviceId: service.id,
        serviceName: service.name,
        priceCents: service.priceCents,
        durationMinutes: service.durationMinutes,
        bufferMinutes: service.bufferMinutes,
        startsAt: new Date(input.startsAt),
        source: 'online',
        customer: { name: input.name, phone: input.phone },
      });
      if (recorded) {
        return {
          code: recorded.code,
          booking: toBookingDetails(recorded.appointment, business, professionals),
        };
      }
    }
    throw new TimeNotAvailableError();
  }
}

/** A booking seen through the code of the client's link. */
@Injectable()
export class GetBooking {
  constructor(
    private readonly directory: BusinessDirectory,
    private readonly catalog: CatalogReader,
    private readonly book: AppointmentBook,
  ) {}

  async execute(slug: string, code: string): Promise<BookingDetails> {
    const business = await this.directory.findBySlug(slug);
    const scope = { businessId: business.id };
    const appointment = await this.book.findByCode(scope, code);
    if (!appointment) {
      throw new BookingNotFoundError();
    }
    return toBookingDetails(appointment, business, await this.catalog.listProfessionals(scope));
  }
}
