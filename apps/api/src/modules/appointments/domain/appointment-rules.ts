import { addDays } from '@turnero/shared';
import { DateTime } from 'luxon';

/** UTC instants, end exclusive. */
export interface AppointmentSpan {
  startsAt: Date;
  /** End of the service. */
  endsAt: Date;
  /** End of the service plus its preparation: the professional is busy until then. */
  busyUntil: Date;
}

export function appointmentSpan(
  startsAt: Date,
  durationMinutes: number,
  bufferMinutes: number,
): AppointmentSpan {
  return {
    startsAt,
    endsAt: new Date(startsAt.getTime() + durationMinutes * 60_000),
    busyUntil: new Date(startsAt.getTime() + (durationMinutes + bufferMinutes) * 60_000),
  };
}

function localMidnight(date: string, timeZone: string): Date {
  return DateTime.fromISO(date, { zone: timeZone }).startOf('day').toJSDate();
}

/** From the start of local day `from` to the start of the day after the last one. */
export function localDaysInterval(
  from: string,
  days: number,
  timeZone: string,
): { from: Date; to: Date } {
  return {
    from: localMidnight(from, timeZone),
    to: localMidnight(addDays(from, days), timeZone),
  };
}
