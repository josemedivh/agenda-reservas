import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  professionalInputSchema,
  type MembershipSummary,
  type Professional,
  type ProfessionalInput,
} from '@turnero/shared';
import { ZodValidationPipe } from '../../../common/zod-validation.pipe.js';
import { BusinessMemberGuard } from '../../identity/presentation/business-member.guard.js';
import { CurrentMembership } from '../../identity/presentation/request-context.js';
import { SessionGuard } from '../../identity/presentation/session.guard.js';
import {
  CreateProfessional,
  GetProfessional,
  ListProfessionals,
  SetProfessionalActive,
  UpdateProfessional,
} from '../application/professionals.js';
import { ProfessionalNotFoundError } from '../domain/errors.js';

/** A malformed id cannot match any professional. */
const professionalIdPipe = new ParseUUIDPipe({
  exceptionFactory: () => new ProfessionalNotFoundError(),
});
const inputPipe = new ZodValidationPipe(professionalInputSchema);

@Controller('businesses/:businessId/professionals')
@UseGuards(SessionGuard, BusinessMemberGuard)
export class ProfessionalsController {
  constructor(
    private readonly listProfessionals: ListProfessionals,
    private readonly getProfessional: GetProfessional,
    private readonly createProfessional: CreateProfessional,
    private readonly updateProfessional: UpdateProfessional,
    private readonly setProfessionalActive: SetProfessionalActive,
  ) {}

  @Get()
  list(@CurrentMembership() membership: MembershipSummary): Promise<Professional[]> {
    return this.listProfessionals.execute(membership);
  }

  @Post()
  create(
    @CurrentMembership() membership: MembershipSummary,
    @Body(inputPipe) body: ProfessionalInput,
  ): Promise<Professional> {
    return this.createProfessional.execute(membership, body);
  }

  @Get(':professionalId')
  get(
    @CurrentMembership() membership: MembershipSummary,
    @Param('professionalId', professionalIdPipe) professionalId: string,
  ): Promise<Professional> {
    return this.getProfessional.execute(membership, professionalId);
  }

  @Put(':professionalId')
  update(
    @CurrentMembership() membership: MembershipSummary,
    @Param('professionalId', professionalIdPipe) professionalId: string,
    @Body(inputPipe) body: ProfessionalInput,
  ): Promise<Professional> {
    return this.updateProfessional.execute(membership, professionalId, body);
  }

  @Post(':professionalId/deactivate')
  @HttpCode(HttpStatus.OK)
  deactivate(
    @CurrentMembership() membership: MembershipSummary,
    @Param('professionalId', professionalIdPipe) professionalId: string,
  ): Promise<Professional> {
    return this.setProfessionalActive.execute(membership, professionalId, false);
  }

  @Post(':professionalId/activate')
  @HttpCode(HttpStatus.OK)
  activate(
    @CurrentMembership() membership: MembershipSummary,
    @Param('professionalId', professionalIdPipe) professionalId: string,
  ): Promise<Professional> {
    return this.setProfessionalActive.execute(membership, professionalId, true);
  }
}
