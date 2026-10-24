import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { DatabaseModule } from '../../database/database.module.js';
import { IdentityModule } from '../identity/identity.module.js';
import { ProfessionalRepository, ServiceRepository } from './application/ports.js';
import {
  CreateProfessional,
  GetProfessional,
  ListProfessionals,
  SetProfessionalActive,
  UpdateProfessional,
} from './application/professionals.js';
import {
  CreateService,
  GetService,
  ListServices,
  SetServiceActive,
  UpdateService,
} from './application/services.js';
import { PrismaProfessionalRepository } from './infrastructure/prisma-professional.repository.js';
import { PrismaServiceRepository } from './infrastructure/prisma-service.repository.js';
import { CatalogErrorFilter } from './presentation/catalog-error.filter.js';
import { ProfessionalsController } from './presentation/professionals.controller.js';
import { ServicesController } from './presentation/services.controller.js';

/** What a business offers: its professionals and services, and who performs each service. */
@Module({
  imports: [DatabaseModule, IdentityModule],
  controllers: [ProfessionalsController, ServicesController],
  providers: [
    { provide: ProfessionalRepository, useClass: PrismaProfessionalRepository },
    { provide: ServiceRepository, useClass: PrismaServiceRepository },
    { provide: APP_FILTER, useClass: CatalogErrorFilter },
    ListProfessionals,
    GetProfessional,
    CreateProfessional,
    UpdateProfessional,
    SetProfessionalActive,
    ListServices,
    GetService,
    CreateService,
    UpdateService,
    SetServiceActive,
  ],
  // Public API for other modules (e.g. schedules checks that a professional exists).
  exports: [GetProfessional],
})
export class CatalogModule {}
