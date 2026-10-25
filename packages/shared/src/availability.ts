import { DateTime } from 'luxon';
import { z } from 'zod';
import { SHORT_MONTH_NAMES } from './block.js';
import { WEEKDAYS } from './schedule.js';

/** Booking times are offered every 30 minutes from the start of each working range. */
export const SLOT_STEP_MINUTES = 30;
/** Bookings need at least this much notice. */
export const MIN_NOTICE_MINUTES = 60;
/** Bookings can be made up to this many days ahead (counting today as day 0). */
export const MAX_DAYS_AHEAD = 60;
export const MAX_DAYS_PER_QUERY = 31;

const DATE_MESSAGE = 'Elige una fecha válida.';

const dateSchema = z
  .string({ error: DATE_MESSAGE })
  .refine((text) => /^\d{4}-\d{2}-\d{2}$/.test(text) && DateTime.fromISO(text).isValid, {
    error: DATE_MESSAGE,
  });

/** Optional: missing or empty means "any professional who performs the service". */
const professionalIdSchema = z
  .union([z.literal(''), z.null(), z.uuid({ error: 'Elige un profesional de la lista.' })], {
    error: 'Elige un profesional de la lista.',
  })
  .optional()
  .transform((id) => id || null);

const serviceIdSchema = z.uuid({ error: 'Elige un servicio.' });

export const availabilityQuerySchema = z.object({
  serviceId: serviceIdSchema,
  date: dateSchema,
  professionalId: professionalIdSchema,
});
export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;

export const availabilityDaysQuerySchema = z.object({
  serviceId: serviceIdSchema,
  from: dateSchema,
  days: z.coerce
    .number({ error: `Pide entre 1 y ${String(MAX_DAYS_PER_QUERY)} días.` })
    .int()
    .min(1, { error: `Pide entre 1 y ${String(MAX_DAYS_PER_QUERY)} días.` })
    .max(MAX_DAYS_PER_QUERY, { error: `Pide entre 1 y ${String(MAX_DAYS_PER_QUERY)} días.` })
    .default(14),
  professionalId: professionalIdSchema,
});
export type AvailabilityDaysQuery = z.infer<typeof availabilityDaysQuerySchema>;

export interface AvailabilitySlot {
  /** UTC instant (ISO). */
  startsAt: string;
  /** Local time in the business ("09:30"). */
  time: string;
  /** Who can take it; empty means the time is taken. */
  professionalIds: string[];
}

export interface DayAvailability {
  date: string;
  slots: AvailabilitySlot[];
}

/** closed: nobody attends (or it is blocked); full: there are times but all are taken. */
export type DayStatus = 'closed' | 'full' | 'available';

export interface DayAvailabilitySummary {
  date: string;
  status: DayStatus;
}

export function dayStatus(slots: readonly AvailabilitySlot[]): DayStatus {
  if (slots.length === 0) {
    return 'closed';
  }
  return slots.some((slot) => slot.professionalIds.length > 0) ? 'available' : 'full';
}

/** The local date ("YYYY-MM-DD") of `instant` in the IANA time zone. */
export function todayIn(timeZone: string, instant: Date = new Date()): string {
  return DateTime.fromJSDate(instant).setZone(timeZone).toISODate() ?? '';
}

/** Calendar arithmetic on "YYYY-MM-DD" dates. */
export function addDays(date: string, days: number): string {
  return DateTime.fromISO(date, { zone: 'UTC' }).plus({ days }).toISODate() ?? '';
}

/** "2026-11-03" -> { weekday: "Mar", day: "3", month: "nov" } (for day pickers). */
export function shortDateLabel(date: string): { weekday: string; day: string; month: string } {
  const day = DateTime.fromISO(date, { zone: 'UTC' });
  return {
    weekday: WEEKDAYS.find((weekday) => weekday.value === day.weekday)?.short ?? '',
    day: String(day.day),
    month: SHORT_MONTH_NAMES[day.month - 1] ?? '',
  };
}
