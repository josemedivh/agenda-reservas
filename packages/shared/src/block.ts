import { DateTime } from 'luxon';
import { z } from 'zod';
import { formatTime, MINUTES_PER_DAY, parseTime, WEEKDAYS } from './schedule.js';

export const BLOCK_REASON_MAX_LENGTH = 120;
const MAX_BLOCK_DAYS = 366;

// Fixed names (instead of Intl) so the text is the same in Node and every browser.
const MONTHS = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sept',
  'oct',
  'nov',
  'dic',
];

const DATE_MESSAGE = 'Elige una fecha válida.';
const TIME_MESSAGE = 'Elige una hora válida.';
const WHO_MESSAGE = 'Elige para quién es el bloqueo.';

function isValidDate(text: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(text) && DateTime.fromISO(text).isValid;
}

const dateSchema = z.string({ error: DATE_MESSAGE }).refine(isValidDate, { error: DATE_MESSAGE });

const timeSchema = z.string({ error: TIME_MESSAGE }).refine(
  (text) => {
    const minute = parseTime(text);
    return minute !== null && minute < MINUTES_PER_DAY;
  },
  { error: TIME_MESSAGE },
);

/** Missing, empty (from the form) or null means the whole business. */
const professionalIdSchema = z
  .union([z.literal(''), z.null(), z.uuid({ error: WHO_MESSAGE })], { error: WHO_MESSAGE })
  .optional()
  .transform((id) => id || null);

const reasonSchema = z
  .string({ error: 'Escribe el motivo como texto.' })
  .trim()
  .max(BLOCK_REASON_MAX_LENGTH, {
    error: `El motivo no puede tener más de ${String(BLOCK_REASON_MAX_LENGTH)} caracteres.`,
  })
  .nullish()
  .transform((reason) => (reason ? reason : null));

const allDayBlockSchema = z
  .object({
    kind: z.literal('allDay'),
    professionalId: professionalIdSchema,
    startDate: dateSchema,
    endDate: dateSchema,
    reason: reasonSchema,
  })
  .check((ctx) => {
    const { startDate, endDate } = ctx.value;
    let message: string | null = null;
    if (endDate < startDate) {
      message = 'La fecha final no puede ser anterior a la inicial.';
    } else if (
      DateTime.fromISO(endDate).diff(DateTime.fromISO(startDate), 'days').days >= MAX_BLOCK_DAYS
    ) {
      message = 'Un bloqueo puede durar hasta un año.';
    }
    if (message) {
      ctx.issues.push({ code: 'custom', message, path: ['endDate'], input: endDate });
    }
  });

const hoursBlockSchema = z
  .object({
    kind: z.literal('hours'),
    professionalId: professionalIdSchema,
    date: dateSchema,
    startTime: timeSchema,
    endTime: timeSchema,
    reason: reasonSchema,
  })
  .check((ctx) => {
    const { startTime, endTime } = ctx.value;
    if ((parseTime(endTime) ?? 0) <= (parseTime(startTime) ?? 0)) {
      ctx.issues.push({
        code: 'custom',
        message: 'La hora de fin debe ser posterior a la de inicio.',
        path: ['endTime'],
        input: endTime,
      });
    }
  });

/**
 * A block as the owner enters it: whole days or hours within one day, in the business's local
 * time. The API turns it into UTC instants with the business's time zone.
 */
export const blockInputSchema = z.discriminatedUnion(
  'kind',
  [allDayBlockSchema, hoursBlockSchema],
  {
    error: 'Elige si el bloqueo es de todo el día o por horas.',
  },
);
export type BlockInput = z.infer<typeof blockInputSchema>;

/** A stored block: UTC instants, end exclusive. Null professional = whole business. */
export interface Block {
  id: string;
  professionalId: string | null;
  startsAt: string;
  endsAt: string;
  reason: string | null;
}

/** Local days or hours in `timeZone` (IANA) to UTC instants (ISO strings, end exclusive). */
export function blockInterval(
  input: BlockInput,
  timeZone: string,
): { startsAt: string; endsAt: string } {
  const toIso = (dateTime: DateTime) => dateTime.toUTC().toISO() ?? '';
  if (input.kind === 'allDay') {
    // startOf('day') gives the first real instant of the day, even when midnight does not exist.
    const start = DateTime.fromISO(input.startDate, { zone: timeZone }).startOf('day');
    const end = DateTime.fromISO(input.endDate, { zone: timeZone })
      .plus({ days: 1 })
      .startOf('day');
    return { startsAt: toIso(start), endsAt: toIso(end) };
  }
  const at = (time: string) =>
    DateTime.fromISO(`${input.date}T${time.padStart(5, '0')}`, { zone: timeZone });
  return { startsAt: toIso(at(input.startTime)), endsAt: toIso(at(input.endTime)) };
}

function dayLabel(dateTime: DateTime): string {
  const weekday = WEEKDAYS.find((day) => day.value === dateTime.weekday)?.short ?? '';
  return `${weekday} ${String(dateTime.day)} ${MONTHS[dateTime.month - 1] ?? ''}`;
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function minuteOfDay(dateTime: DateTime): number {
  return dateTime.hour * 60 + dateTime.minute;
}

/** "Lun 2 nov · todo el día", "Del lun 2 nov al vie 6 nov · todo el día", "Lun 2 nov · 14:00–18:00". */
export function describeBlock(startsAt: string, endsAt: string, timeZone: string): string {
  const start = DateTime.fromISO(startsAt).setZone(timeZone);
  const end = DateTime.fromISO(endsAt).setZone(timeZone);
  const startsAtDayStart = start.toMillis() === start.startOf('day').toMillis();
  const endsAtDayStart = end.toMillis() === end.startOf('day').toMillis();

  if (startsAtDayStart && endsAtDayStart) {
    const lastDay = end.minus({ days: 1 }).startOf('day');
    return lastDay.hasSame(start, 'day')
      ? `${dayLabel(start)} · todo el día`
      : `Del ${lowerFirst(dayLabel(start))} al ${lowerFirst(dayLabel(lastDay))} · todo el día`;
  }
  if (start.hasSame(end, 'day')) {
    return `${dayLabel(start)} · ${formatTime(minuteOfDay(start))}–${formatTime(minuteOfDay(end))}`;
  }
  return `Del ${lowerFirst(dayLabel(start))} ${formatTime(minuteOfDay(start))} al ${lowerFirst(dayLabel(end))} ${formatTime(minuteOfDay(end))}`;
}
