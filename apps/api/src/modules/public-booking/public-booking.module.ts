import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AppointmentsModule } from '../appointments/appointments.module.js';
import { AvailabilityModule } from '../availability/availability.module.js';
import { BusinessesModule } from '../businesses/businesses.module.js';
import { CatalogModule } from '../catalog/catalog.module.js';
import {
  AppointmentBook,
  AvailabilityReader,
  BusinessDirectory,
  CatalogReader,
} from './application/ports.js';
import {
  BookAppointment,
  GetBooking,
  GetPublicAvailabilityDays,
  GetPublicBusiness,
  GetPublicDayAvailability,
} from './application/public-booking.js';
import {
  AppointmentsModuleBook,
  AvailabilityModuleReader,
  BusinessesModuleDirectory,
  CatalogModuleReader,
} from './infrastructure/module-adapters.js';
import { PublicBookingErrorFilter } from './presentation/public-booking-error.filter.js';
import { PublicBookingController } from './presentation/public-booking.controller.js';

/** What clients see and do on a business's public page, without an account. */
@Module({
  imports: [BusinessesModule, CatalogModule, AvailabilityModule, AppointmentsModule],
  controllers: [PublicBookingController],
  providers: [
    { provide: BusinessDirectory, useClass: BusinessesModuleDirectory },
    { provide: CatalogReader, useClass: CatalogModuleReader },
    { provide: AvailabilityReader, useClass: AvailabilityModuleReader },
    { provide: AppointmentBook, useClass: AppointmentsModuleBook },
    { provide: APP_FILTER, useClass: PublicBookingErrorFilter },
    GetPublicBusiness,
    GetPublicDayAvailability,
    GetPublicAvailabilityDays,
    BookAppointment,
    GetBooking,
  ],
})
export class PublicBookingModule {}
