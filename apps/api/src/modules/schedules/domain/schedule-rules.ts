import {
  blockInputSchema,
  canEditBusiness,
  weeklyScheduleSchema,
  type BlockInput,
  type MemberRole,
  type WeeklySchedule,
} from '@turnero/shared';
import { InvalidScheduleDataError, ScheduleEditForbiddenError } from './errors.js';

// Field rules live in @turnero/shared, so the web editor and the API apply the same ones.

/** Owners and admins change schedules; employees only see them. */
export function assertCanManageSchedules(role: MemberRole): void {
  if (!canEditBusiness(role)) {
    throw new ScheduleEditForbiddenError();
  }
}

/** Valid, non-overlapping and sorted week. */
export function validateWeeklySchedule(input: WeeklySchedule): WeeklySchedule {
  const result = weeklyScheduleSchema.safeParse(input);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new InvalidScheduleDataError(issue?.message ?? 'Revisa los horarios.', 'ranges');
  }
  return result.data;
}

export function validateBlockInput(input: BlockInput): BlockInput {
  const result = blockInputSchema.safeParse(input);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new InvalidScheduleDataError(
      issue?.message ?? 'Revisa el bloqueo.',
      String(issue?.path[0] ?? ''),
    );
  }
  return result.data;
}
