import { Injectable } from '@nestjs/common';
import type { Block } from '@turnero/shared';
import { TenantTransactionRunner } from '../../../database/tenant-transaction-runner.js';
import { Prisma } from '../../../generated/prisma/client.js';
import { BlockRepository, type NewBlock } from '../application/ports.js';
import { UnknownProfessionalError } from '../domain/errors.js';

const BLOCK_FIELDS = {
  id: true,
  professionalId: true,
  startsAt: true,
  endsAt: true,
  reason: true,
} as const;

type BlockRow = Prisma.BlockGetPayload<{ select: typeof BLOCK_FIELDS }>;

function toBlock(row: BlockRow): Block {
  return { ...row, startsAt: row.startsAt.toISOString(), endsAt: row.endsAt.toISOString() };
}

@Injectable()
export class PrismaBlockRepository extends BlockRepository {
  constructor(private readonly tenants: TenantTransactionRunner) {
    super();
  }

  async listEndingAfter(businessId: string, now: Date): Promise<Block[]> {
    const rows = await this.tenants.run(businessId, (tx) =>
      tx.block.findMany({
        where: { endsAt: { gt: now } },
        select: BLOCK_FIELDS,
        orderBy: [{ startsAt: 'asc' }, { endsAt: 'asc' }],
      }),
    );
    return rows.map(toBlock);
  }

  async create(businessId: string, block: NewBlock): Promise<Block> {
    try {
      const row = await this.tenants.run(businessId, (tx) =>
        tx.block.create({
          data: {
            businessId,
            professionalId: block.professionalId,
            startsAt: new Date(block.startsAt),
            endsAt: new Date(block.endsAt),
            reason: block.reason,
          },
          select: BLOCK_FIELDS,
        }),
      );
      return toBlock(row);
    } catch (error) {
      // Composite foreign key: the professional is not from this business.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new UnknownProfessionalError();
      }
      throw error;
    }
  }

  async delete(businessId: string, blockId: string): Promise<boolean> {
    const { count } = await this.tenants.run(businessId, (tx) =>
      tx.block.deleteMany({ where: { id: blockId } }),
    );
    return count > 0;
  }
}
