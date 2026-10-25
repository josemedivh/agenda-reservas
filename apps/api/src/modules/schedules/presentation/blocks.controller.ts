import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  blockInputSchema,
  type Block,
  type BlockInput,
  type MembershipSummary,
} from '@turnero/shared';
import { ZodValidationPipe } from '../../../common/zod-validation.pipe.js';
import { BusinessMemberGuard } from '../../identity/presentation/business-member.guard.js';
import { CurrentMembership } from '../../identity/presentation/request-context.js';
import { SessionGuard } from '../../identity/presentation/session.guard.js';
import { CreateBlock, DeleteBlock, ListBlocks } from '../application/blocks.js';
import { BlockNotFoundError } from '../domain/errors.js';

/** A malformed id cannot match any block. */
const blockIdPipe = new ParseUUIDPipe({ exceptionFactory: () => new BlockNotFoundError() });

@Controller('businesses/:businessId/blocks')
@UseGuards(SessionGuard, BusinessMemberGuard)
export class BlocksController {
  constructor(
    private readonly listBlocks: ListBlocks,
    private readonly createBlock: CreateBlock,
    private readonly deleteBlock: DeleteBlock,
  ) {}

  /** Current and upcoming blocks, earliest first. */
  @Get()
  list(@CurrentMembership() membership: MembershipSummary): Promise<Block[]> {
    return this.listBlocks.execute(membership);
  }

  /** Days or hours in the business's local time; stored as UTC instants. */
  @Post()
  create(
    @CurrentMembership() membership: MembershipSummary,
    @Body(new ZodValidationPipe(blockInputSchema)) body: BlockInput,
  ): Promise<Block> {
    return this.createBlock.execute(membership, body);
  }

  @Delete(':blockId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentMembership() membership: MembershipSummary,
    @Param('blockId', blockIdPipe) blockId: string,
  ): Promise<void> {
    return this.deleteBlock.execute(membership, blockId);
  }
}
