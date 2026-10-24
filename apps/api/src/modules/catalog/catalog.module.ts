import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { DatabaseModule } from '../../database/database.module.js';
import { IdentityModule } from '../identity/identity.module.js';
import { ProfessionalRepository } from './application/ports.js';
import {
  CreateProfessional,
  GetProfessional,
  ListProfessionals,
  SetProfessionalActive,
  UpdateProfessional,
} from './application/professionals.js';
import { PrismaProfessionalRepository } from './infrastructure/prisma-professional.repository.js';
import { CatalogErrorFilter } from './presentation/catalog-error.filter.js';
import { ProfessionalsController } from './presentation/professionals.controller.js';

/** What a business offers: professionals (and, next, services). */
@Module({
  imports: [DatabaseModule, IdentityModule],
  controllers: [ProfessionalsController],
  providers: [
    { provide: ProfessionalRepository, useClass: PrismaProfessionalRepository },
    { provide: APP_FILTER, useClass: CatalogErrorFilter },
    ListProfessionals,
    GetProfessional,
    CreateProfessional,
    UpdateProfessional,
    SetProfessionalActive,
  ],
})
export class CatalogModule {}
