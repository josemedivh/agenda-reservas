import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  availabilityDaysQuerySchema,
  availabilityQuerySchema,
  type AvailabilityDaysQuery,
  type AvailabilityQuery,
  type DayAvailability,
  type DayAvailabilitySummary,
  type MembershipSummary,
} from '@turnero/shared';
import { ZodValidationPipe } from '../../../common/zod-validation.pipe.js';
import { BusinessMemberGuard } from '../../identity/presentation/business-member.guard.js';
import { CurrentMembership } from '../../identity/presentation/request-context.js';
import { SessionGuard } from '../../identity/presentation/session.guard.js';
import { GetAvailabilityDays, GetDayAvailability } from '../application/availability.js';

/** For members of the business; the public booking page has its own routes. */
@Controller('businesses/:businessId/availability')
@UseGuards(SessionGuard, BusinessMemberGuard)
export class AvailabilityController {
  constructor(
    private readonly getDayAvailability: GetDayAvailability,
    private readonly getAvailabilityDays: GetAvailabilityDays,
  ) {}

  /** ?serviceId=…&date=YYYY-MM-DD[&professionalId=…] */
  @Get()
  day(
    @CurrentMembership() membership: MembershipSummary,
    @Query(new ZodValidationPipe(availabilityQuerySchema)) query: AvailabilityQuery,
  ): Promise<DayAvailability> {
    return this.getDayAvailability.execute(membership, query);
  }

  /** ?serviceId=…&from=YYYY-MM-DD[&days=14][&professionalId=…] */
  @Get('days')
  days(
    @CurrentMembership() membership: MembershipSummary,
    @Query(new ZodValidationPipe(availabilityDaysQuerySchema)) query: AvailabilityDaysQuery,
  ): Promise<DayAvailabilitySummary[]> {
    return this.getAvailabilityDays.execute(membership, query);
  }
}
