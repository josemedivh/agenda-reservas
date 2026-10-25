import { Injectable } from '@nestjs/common';
import type { DayAvailability, MembershipSummary, Professional, Service } from '@turnero/shared';
import { DateTime } from 'luxon';
import { ProfessionalNotForServiceError, ServiceNotBookableError } from '../domain/errors.js';
import { availableSlots, type Interval, type ProfessionalDay } from '../domain/slots.js';
import {
  AppointmentReader,
  BusinessTimeZones,
  CatalogReader,
  Clock,
  ScheduleReader,
} from './ports.js';

export interface AvailabilityRequest {
  serviceId: string;
  /** Null: every active professional who performs the service. */
  professionalId: string | null;
  /** Local dates, ascending. */
  dates: string[];
}

/** Loads the data once and computes the slots of one or several days. */
@Injectable()
export class AvailabilityCalculator {
  constructor(
    private readonly catalog: CatalogReader,
    private readonly schedules: ScheduleReader,
    private readonly timeZones: BusinessTimeZones,
    private readonly appointments: AppointmentReader,
    private readonly clock: Clock,
  ) {}

  private async bookableService(
    membership: MembershipSummary,
    serviceId: string,
  ): Promise<Service> {
    const service = await this.catalog.findService(membership, serviceId);
    if (!service?.active) {
      throw new ServiceNotBookableError();
    }
    return service;
  }

  private async performers(
    membership: MembershipSummary,
    service: Service,
    professionalId: string | null,
  ): Promise<Professional[]> {
    const performers = (await this.catalog.listProfessionals(membership)).filter(
      (professional) => professional.active && service.professionalIds.includes(professional.id),
    );
    if (professionalId === null) {
      return performers;
    }
    const chosen = performers.filter((professional) => professional.id === professionalId);
    if (chosen.length === 0) {
      throw new ProfessionalNotForServiceError();
    }
    return chosen;
  }

  async compute(
    membership: MembershipSummary,
    request: AvailabilityRequest,
  ): Promise<DayAvailability[]> {
    const service = await this.bookableService(membership, request.serviceId);
    const professionals = await this.performers(membership, service, request.professionalId);
    const [timeZone, schedules, blocks] = await Promise.all([
      this.timeZones.timeZoneOf(membership),
      this.schedules.workingHours(membership),
      this.schedules.upcomingBlocks(membership),
    ]);
    const first = request.dates[0] ?? '';
    const last = request.dates.at(-1) ?? first;
    const busy = await this.appointments.busyIntervals(
      membership,
      DateTime.fromISO(first, { zone: timeZone }).startOf('day').toJSDate(),
      DateTime.fromISO(last, { zone: timeZone }).plus({ days: 1 }).startOf('day').toJSDate(),
    );

    const days: ProfessionalDay[] = professionals.map(({ id }) => ({
      professionalId: id,
      ranges: schedules.find((schedule) => schedule.professionalId === id)?.ranges ?? [],
      blocks: blocks
        .filter((block) => block.professionalId === null || block.professionalId === id)
        .map((block): Interval => ({
          startsAt: new Date(block.startsAt),
          endsAt: new Date(block.endsAt),
        })),
      busy: busy.filter((interval) => interval.professionalId === id),
    }));
    const now = this.clock.now();

    return request.dates.map((date) => ({
      date,
      slots: availableSlots({
        date,
        timeZone,
        now,
        durationMinutes: service.durationMinutes,
        bufferMinutes: service.bufferMinutes,
        professionals: days,
      }),
    }));
  }
}
