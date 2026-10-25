import { Injectable } from '@nestjs/common';
import {
  addDays,
  dayStatus,
  type AvailabilityDaysQuery,
  type AvailabilityQuery,
  type DayAvailability,
  type DayAvailabilitySummary,
  type MembershipSummary,
} from '@turnero/shared';
import { AvailabilityCalculator } from './availability-calculator.js';

/** Bookable (and taken) times of one day. */
@Injectable()
export class GetDayAvailability {
  constructor(private readonly calculator: AvailabilityCalculator) {}

  async execute(membership: MembershipSummary, query: AvailabilityQuery): Promise<DayAvailability> {
    const [day] = await this.calculator.compute(membership, {
      serviceId: query.serviceId,
      professionalId: query.professionalId,
      dates: [query.date],
    });
    return day ?? { date: query.date, slots: [] };
  }
}

/** Whether each day is closed, full or has free times (for the date picker). */
@Injectable()
export class GetAvailabilityDays {
  constructor(private readonly calculator: AvailabilityCalculator) {}

  async execute(
    membership: MembershipSummary,
    query: AvailabilityDaysQuery,
  ): Promise<DayAvailabilitySummary[]> {
    const dates = Array.from({ length: query.days }, (_, offset) => addDays(query.from, offset));
    const days = await this.calculator.compute(membership, {
      serviceId: query.serviceId,
      professionalId: query.professionalId,
      dates,
    });
    return days.map(({ date, slots }) => ({ date, status: dayStatus(slots) }));
  }
}
