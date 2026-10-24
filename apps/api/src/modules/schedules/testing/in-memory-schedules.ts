import type { MembershipSummary, ProfessionalSchedule, WorkingRange } from '@turnero/shared';
import { ProfessionalDirectory, WorkingHoursRepository } from '../application/ports.js';

// Test doubles for the schedules ports. Only used by unit tests.

export class InMemoryWorkingHoursRepository extends WorkingHoursRepository {
  private readonly weeks = new Map<string, WorkingRange[]>();

  private static key(businessId: string, professionalId: string): string {
    return `${businessId}/${professionalId}`;
  }

  rangesOf(businessId: string, professionalId: string): WorkingRange[] {
    return this.weeks.get(InMemoryWorkingHoursRepository.key(businessId, professionalId)) ?? [];
  }

  listByBusiness(businessId: string): Promise<ProfessionalSchedule[]> {
    const schedules: ProfessionalSchedule[] = [];
    for (const [key, ranges] of this.weeks) {
      const [business, professionalId] = key.split('/');
      if (business === businessId && professionalId && ranges.length > 0) {
        schedules.push({ professionalId, ranges: [...ranges] });
      }
    }
    return Promise.resolve(schedules);
  }

  findForProfessional(businessId: string, professionalId: string): Promise<WorkingRange[]> {
    return Promise.resolve([...this.rangesOf(businessId, professionalId)]);
  }

  replaceForProfessional(
    businessId: string,
    professionalId: string,
    ranges: WorkingRange[],
  ): Promise<WorkingRange[]> {
    this.weeks.set(InMemoryWorkingHoursRepository.key(businessId, professionalId), [...ranges]);
    return Promise.resolve([...ranges]);
  }
}

export class FakeProfessionalDirectory extends ProfessionalDirectory {
  constructor(private readonly byBusiness: Record<string, string[]>) {
    super();
  }

  exists(membership: MembershipSummary, professionalId: string): Promise<boolean> {
    return Promise.resolve((this.byBusiness[membership.businessId] ?? []).includes(professionalId));
  }
}
