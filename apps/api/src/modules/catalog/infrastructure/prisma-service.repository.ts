import { Injectable } from '@nestjs/common';
import type { Service, ServiceInput } from '@turnero/shared';
import {
  TenantTransactionRunner,
  type TenantTransaction,
} from '../../../database/tenant-transaction-runner.js';
import { Prisma } from '../../../generated/prisma/client.js';
import { ServiceRepository } from '../application/ports.js';
import {
  InvalidCatalogDataError,
  ServiceNameTakenError,
  ServiceNotFoundError,
} from '../domain/errors.js';

const SERVICE_FIELDS = {
  id: true,
  name: true,
  durationMinutes: true,
  priceCents: true,
  bufferMinutes: true,
  active: true,
  professionals: { select: { professionalId: true }, orderBy: { professionalId: 'asc' } },
} as const;

type ServiceRow = Prisma.ServiceGetPayload<{ select: typeof SERVICE_FIELDS }>;

function toService({ professionals, ...service }: ServiceRow): Service {
  return { ...service, professionalIds: professionals.map(({ professionalId }) => professionalId) };
}

/** Sorted in code so the order follows Spanish rules whatever the database collation is. */
function sortForDisplay(services: Service[]): Service[] {
  return [...services].sort(
    (a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name, 'es'),
  );
}

function translateError(error: unknown): unknown {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // The only unique rule a service can break is the active-name index.
    if (error.code === 'P2002') {
      return new ServiceNameTakenError();
    }
    // Composite foreign key: the professional is not from this business.
    if (error.code === 'P2003') {
      return new InvalidCatalogDataError(
        'Elige profesionales activos de tu negocio.',
        'professionalIds',
      );
    }
  }
  return error;
}

@Injectable()
export class PrismaServiceRepository extends ServiceRepository {
  constructor(private readonly tenants: TenantTransactionRunner) {
    super();
  }

  private static async assign(
    tx: TenantTransaction,
    businessId: string,
    serviceId: string,
    professionalIds: readonly string[],
  ): Promise<void> {
    await tx.serviceProfessional.deleteMany({ where: { serviceId } });
    await tx.serviceProfessional.createMany({
      data: professionalIds.map((professionalId) => ({ businessId, serviceId, professionalId })),
    });
  }

  async list(businessId: string): Promise<Service[]> {
    const rows = await this.tenants.run(businessId, (tx) =>
      tx.service.findMany({ select: SERVICE_FIELDS }),
    );
    return sortForDisplay(rows.map(toService));
  }

  async findById(businessId: string, serviceId: string): Promise<Service | null> {
    const row = await this.tenants.run(businessId, (tx) =>
      tx.service.findUnique({ where: { id: serviceId }, select: SERVICE_FIELDS }),
    );
    return row ? toService(row) : null;
  }

  async create(businessId: string, input: ServiceInput): Promise<Service> {
    const { professionalIds, ...details } = input;
    try {
      const row = await this.tenants.run(businessId, async (tx) => {
        const { id } = await tx.service.create({
          data: { businessId, ...details },
          select: { id: true },
        });
        await PrismaServiceRepository.assign(tx, businessId, id, professionalIds);
        return tx.service.findUniqueOrThrow({ where: { id }, select: SERVICE_FIELDS });
      });
      return toService(row);
    } catch (error) {
      throw translateError(error);
    }
  }

  async update(businessId: string, serviceId: string, input: ServiceInput): Promise<Service> {
    const { professionalIds, ...details } = input;
    try {
      const row = await this.tenants.run(businessId, async (tx) => {
        const { count } = await tx.service.updateMany({ where: { id: serviceId }, data: details });
        if (count === 0) {
          throw new ServiceNotFoundError();
        }
        await PrismaServiceRepository.assign(tx, businessId, serviceId, professionalIds);
        return tx.service.findUniqueOrThrow({ where: { id: serviceId }, select: SERVICE_FIELDS });
      });
      return toService(row);
    } catch (error) {
      throw translateError(error);
    }
  }

  async setActive(businessId: string, serviceId: string, active: boolean): Promise<Service> {
    try {
      const row = await this.tenants.run(businessId, async (tx) => {
        const { count } = await tx.service.updateMany({
          where: { id: serviceId },
          data: { active },
        });
        if (count === 0) {
          throw new ServiceNotFoundError();
        }
        return tx.service.findUniqueOrThrow({ where: { id: serviceId }, select: SERVICE_FIELDS });
      });
      return toService(row);
    } catch (error) {
      throw translateError(error);
    }
  }
}
