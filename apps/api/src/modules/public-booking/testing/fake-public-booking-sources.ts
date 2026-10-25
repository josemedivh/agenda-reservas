import type {
  Appointment,
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
import { BusinessNotFoundError } from '../../businesses/domain/errors.js';
import type {
  AppointmentBook,
  AvailabilityReader,
  BusinessDirectory,
  CatalogReader,
  PublicBusinessRecord,
} from '../application/ports.js';

// One test double for every public booking port. Only used by unit tests.
export class FakePublicBookingSources
  implements BusinessDirectory, CatalogReader, AvailabilityReader, AppointmentBook
{
  services: Service[] = [];
  professionals: Professional[] = [];
  /** What the availability offers, by local date. */
  availability = new Map<string, DayAvailability>();
  /** Appointments already in the agenda (for "fewer appointments that day"). */
  busyToday: { professionalId: string }[] = [];
  /** Professionals someone else books at the same instant (their insert is refused). */
  bookedMeanwhile = new Set<string>();
  readonly recorded: AppointmentRequest[] = [];
  readonly saved = new Map<string, Appointment>();

  constructor(readonly business: PublicBusinessRecord) {}

  findBySlug(slug: string): Promise<PublicBusinessRecord> {
    return slug === this.business.slug
      ? Promise.resolve(this.business)
      : Promise.reject(new BusinessNotFoundError());
  }

  listServices(): Promise<Service[]> {
    return Promise.resolve(this.services);
  }

  listProfessionals(): Promise<Professional[]> {
    return Promise.resolve(this.professionals);
  }

  day(_scope: BusinessScope, query: { date: string }): Promise<DayAvailability> {
    return Promise.resolve(this.availability.get(query.date) ?? { date: query.date, slots: [] });
  }

  days(): Promise<DayAvailabilitySummary[]> {
    return Promise.resolve(
      [...this.availability.values()].map(({ date }) => ({ date, status: 'available' })),
    );
  }

  busy(): Promise<{ professionalId: string }[]> {
    return Promise.resolve(this.busyToday);
  }

  tryRecord(
    _scope: BusinessScope,
    request: AppointmentRequest,
  ): Promise<RecordedAppointment | null> {
    if (this.bookedMeanwhile.has(request.professionalId)) {
      return Promise.resolve(null);
    }
    this.recorded.push(request);
    const code = `code-${String(this.recorded.length)}`;
    const appointment: Appointment = {
      id: `appointment-${String(this.recorded.length)}`,
      professionalId: request.professionalId,
      serviceId: request.serviceId,
      serviceName: request.serviceName,
      priceCents: request.priceCents,
      startsAt: request.startsAt.toISOString(),
      endsAt: new Date(request.startsAt.getTime() + request.durationMinutes * 60_000).toISOString(),
      status: 'confirmed',
      source: request.source,
      customer: { id: 'customer-1', ...request.customer },
    };
    this.saved.set(code, appointment);
    return Promise.resolve({ appointment, code });
  }

  findByCode(_scope: BusinessScope, code: string): Promise<Appointment | null> {
    return Promise.resolve(this.saved.get(code) ?? null);
  }
}
