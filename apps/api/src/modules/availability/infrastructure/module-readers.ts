import { Injectable } from '@nestjs/common';
import type {
  Block,
  BusinessScope,
  Professional,
  ProfessionalSchedule,
  Service,
} from '@turnero/shared';
import { ListBusyTimes } from '../../appointments/application/appointments.js';
import { GetBusinessProfile } from '../../businesses/application/public-business.js';
import { ListProfessionals } from '../../catalog/application/professionals.js';
import { GetService } from '../../catalog/application/services.js';
import { ServiceNotFoundError } from '../../catalog/domain/errors.js';
import { ListBlocks } from '../../schedules/application/blocks.js';
import { ListWorkingHours } from '../../schedules/application/working-hours.js';
import {
  AppointmentReader,
  BusinessTimeZones,
  CatalogReader,
  Clock,
  ScheduleReader,
  type BusyInterval,
} from '../application/ports.js';

// Adapters over the public use cases of the modules that own the data (no shared tables).

@Injectable()
export class CatalogModuleReader extends CatalogReader {
  constructor(
    private readonly getService: GetService,
    private readonly listProfessionalsUseCase: ListProfessionals,
  ) {
    super();
  }

  async findService(scope: BusinessScope, serviceId: string): Promise<Service | null> {
    try {
      return await this.getService.execute(scope, serviceId);
    } catch (error) {
      if (error instanceof ServiceNotFoundError) {
        return null;
      }
      throw error;
    }
  }

  listProfessionals(scope: BusinessScope): Promise<Professional[]> {
    return this.listProfessionalsUseCase.execute(scope);
  }
}

@Injectable()
export class SchedulesModuleReader extends ScheduleReader {
  constructor(
    private readonly listWorkingHours: ListWorkingHours,
    private readonly listBlocks: ListBlocks,
  ) {
    super();
  }

  workingHours(scope: BusinessScope): Promise<ProfessionalSchedule[]> {
    return this.listWorkingHours.execute(scope);
  }

  upcomingBlocks(scope: BusinessScope): Promise<Block[]> {
    return this.listBlocks.execute(scope);
  }
}

@Injectable()
export class BusinessesModuleTimeZones extends BusinessTimeZones {
  constructor(private readonly getBusinessProfile: GetBusinessProfile) {
    super();
  }

  async timeZoneOf(scope: BusinessScope): Promise<string> {
    return (await this.getBusinessProfile.execute(scope)).timeZone;
  }
}

@Injectable()
export class AppointmentsModuleReader extends AppointmentReader {
  constructor(private readonly listBusyTimes: ListBusyTimes) {
    super();
  }

  async busyIntervals(scope: BusinessScope, from: Date, to: Date): Promise<BusyInterval[]> {
    const busy = await this.listBusyTimes.execute(scope, from, to);
    return busy.map(({ professionalId, startsAt, busyUntil }) => ({
      professionalId,
      startsAt,
      endsAt: busyUntil,
    }));
  }
}

@Injectable()
export class SystemClock extends Clock {
  now(): Date {
    return new Date();
  }
}
