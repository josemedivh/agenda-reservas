import { Injectable } from '@nestjs/common';
import type { Professional, ProfessionalInput } from '@turnero/shared';
import {
  TenantTransactionRunner,
  type TenantTransaction,
} from '../../../database/tenant-transaction-runner.js';
import { Prisma } from '../../../generated/prisma/client.js';
import { ProfessionalRepository } from '../application/ports.js';
import {
  ProfessionalLimitReachedError,
  ProfessionalNameTakenError,
  ProfessionalNotFoundError,
} from '../domain/errors.js';

const PROFESSIONAL_FIELDS = { id: true, name: true, color: true, active: true } as const;

/** Sorted in code so the order follows Spanish rules whatever the database collation is. */
function sortForDisplay(professionals: Professional[]): Professional[] {
  return [...professionals].sort(
    (a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name, 'es'),
  );
}

/** The only unique rule a professional can break is the active-name index. */
function asNameTaken(error: unknown): unknown {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
    ? new ProfessionalNameTakenError()
    : error;
}

@Injectable()
export class PrismaProfessionalRepository extends ProfessionalRepository {
  constructor(private readonly tenants: TenantTransactionRunner) {
    super();
  }

  /**
   * Serializes changes to the active set of one business, so two requests cannot both pass the
   * limit check.
   */
  private static async lockBusiness(tx: TenantTransaction, businessId: string): Promise<void> {
    await tx.$executeRaw`SELECT 1 FROM businesses WHERE id = ${businessId}::uuid FOR UPDATE`;
  }

  private static async assertSlotFree(tx: TenantTransaction, maxActive: number): Promise<void> {
    if ((await tx.professional.count({ where: { active: true } })) >= maxActive) {
      throw new ProfessionalLimitReachedError();
    }
  }

  async list(businessId: string): Promise<Professional[]> {
    const professionals = await this.tenants.run(businessId, (tx) =>
      tx.professional.findMany({ select: PROFESSIONAL_FIELDS }),
    );
    return sortForDisplay(professionals);
  }

  findById(businessId: string, professionalId: string): Promise<Professional | null> {
    return this.tenants.run(businessId, (tx) =>
      tx.professional.findUnique({ where: { id: professionalId }, select: PROFESSIONAL_FIELDS }),
    );
  }

  async create(
    businessId: string,
    input: ProfessionalInput,
    maxActive: number,
  ): Promise<Professional> {
    try {
      return await this.tenants.run(businessId, async (tx) => {
        await PrismaProfessionalRepository.lockBusiness(tx, businessId);
        await PrismaProfessionalRepository.assertSlotFree(tx, maxActive);
        return tx.professional.create({
          data: { businessId, ...input },
          select: PROFESSIONAL_FIELDS,
        });
      });
    } catch (error) {
      throw asNameTaken(error);
    }
  }

  async update(
    businessId: string,
    professionalId: string,
    input: ProfessionalInput,
  ): Promise<Professional> {
    try {
      return await this.tenants.run(businessId, async (tx) => {
        const updated = await tx.professional.updateManyAndReturn({
          where: { id: professionalId },
          data: input,
          select: PROFESSIONAL_FIELDS,
        });
        if (!updated[0]) {
          throw new ProfessionalNotFoundError();
        }
        return updated[0];
      });
    } catch (error) {
      throw asNameTaken(error);
    }
  }

  async setActive(
    businessId: string,
    professionalId: string,
    active: boolean,
    maxActive: number,
  ): Promise<Professional> {
    try {
      return await this.tenants.run(businessId, async (tx) => {
        await PrismaProfessionalRepository.lockBusiness(tx, businessId);
        const current = await tx.professional.findUnique({
          where: { id: professionalId },
          select: PROFESSIONAL_FIELDS,
        });
        if (!current) {
          throw new ProfessionalNotFoundError();
        }
        if (active && !current.active) {
          await PrismaProfessionalRepository.assertSlotFree(tx, maxActive);
        }
        return tx.professional.update({
          where: { id: professionalId },
          data: { active },
          select: PROFESSIONAL_FIELDS,
        });
      });
    } catch (error) {
      throw asNameTaken(error);
    }
  }
}
