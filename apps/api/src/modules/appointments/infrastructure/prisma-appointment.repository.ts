import { Injectable } from '@nestjs/common';
import type { Appointment, AppointmentSource, AppointmentStatus } from '@turnero/shared';
import { TenantTransactionRunner } from '../../../database/tenant-transaction-runner.js';
import type { Prisma } from '../../../generated/prisma/client.js';
import {
  AppointmentSource as DbSource,
  AppointmentStatus as DbStatus,
} from '../../../generated/prisma/enums.js';
import { AppointmentRepository, type BusySpan, type NewAppointment } from '../application/ports.js';
import { AppointmentOverlapError } from '../domain/errors.js';

const STATUS_TO_DB: Record<AppointmentStatus, DbStatus> = {
  pending: DbStatus.PENDING,
  confirmed: DbStatus.CONFIRMED,
  cancelled: DbStatus.CANCELLED,
  completed: DbStatus.COMPLETED,
  no_show: DbStatus.NO_SHOW,
};
const STATUS_FROM_DB: Record<DbStatus, AppointmentStatus> = {
  [DbStatus.PENDING]: 'pending',
  [DbStatus.CONFIRMED]: 'confirmed',
  [DbStatus.CANCELLED]: 'cancelled',
  [DbStatus.COMPLETED]: 'completed',
  [DbStatus.NO_SHOW]: 'no_show',
};
const SOURCE_TO_DB: Record<AppointmentSource, DbSource> = {
  online: DbSource.ONLINE,
  manual: DbSource.MANUAL,
};
const SOURCE_FROM_DB: Record<DbSource, AppointmentSource> = {
  [DbSource.ONLINE]: 'online',
  [DbSource.MANUAL]: 'manual',
};

const APPOINTMENT_FIELDS = {
  id: true,
  professionalId: true,
  serviceId: true,
  serviceName: true,
  priceCents: true,
  startsAt: true,
  endsAt: true,
  status: true,
  source: true,
  customer: { select: { id: true, name: true, phone: true } },
} as const;

type AppointmentRow = Prisma.AppointmentGetPayload<{ select: typeof APPOINTMENT_FIELDS }>;

function toAppointment(row: AppointmentRow): Appointment {
  return {
    ...row,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    status: STATUS_FROM_DB[row.status],
    source: SOURCE_FROM_DB[row.source],
  };
}

/** The appointments_no_overlap exclusion constraint stopped a double booking. */
function isOverlap(error: unknown): boolean {
  return error instanceof Error && error.message.includes('appointments_no_overlap');
}

/** Not cancelled: these keep the professional busy. */
const OCCUPYING = { status: { not: DbStatus.CANCELLED } } as const;

@Injectable()
export class PrismaAppointmentRepository extends AppointmentRepository {
  constructor(private readonly tenants: TenantTransactionRunner) {
    super();
  }

  async create(businessId: string, appointment: NewAppointment): Promise<Appointment> {
    const { customer, status, source, ...fields } = appointment;
    try {
      return await this.tenants.run(businessId, async (tx) => {
        // Atomic even when the same new client books twice at once (unique business + phone).
        const [saved] = await tx.$queryRaw<{ id: string }[]>`
          INSERT INTO customers (business_id, name, phone, updated_at)
          VALUES (${businessId}::uuid, ${customer.name}, ${customer.phone}, now())
          ON CONFLICT (business_id, phone)
            DO UPDATE SET name = EXCLUDED.name, updated_at = EXCLUDED.updated_at
          RETURNING id`;
        if (!saved) {
          throw new Error('The customer was not saved.');
        }
        const row = await tx.appointment.create({
          data: {
            ...fields,
            businessId,
            customerId: saved.id,
            status: STATUS_TO_DB[status],
            source: SOURCE_TO_DB[source],
          },
          select: APPOINTMENT_FIELDS,
        });
        return toAppointment(row);
      });
    } catch (error) {
      if (isOverlap(error)) {
        throw new AppointmentOverlapError();
      }
      throw error;
    }
  }

  listBusy(businessId: string, from: Date, to: Date): Promise<BusySpan[]> {
    return this.tenants.run(businessId, (tx) =>
      tx.appointment.findMany({
        where: { businessId, ...OCCUPYING, startsAt: { lt: to }, busyUntil: { gt: from } },
        select: { professionalId: true, startsAt: true, busyUntil: true },
        orderBy: { startsAt: 'asc' },
      }),
    );
  }

  async listStartingBetween(businessId: string, from: Date, to: Date): Promise<Appointment[]> {
    const rows = await this.tenants.run(businessId, (tx) =>
      tx.appointment.findMany({
        where: { businessId, startsAt: { gte: from, lt: to } },
        select: APPOINTMENT_FIELDS,
        orderBy: [{ startsAt: 'asc' }, { createdAt: 'asc' }],
      }),
    );
    return rows.map(toAppointment);
  }

  async findByCodeHash(businessId: string, codeHash: string): Promise<Appointment | null> {
    const row = await this.tenants.run(businessId, (tx) =>
      tx.appointment.findFirst({ where: { businessId, codeHash }, select: APPOINTMENT_FIELDS }),
    );
    return row ? toAppointment(row) : null;
  }
}
