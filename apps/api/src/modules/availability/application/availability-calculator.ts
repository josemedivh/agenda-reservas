import { Injectable } from '@nestjs/common';
import type { DayAvailability, BusinessScope, Professional, Service } from '@turnero/shared';
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

  private async bookableService(scope: BusinessScope, serviceId: string): Promise<Service> {
    const service = await this.catalog.findService(scope, serviceId);
    if (!service?.active) {
      throw new ServiceNotBookableError();
    }
    return service;
  }

  private async performers(
    scope: BusinessScope,
    service: Service,
    professionalId: string | null,
  ): Promise<Professional[]> {
    const performers = (await this.catalog.listProfessionals(scope)).filter(
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

  async compute(scope: BusinessScope, request: AvailabilityRequest): Promise<DayAvailability[]> {
    const service = await this.bookableService(scope, request.serviceId);
    const professionals = await this.performers(scope, service, request.professionalId);
    const [timeZone, schedules, blocks] = await Promise.all([
      this.timeZones.timeZoneOf(scope),
      this.schedules.workingHours(scope),
      this.schedules.upcomingBlocks(scope),
    ]);
    const first = request.dates[0] ?? '';
    const last = request.dates.at(-1) ?? first;
    const busy = await this.appointments.busyIntervals(
      scope,
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
