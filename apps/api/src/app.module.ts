import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { HealthController } from './health/health.controller.js';
import { AppointmentsModule } from './modules/appointments/appointments.module.js';
import { AvailabilityModule } from './modules/availability/availability.module.js';
import { BusinessesModule } from './modules/businesses/businesses.module.js';
import { CatalogModule } from './modules/catalog/catalog.module.js';
import { IdentityModule } from './modules/identity/identity.module.js';
import { PublicBookingModule } from './modules/public-booking/public-booking.module.js';
import { SchedulesModule } from './modules/schedules/schedules.module.js';

@Module({
  imports: [
    // Applied only where ThrottlerGuard is used (login, registration, the public booking page).
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 10 }],
      errorMessage: 'Demasiados intentos. Espera un minuto y vuelve a intentarlo.',
    }),
    IdentityModule,
    BusinessesModule,
    CatalogModule,
    SchedulesModule,
    AvailabilityModule,
    AppointmentsModule,
    PublicBookingModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
