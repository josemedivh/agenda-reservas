import { randomUUID } from 'node:crypto';
import type { Block, MembershipSummary, ProfessionalSchedule, WorkingRange } from '@turnero/shared';
import {
  BlockRepository,
  BusinessTimeZones,
  Clock,
  ProfessionalDirectory,
  WorkingHoursRepository,
  type NewBlock,
} from '../application/ports.js';

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

export class InMemoryBlockRepository extends BlockRepository {
  private readonly rows: (Block & { businessId: string })[] = [];

  listEndingAfter(businessId: string, now: Date): Promise<Block[]> {
    return Promise.resolve(
      this.rows
        .filter((row) => row.businessId === businessId && new Date(row.endsAt) > now)
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
        .map(({ id, professionalId, startsAt, endsAt, reason }) => ({
          id,
          professionalId,
          startsAt,
          endsAt,
          reason,
        })),
    );
  }

  create(businessId: string, block: NewBlock): Promise<Block> {
    const created: Block = { id: randomUUID(), ...block };
    this.rows.push({ ...created, businessId });
    return Promise.resolve(created);
  }

  delete(businessId: string, blockId: string): Promise<boolean> {
    const index = this.rows.findIndex((row) => row.businessId === businessId && row.id === blockId);
    if (index >= 0) {
      this.rows.splice(index, 1);
    }
    return Promise.resolve(index >= 0);
  }
}

export class FakeBusinessTimeZones extends BusinessTimeZones {
  constructor(private readonly byBusiness: Record<string, string>) {
    super();
  }

  timeZoneOf(membership: MembershipSummary): Promise<string> {
    return Promise.resolve(this.byBusiness[membership.businessId] ?? 'America/Guayaquil');
  }
}

export class FixedClock extends Clock {
  constructor(private readonly current: Date) {
    super();
  }

  now(): Date {
    return this.current;
  }
}
