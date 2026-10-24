import { Injectable } from '@nestjs/common';
import type { ProfessionalSchedule, WorkingRange } from '@turnero/shared';
import { TenantTransactionRunner } from '../../../database/tenant-transaction-runner.js';
import { Prisma } from '../../../generated/prisma/client.js';
import { WorkingHoursRepository } from '../application/ports.js';
import { InvalidScheduleDataError, UnknownProfessionalError } from '../domain/errors.js';

const RANGE_FIELDS = { weekday: true, startMinute: true, endMinute: true } as const;
const ORDER = [{ weekday: 'asc' }, { startMinute: 'asc' }] as const;

function translateError(error: unknown): unknown {
  // Composite foreign key: the professional is not from this business.
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
    return new UnknownProfessionalError();
  }
  // The exclusion constraint only fires if validation was skipped (e.g. a concurrent save).
  if (error instanceof Error && error.message.includes('working_hours_no_overlap')) {
    return new InvalidScheduleDataError('Hay turnos que se cruzan.', 'ranges');
  }
  return error;
}

@Injectable()
export class PrismaWorkingHoursRepository extends WorkingHoursRepository {
  constructor(private readonly tenants: TenantTransactionRunner) {
    super();
  }

  async listByBusiness(businessId: string): Promise<ProfessionalSchedule[]> {
    const rows = await this.tenants.run(businessId, (tx) =>
      tx.workingHours.findMany({
        select: { professionalId: true, ...RANGE_FIELDS },
        orderBy: [...ORDER],
      }),
    );
    const byProfessional = new Map<string, WorkingRange[]>();
    for (const { professionalId, ...range } of rows) {
      byProfessional.set(professionalId, [...(byProfessional.get(professionalId) ?? []), range]);
    }
    return [...byProfessional].map(([professionalId, ranges]) => ({ professionalId, ranges }));
  }

  findForProfessional(businessId: string, professionalId: string): Promise<WorkingRange[]> {
    return this.tenants.run(businessId, (tx) =>
      tx.workingHours.findMany({
        where: { professionalId },
        select: RANGE_FIELDS,
        orderBy: [...ORDER],
      }),
    );
  }

  async replaceForProfessional(
    businessId: string,
    professionalId: string,
    ranges: WorkingRange[],
  ): Promise<WorkingRange[]> {
    try {
      await this.tenants.run(businessId, async (tx) => {
        await tx.workingHours.deleteMany({ where: { professionalId } });
        await tx.workingHours.createMany({
          data: ranges.map((range) => ({ businessId, professionalId, ...range })),
        });
      });
    } catch (error) {
      throw translateError(error);
    }
    return ranges;
  }
}
