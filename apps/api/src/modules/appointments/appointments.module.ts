import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { DatabaseModule } from '../../database/database.module.js';
import { BusinessesModule } from '../businesses/businesses.module.js';
import { IdentityModule } from '../identity/identity.module.js';
import {
  FindAppointmentByCode,
  ListAppointments,
  ListBusyTimes,
  RecordAppointment,
} from './application/appointments.js';
import { AppointmentCodes, AppointmentRepository, BusinessTimeZones } from './application/ports.js';
import { BusinessesTimeZones } from './infrastructure/businesses-time-zones.js';
import { CryptoAppointmentCodes } from './infrastructure/crypto-appointment-codes.js';
import { PrismaAppointmentRepository } from './infrastructure/prisma-appointment.repository.js';
import { AppointmentErrorFilter } from './presentation/appointment-error.filter.js';
import { AppointmentsController } from './presentation/appointments.controller.js';

/** Appointments and the customers who book them. */
@Module({
  imports: [DatabaseModule, IdentityModule, BusinessesModule],
  controllers: [AppointmentsController],
  providers: [
    { provide: AppointmentRepository, useClass: PrismaAppointmentRepository },
    { provide: AppointmentCodes, useClass: CryptoAppointmentCodes },
    { provide: BusinessTimeZones, useClass: BusinessesTimeZones },
    { provide: APP_FILTER, useClass: AppointmentErrorFilter },
    RecordAppointment,
    ListBusyTimes,
    FindAppointmentByCode,
    ListAppointments,
  ],
  // Public API for other modules (availability reads busy times, the booking page books).
  exports: [RecordAppointment, ListBusyTimes, FindAppointmentByCode],
})
export class AppointmentsModule {}
