import { Injectable } from '@nestjs/common';
import type {
  Block,
  MembershipSummary,
  Professional,
  ProfessionalSchedule,
  Service,
} from '@turnero/shared';
import { GetBusiness } from '../../businesses/application/get-business.js';
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

  async findService(membership: MembershipSummary, serviceId: string): Promise<Service | null> {
    try {
      return await this.getService.execute(membership, serviceId);
    } catch (error) {
      if (error instanceof ServiceNotFoundError) {
        return null;
      }
      throw error;
    }
  }

  listProfessionals(membership: MembershipSummary): Promise<Professional[]> {
    return this.listProfessionalsUseCase.execute(membership);
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

  workingHours(membership: MembershipSummary): Promise<ProfessionalSchedule[]> {
    return this.listWorkingHours.execute(membership);
  }

  upcomingBlocks(membership: MembershipSummary): Promise<Block[]> {
    return this.listBlocks.execute(membership);
  }
}

@Injectable()
export class BusinessesModuleTimeZones extends BusinessTimeZones {
  constructor(private readonly getBusiness: GetBusiness) {
    super();
  }

  async timeZoneOf(membership: MembershipSummary): Promise<string> {
    return (await this.getBusiness.execute(membership)).timeZone;
  }
}

/**
 * Appointments do not exist yet: they arrive with bookings (step 8), which will replace this
 * adapter with one that reads them. Until then nobody is busy.
 */
@Injectable()
export class NoAppointmentsYet extends AppointmentReader {
  busyIntervals(): Promise<BusyInterval[]> {
    return Promise.resolve([]);
  }
}

@Injectable()
export class SystemClock extends Clock {
  now(): Date {
    return new Date();
  }
}
