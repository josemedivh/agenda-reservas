import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { DatabaseModule } from '../../database/database.module.js';
import { IdentityModule } from '../identity/identity.module.js';
import { CheckSlugAvailability } from './application/check-slug-availability.js';
import { CreateBusiness } from './application/create-business.js';
import { FreeSlugFinder } from './application/free-slug-finder.js';
import { GetBusiness } from './application/get-business.js';
import { BusinessRepository } from './application/ports.js';
import { UpdateBusinessDetails } from './application/update-business-details.js';
import { PrismaBusinessRepository } from './infrastructure/prisma-business.repository.js';
import { BusinessErrorFilter } from './presentation/business-error.filter.js';
import { BusinessesController } from './presentation/businesses.controller.js';

/** Business creation and details (name, public link, phone, address, time zone). */
@Module({
  imports: [DatabaseModule, IdentityModule],
  controllers: [BusinessesController],
  providers: [
    { provide: BusinessRepository, useClass: PrismaBusinessRepository },
    { provide: APP_FILTER, useClass: BusinessErrorFilter },
    FreeSlugFinder,
    CreateBusiness,
    CheckSlugAvailability,
    GetBusiness,
    UpdateBusinessDetails,
  ],
})
export class BusinessesModule {}
