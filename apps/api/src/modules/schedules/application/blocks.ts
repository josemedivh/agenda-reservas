import { Injectable } from '@nestjs/common';
import {
  blockInterval,
  type Block,
  type BlockInput,
  type BusinessScope,
  type MembershipSummary,
} from '@turnero/shared';
import { BlockNotFoundError, UnknownProfessionalError } from '../domain/errors.js';
import { assertCanManageSchedules, validateBlockInput } from '../domain/schedule-rules.js';
import { BlockRepository, BusinessTimeZones, Clock, ProfessionalDirectory } from './ports.js';

/** Current and upcoming blocks (past ones are kept but not listed). */
@Injectable()
export class ListBlocks {
  constructor(
    private readonly blocks: BlockRepository,
    private readonly clock: Clock,
  ) {}

  execute(scope: BusinessScope): Promise<Block[]> {
    return this.blocks.listEndingAfter(scope.businessId, this.clock.now());
  }
}

@Injectable()
export class CreateBlock {
  constructor(
    private readonly blocks: BlockRepository,
    private readonly professionals: ProfessionalDirectory,
    private readonly timeZones: BusinessTimeZones,
  ) {}

  async execute(membership: MembershipSummary, input: BlockInput): Promise<Block> {
    assertCanManageSchedules(membership.role);
    const block = validateBlockInput(input);
    if (
      block.professionalId &&
      !(await this.professionals.exists(membership, block.professionalId))
    ) {
      throw new UnknownProfessionalError();
    }
    // Local days or hours become UTC instants with the business's own time zone.
    const interval = blockInterval(block, await this.timeZones.timeZoneOf(membership));
    return this.blocks.create(membership.businessId, {
      professionalId: block.professionalId,
      reason: block.reason,
      ...interval,
    });
  }
}

/** Blocks may be removed for good (e.g. cancelled vacations). */
@Injectable()
export class DeleteBlock {
  constructor(private readonly blocks: BlockRepository) {}

  async execute(membership: MembershipSummary, blockId: string): Promise<void> {
    assertCanManageSchedules(membership.role);
    if (!(await this.blocks.delete(membership.businessId, blockId))) {
      throw new BlockNotFoundError();
    }
  }
}
