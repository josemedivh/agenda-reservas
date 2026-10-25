import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { BusinessesModule } from '../businesses/businesses.module.js';
import { CatalogModule } from '../catalog/catalog.module.js';
import { IdentityModule } from '../identity/identity.module.js';
import { SchedulesModule } from '../schedules/schedules.module.js';
import { AvailabilityCalculator } from './application/availability-calculator.js';
import { GetAvailabilityDays, GetDayAvailability } from './application/availability.js';
import {
  AppointmentReader,
  BusinessTimeZones,
  CatalogReader,
  Clock,
  ScheduleReader,
} from './application/ports.js';
import {
  BusinessesModuleTimeZones,
  CatalogModuleReader,
  NoAppointmentsYet,
  SchedulesModuleReader,
  SystemClock,
} from './infrastructure/module-readers.js';
import { AvailabilityErrorFilter } from './presentation/availability-error.filter.js';
import { AvailabilityController } from './presentation/availability.controller.js';

/** Bookable times, computed from schedules, blocks and appointments (nothing is stored). */
@Module({
  imports: [IdentityModule, CatalogModule, SchedulesModule, BusinessesModule],
  controllers: [AvailabilityController],
  providers: [
    { provide: CatalogReader, useClass: CatalogModuleReader },
    { provide: ScheduleReader, useClass: SchedulesModuleReader },
    { provide: BusinessTimeZones, useClass: BusinessesModuleTimeZones },
    { provide: AppointmentReader, useClass: NoAppointmentsYet },
    { provide: Clock, useClass: SystemClock },
    { provide: APP_FILTER, useClass: AvailabilityErrorFilter },
    AvailabilityCalculator,
    GetDayAvailability,
    GetAvailabilityDays,
  ],
})
export class AvailabilityModule {}
