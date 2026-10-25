import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  appointmentsQuerySchema,
  type Appointment,
  type AppointmentsQuery,
  type MembershipSummary,
} from '@turnero/shared';
import { ZodValidationPipe } from '../../../common/zod-validation.pipe.js';
import { BusinessMemberGuard } from '../../identity/presentation/business-member.guard.js';
import { CurrentMembership } from '../../identity/presentation/request-context.js';
import { SessionGuard } from '../../identity/presentation/session.guard.js';
import { ListAppointments } from '../application/appointments.js';

/** The business's own view; clients book through the public routes. */
@Controller('businesses/:businessId/appointments')
@UseGuards(SessionGuard, BusinessMemberGuard)
export class AppointmentsController {
  constructor(private readonly listAppointments: ListAppointments) {}

  /** ?from=YYYY-MM-DD[&days=7] (local days of the business). */
  @Get()
  list(
    @CurrentMembership() membership: MembershipSummary,
    @Query(new ZodValidationPipe(appointmentsQuerySchema)) query: AppointmentsQuery,
  ): Promise<Appointment[]> {
    return this.listAppointments.execute(membership, query);
  }
}
