import { z } from 'zod';

export const MINUTES_PER_DAY = 1440;
export const SCHEDULE_STEP_MINUTES = 5;
/** Generous cap: a split day rarely has more than two or three ranges. */
const MAX_RANGES_PER_WEEK = 42;

/** ISO weekdays: 1 = Monday … 7 = Sunday. */
export const WEEKDAYS: readonly { value: number; label: string; short: string }[] = [
  { value: 1, label: 'Lunes', short: 'Lun' },
  { value: 2, label: 'Martes', short: 'Mar' },
  { value: 3, label: 'Miércoles', short: 'Mié' },
  { value: 4, label: 'Jueves', short: 'Jue' },
  { value: 5, label: 'Viernes', short: 'Vie' },
  { value: 6, label: 'Sábado', short: 'Sáb' },
  { value: 7, label: 'Domingo', short: 'Dom' },
];

function weekday(value: number): { value: number; label: string; short: string } {
  const fallback = { value, label: String(value), short: String(value) };
  return WEEKDAYS.find((day) => day.value === value) ?? fallback;
}

/**
 * A range of a working day in the business's local time, as minutes since midnight
 * (9:00 = 540). End is exclusive; 1440 means midnight at the end of the day.
 */
export interface WorkingRange {
  weekday: number;
  startMinute: number;
  endMinute: number;
}

export interface ProfessionalSchedule {
  professionalId: string;
  ranges: WorkingRange[];
}

/** "09:00" or "9:00" -> 540; "24:00" -> 1440. Null when not a valid time. */
export function parseTime(text: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!match) {
    return null;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const total = hours * 60 + minutes;
  return hours <= 24 && minutes < 60 && total <= MINUTES_PER_DAY ? total : null;
}

/** 540 -> "9:00" (for people). */
export function formatTime(minute: number): string {
  const hours = Math.floor(minute / 60);
  return `${String(hours)}:${String(minute % 60).padStart(2, '0')}`;
}

/** 540 -> "09:00" (value of an <input type="time">). */
export function timeInputValue(minute: number): string {
  return formatTime(minute).padStart(5, '0');
}

const STEP_MESSAGE = 'Usa horas en bloques de 5 minutos.';
const BOUNDS_MESSAGE = 'Usa horas entre las 0:00 y las 24:00.';

const minuteSchema = z
  .number({ error: BOUNDS_MESSAGE })
  .int({ error: STEP_MESSAGE })
  .min(0, { error: BOUNDS_MESSAGE })
  .max(MINUTES_PER_DAY, { error: BOUNDS_MESSAGE })
  .multipleOf(SCHEDULE_STEP_MINUTES, { error: STEP_MESSAGE });

const workingRangeSchema = z
  .object({
    weekday: z
      .number({ error: 'Elige un día de la semana.' })
      .int({ error: 'Elige un día de la semana.' })
      .min(1, { error: 'Elige un día de la semana.' })
      .max(7, { error: 'Elige un día de la semana.' }),
    startMinute: minuteSchema,
    endMinute: minuteSchema,
  })
  .refine((range) => range.startMinute < range.endMinute, {
    error: 'La hora de fin debe ser posterior a la de inicio.',
    path: ['endMinute'],
  });

function byDayAndStart(a: WorkingRange, b: WorkingRange): number {
  return a.weekday - b.weekday || a.startMinute - b.startMinute;
}

/** A professional's week. Ranges of the same day cannot overlap; the result comes sorted. */
export const weeklyScheduleSchema = z
  .object({
    ranges: z
      .array(workingRangeSchema)
      .max(MAX_RANGES_PER_WEEK, { error: 'Demasiados turnos en la semana.' }),
  })
  .check((ctx) => {
    const order = ctx.value.ranges
      .map((range, index) => ({ range, index }))
      .sort((a, b) => byDayAndStart(a.range, b.range));
    for (let position = 1; position < order.length; position += 1) {
      const previous = order[position - 1];
      const current = order[position];
      if (
        previous &&
        current &&
        previous.range.weekday === current.range.weekday &&
        current.range.startMinute < previous.range.endMinute
      ) {
        ctx.issues.push({
          code: 'custom',
          message: `Los turnos del ${weekday(current.range.weekday).label.toLowerCase()} se cruzan.`,
          path: ['ranges', current.index],
          input: ctx.value,
        });
      }
    }
  })
  .transform(({ ranges }) => ({ ranges: [...ranges].sort(byDayAndStart) }));
export type WeeklySchedule = z.infer<typeof weeklyScheduleSchema>;

/** "Lun a vie 9:00–18:00 · Sáb 9:00–13:00"; "Sin horario" when empty. */
export function summarizeSchedule(ranges: readonly WorkingRange[]): string {
  const hoursOf = (day: number) =>
    ranges
      .filter((range) => range.weekday === day)
      .sort(byDayAndStart)
      .map((range) => `${formatTime(range.startMinute)}–${formatTime(range.endMinute)}`)
      .join(', ');

  const groups: { from: number; to: number; hours: string }[] = [];
  for (const { value } of WEEKDAYS) {
    const hours = hoursOf(value);
    const last = groups.at(-1);
    if (!hours) {
      continue;
    }
    if (last && last.hours === hours && last.to === value - 1) {
      last.to = value;
    } else {
      groups.push({ from: value, to: value, hours });
    }
  }
  if (groups.length === 0) {
    return 'Sin horario';
  }

  return groups
    .map(({ from, to, hours }) => {
      const first = weekday(from).short;
      const lastDay = weekday(to).short.toLowerCase();
      if (from === to) {
        return `${first} ${hours}`;
      }
      return `${first} ${to - from === 1 ? 'y' : 'a'} ${lastDay} ${hours}`;
    })
    .join(' · ');
}
