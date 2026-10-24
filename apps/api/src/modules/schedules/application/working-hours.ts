import { Injectable } from '@nestjs/common';
import type { MembershipSummary, ProfessionalSchedule, WeeklySchedule } from '@turnero/shared';
import { assertCanManageSchedules, validateWeeklySchedule } from '../domain/schedule-rules.js';
import { UnknownProfessionalError } from '../domain/errors.js';
import { ProfessionalDirectory, WorkingHoursRepository } from './ports.js';

async function assertProfessionalExists(
  directory: ProfessionalDirectory,
  membership: MembershipSummary,
  professionalId: string,
): Promise<void> {
  if (!(await directory.exists(membership, professionalId))) {
    throw new UnknownProfessionalError();
  }
}

@Injectable()
export class ListWorkingHours {
  constructor(private readonly workingHours: WorkingHoursRepository) {}

  execute(membership: MembershipSummary): Promise<ProfessionalSchedule[]> {
    return this.workingHours.listByBusiness(membership.businessId);
  }
}

@Injectable()
export class GetProfessionalWorkingHours {
  constructor(
    private readonly workingHours: WorkingHoursRepository,
    private readonly professionals: ProfessionalDirectory,
  ) {}

  async execute(membership: MembershipSummary, professionalId: string): Promise<WeeklySchedule> {
    await assertProfessionalExists(this.professionals, membership, professionalId);
    return {
      ranges: await this.workingHours.findForProfessional(membership.businessId, professionalId),
    };
  }
}

/** Saves a professional's whole week at once (replacing what was there). */
@Injectable()
export class ReplaceProfessionalWorkingHours {
  constructor(
    private readonly workingHours: WorkingHoursRepository,
    private readonly professionals: ProfessionalDirectory,
  ) {}

  async execute(
    membership: MembershipSummary,
    professionalId: string,
    input: WeeklySchedule,
  ): Promise<WeeklySchedule> {
    assertCanManageSchedules(membership.role);
    const { ranges } = validateWeeklySchedule(input);
    await assertProfessionalExists(this.professionals, membership, professionalId);
    return {
      ranges: await this.workingHours.replaceForProfessional(
        membership.businessId,
        professionalId,
        ranges,
      ),
    };
  }
}
