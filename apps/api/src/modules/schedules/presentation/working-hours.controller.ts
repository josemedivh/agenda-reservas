import { Body, Controller, Get, Param, ParseUUIDPipe, Put, UseGuards } from '@nestjs/common';
import {
  weeklyScheduleSchema,
  type MembershipSummary,
  type ProfessionalSchedule,
  type WeeklySchedule,
} from '@turnero/shared';
import { ZodValidationPipe } from '../../../common/zod-validation.pipe.js';
import { BusinessMemberGuard } from '../../identity/presentation/business-member.guard.js';
import { CurrentMembership } from '../../identity/presentation/request-context.js';
import { SessionGuard } from '../../identity/presentation/session.guard.js';
import {
  GetProfessionalWorkingHours,
  ListWorkingHours,
  ReplaceProfessionalWorkingHours,
} from '../application/working-hours.js';
import { UnknownProfessionalError } from '../domain/errors.js';

/** A malformed id cannot match any professional. */
const professionalIdPipe = new ParseUUIDPipe({
  exceptionFactory: () => new UnknownProfessionalError(),
});

@Controller('businesses/:businessId')
@UseGuards(SessionGuard, BusinessMemberGuard)
export class WorkingHoursController {
  constructor(
    private readonly listWorkingHours: ListWorkingHours,
    private readonly getProfessionalWorkingHours: GetProfessionalWorkingHours,
    private readonly replaceProfessionalWorkingHours: ReplaceProfessionalWorkingHours,
  ) {}

  /** Every professional with a schedule (professionals without one are not listed). */
  @Get('working-hours')
  list(@CurrentMembership() membership: MembershipSummary): Promise<ProfessionalSchedule[]> {
    return this.listWorkingHours.execute(membership);
  }

  @Get('professionals/:professionalId/working-hours')
  get(
    @CurrentMembership() membership: MembershipSummary,
    @Param('professionalId', professionalIdPipe) professionalId: string,
  ): Promise<WeeklySchedule> {
    return this.getProfessionalWorkingHours.execute(membership, professionalId);
  }

  /** Replaces the whole week. */
  @Put('professionals/:professionalId/working-hours')
  replace(
    @CurrentMembership() membership: MembershipSummary,
    @Param('professionalId', professionalIdPipe) professionalId: string,
    @Body(new ZodValidationPipe(weeklyScheduleSchema)) body: WeeklySchedule,
  ): Promise<WeeklySchedule> {
    return this.replaceProfessionalWorkingHours.execute(membership, professionalId, body);
  }
}
