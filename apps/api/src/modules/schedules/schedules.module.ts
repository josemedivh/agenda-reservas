import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { DatabaseModule } from '../../database/database.module.js';
import { BusinessesModule } from '../businesses/businesses.module.js';
import { CatalogModule } from '../catalog/catalog.module.js';
import { IdentityModule } from '../identity/identity.module.js';
import { CreateBlock, DeleteBlock, ListBlocks } from './application/blocks.js';
import {
  BlockRepository,
  BusinessTimeZones,
  Clock,
  ProfessionalDirectory,
  WorkingHoursRepository,
} from './application/ports.js';
import {
  GetProfessionalWorkingHours,
  ListWorkingHours,
  ReplaceProfessionalWorkingHours,
} from './application/working-hours.js';
import { BusinessesTimeZones } from './infrastructure/businesses-time-zones.js';
import { CatalogProfessionalDirectory } from './infrastructure/catalog-professional-directory.js';
import { PrismaBlockRepository } from './infrastructure/prisma-block.repository.js';
import { PrismaWorkingHoursRepository } from './infrastructure/prisma-working-hours.repository.js';
import { SystemClock } from './infrastructure/system-clock.js';
import { BlocksController } from './presentation/blocks.controller.js';
import { ScheduleErrorFilter } from './presentation/schedule-error.filter.js';
import { WorkingHoursController } from './presentation/working-hours.controller.js';

/** When professionals attend: weekly working hours and blocked times. */
@Module({
  imports: [DatabaseModule, IdentityModule, CatalogModule, BusinessesModule],
  controllers: [WorkingHoursController, BlocksController],
  providers: [
    { provide: WorkingHoursRepository, useClass: PrismaWorkingHoursRepository },
    { provide: ProfessionalDirectory, useClass: CatalogProfessionalDirectory },
    { provide: BlockRepository, useClass: PrismaBlockRepository },
    { provide: BusinessTimeZones, useClass: BusinessesTimeZones },
    { provide: Clock, useClass: SystemClock },
    { provide: APP_FILTER, useClass: ScheduleErrorFilter },
    ListWorkingHours,
    GetProfessionalWorkingHours,
    ReplaceProfessionalWorkingHours,
    ListBlocks,
    CreateBlock,
    DeleteBlock,
  ],
})
export class SchedulesModule {}
