import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { DatabaseModule } from '../../database/database.module.js';
import { CatalogModule } from '../catalog/catalog.module.js';
import { IdentityModule } from '../identity/identity.module.js';
import { ProfessionalDirectory, WorkingHoursRepository } from './application/ports.js';
import {
  GetProfessionalWorkingHours,
  ListWorkingHours,
  ReplaceProfessionalWorkingHours,
} from './application/working-hours.js';
import { CatalogProfessionalDirectory } from './infrastructure/catalog-professional-directory.js';
import { PrismaWorkingHoursRepository } from './infrastructure/prisma-working-hours.repository.js';
import { ScheduleErrorFilter } from './presentation/schedule-error.filter.js';
import { WorkingHoursController } from './presentation/working-hours.controller.js';

/** When professionals attend: weekly working hours (and, next, blocked times). */
@Module({
  imports: [DatabaseModule, IdentityModule, CatalogModule],
  controllers: [WorkingHoursController],
  providers: [
    { provide: WorkingHoursRepository, useClass: PrismaWorkingHoursRepository },
    { provide: ProfessionalDirectory, useClass: CatalogProfessionalDirectory },
    { provide: APP_FILTER, useClass: ScheduleErrorFilter },
    ListWorkingHours,
    GetProfessionalWorkingHours,
    ReplaceProfessionalWorkingHours,
  ],
})
export class SchedulesModule {}
