import {
  addDays,
  MAX_DAYS_AHEAD,
  MIN_NOTICE_MINUTES,
  SLOT_STEP_MINUTES,
  timeInputValue,
  todayIn,
  type AvailabilitySlot,
  type WorkingRange,
} from '@turnero/shared';
import { DateTime } from 'luxon';

export interface Interval {
  startsAt: Date;
  endsAt: Date;
}

/** Everything that decides when one professional can take a booking. */
export interface ProfessionalDay {
  professionalId: string;
  /** Weekly ranges (local minutes); only the ones of the queried weekday are used. */
  ranges: readonly WorkingRange[];
  /** Blocks of this professional and of the whole business. */
  blocks: readonly Interval[];
  /** Existing appointments, each already extended by its own preparation time. */
  busy: readonly Interval[];
}

export interface SlotQuery {
  /** Local date in the business ("YYYY-MM-DD"). */
  date: string;
  timeZone: string;
  now: Date;
  durationMinutes: number;
  bufferMinutes: number;
  professionals: readonly ProfessionalDay[];
}

function overlaps(start: Date, end: Date, interval: Interval): boolean {
  return start < interval.endsAt && interval.startsAt < end;
}

/** The instant of a local wall time, or null when that time does not exist (DST gap). */
function localInstant(date: string, minute: number, timeZone: string): DateTime | null {
  const day = DateTime.fromISO(date, { zone: timeZone });
  const hour = Math.floor(minute / 60);
  const minuteOfHour = minute % 60;
  const instant = DateTime.fromObject(
    { year: day.year, month: day.month, day: day.day, hour, minute: minuteOfHour },
    { zone: timeZone },
  );
  return instant.hour === hour && instant.minute === minuteOfHour ? instant : null;
}

function isWithinBookingWindow(date: string, timeZone: string, now: Date): boolean {
  const today = todayIn(timeZone, now);
  return date >= today && date <= addDays(today, MAX_DAYS_AHEAD);
}

/**
 * Bookable times of one local day, every 30 minutes from the start of each working range.
 *
 * - The service must fit in the working range and must not touch a block. Blocked times and
 *   times without enough notice are left out entirely.
 * - The professional stays busy for the service plus its preparation, so that whole span must
 *   not touch an existing appointment (which already includes its own preparation). The
 *   preparation may run past closing time.
 * - A time that fits but where every professional is busy is returned as taken (no ids).
 */
export function availableSlots(query: SlotQuery): AvailabilitySlot[] {
  const { date, timeZone, now } = query;
  if (!isWithinBookingWindow(date, timeZone, now)) {
    return [];
  }
  const weekday = DateTime.fromISO(date, { zone: timeZone }).weekday;
  const earliestStart = new Date(now.getTime() + MIN_NOTICE_MINUTES * 60_000);
  const slots = new Map<string, AvailabilitySlot>();

  for (const professional of query.professionals) {
    for (const range of professional.ranges.filter((candidate) => candidate.weekday === weekday)) {
      for (
        let minute = range.startMinute;
        minute + query.durationMinutes <= range.endMinute;
        minute += SLOT_STEP_MINUTES
      ) {
        const instant = localInstant(date, minute, timeZone);
        if (!instant) {
          continue;
        }
        const start = instant.toJSDate();
        const serviceEnd = instant.plus({ minutes: query.durationMinutes }).toJSDate();
        const busyEnd = instant
          .plus({ minutes: query.durationMinutes + query.bufferMinutes })
          .toJSDate();
        if (
          start < earliestStart ||
          professional.blocks.some((block) => overlaps(start, serviceEnd, block))
        ) {
          continue;
        }

        const startsAt = start.toISOString();
        const slot = slots.get(startsAt) ?? {
          startsAt,
          time: timeInputValue(minute),
          professionalIds: [],
        };
        if (!professional.busy.some((appointment) => overlaps(start, busyEnd, appointment))) {
          slot.professionalIds.push(professional.professionalId);
        }
        slots.set(startsAt, slot);
      }
    }
  }

  return [...slots.values()].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}
