import { Injectable } from '@nestjs/common';
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
import {
  FindAppointmentByCode,
  ListBusyTimes,
  RecordAppointment,
  type AppointmentRequest,
  type RecordedAppointment,
} from '../../appointments/application/appointments.js';
import {
  AppointmentNotFoundError,
  AppointmentOverlapError,
} from '../../appointments/domain/errors.js';
import {
  GetAvailabilityDays,
  GetDayAvailability,
} from '../../availability/application/availability.js';
import { FindActiveBusinessBySlug } from '../../businesses/application/public-business.js';
import { ListProfessionals } from '../../catalog/application/professionals.js';
import { ListServices } from '../../catalog/application/services.js';
import {
  AppointmentBook,
  AvailabilityReader,
  BusinessDirectory,
  CatalogReader,
  type PublicBusinessRecord,
} from '../application/ports.js';

// Adapters over the public use cases of the modules that own the data (no shared tables).

@Injectable()
export class BusinessesModuleDirectory extends BusinessDirectory {
  constructor(private readonly findActiveBusinessBySlug: FindActiveBusinessBySlug) {
    super();
  }

  async findBySlug(slug: string): Promise<PublicBusinessRecord> {
    const { id, name, phone, address, timeZone } =
      await this.findActiveBusinessBySlug.execute(slug);
    return { id, name, slug, phone, address, timeZone };
  }
}

@Injectable()
export class CatalogModuleReader extends CatalogReader {
  constructor(
    private readonly listServicesUseCase: ListServices,
    private readonly listProfessionalsUseCase: ListProfessionals,
  ) {
    super();
  }

  listServices(scope: BusinessScope): Promise<Service[]> {
    return this.listServicesUseCase.execute(scope);
  }

  listProfessionals(scope: BusinessScope): Promise<Professional[]> {
    return this.listProfessionalsUseCase.execute(scope);
  }
}

@Injectable()
export class AvailabilityModuleReader extends AvailabilityReader {
  constructor(
    private readonly getDayAvailability: GetDayAvailability,
    private readonly getAvailabilityDays: GetAvailabilityDays,
  ) {
    super();
  }

  day(scope: BusinessScope, query: AvailabilityQuery): Promise<DayAvailability> {
    return this.getDayAvailability.execute(scope, query);
  }

  days(scope: BusinessScope, query: AvailabilityDaysQuery): Promise<DayAvailabilitySummary[]> {
    return this.getAvailabilityDays.execute(scope, query);
  }
}

@Injectable()
export class AppointmentsModuleBook extends AppointmentBook {
  constructor(
    private readonly listBusyTimes: ListBusyTimes,
    private readonly recordAppointment: RecordAppointment,
    private readonly findAppointmentByCode: FindAppointmentByCode,
  ) {
    super();
  }

  busy(scope: BusinessScope, from: Date, to: Date): Promise<{ professionalId: string }[]> {
    return this.listBusyTimes.execute(scope, from, to);
  }

  async tryRecord(
    scope: BusinessScope,
    request: AppointmentRequest,
  ): Promise<RecordedAppointment | null> {
    try {
      return await this.recordAppointment.execute(scope, request);
    } catch (error) {
      if (error instanceof AppointmentOverlapError) {
        return null;
      }
      throw error;
    }
  }

  async findByCode(scope: BusinessScope, code: string): Promise<Appointment | null> {
    try {
      return await this.findAppointmentByCode.execute(scope, code);
    } catch (error) {
      if (error instanceof AppointmentNotFoundError) {
        return null;
      }
      throw error;
    }
  }
}
