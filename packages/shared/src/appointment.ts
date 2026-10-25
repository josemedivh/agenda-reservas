import { DateTime } from 'luxon';
import { z } from 'zod';
import {
  daysCountSchema,
  localDateSchema,
  optionalProfessionalIdSchema,
  serviceIdSchema,
} from './availability.js';
import { normalizePhone } from './business.js';
import { WEEKDAYS } from './schedule.js';

export const CUSTOMER_NAME_MIN_LENGTH = 2;
export const CUSTOMER_NAME_MAX_LENGTH = 80;

const customerNameSchema = z
  .string({ error: 'Ingresa tu nombre.' })
  .trim()
  // A blank name only gets this message, not the length ones too.
  .min(1, { error: 'Ingresa tu nombre.', abort: true })
  .min(CUSTOMER_NAME_MIN_LENGTH, {
    error: `Tu nombre debe tener al menos ${String(CUSTOMER_NAME_MIN_LENGTH)} caracteres.`,
  })
  .max(CUSTOMER_NAME_MAX_LENGTH, {
    error: `Tu nombre no puede tener más de ${String(CUSTOMER_NAME_MAX_LENGTH)} caracteres.`,
  });

const PHONE_MISSING = 'Ingresa tu número de WhatsApp.';

const customerPhoneSchema = z.string({ error: PHONE_MISSING }).transform((raw, ctx) => {
  if (raw.trim() === '') {
    ctx.addIssue({ code: 'custom', message: PHONE_MISSING });
    return z.NEVER;
  }
  const phone = normalizePhone(raw);
  if (!phone) {
    ctx.addIssue({
      code: 'custom',
      message: 'Ingresa un número válido, por ejemplo 099 123 4567.',
    });
    return z.NEVER;
  }
  return phone;
});

/** A time offered by the availability, as a UTC instant ("2026-11-03T14:00:00.000Z"). */
const startsAtSchema = z.iso
  .datetime({ offset: true, error: 'Elige una hora de la lista.' })
  .transform((text) => new Date(text).toISOString());

/** What a client sends from the public page. No account: just a name and their WhatsApp. */
export const bookingSchema = z.object({
  serviceId: serviceIdSchema,
  professionalId: optionalProfessionalIdSchema,
  startsAt: startsAtSchema,
  name: customerNameSchema,
  phone: customerPhoneSchema,
});
export type BookingInput = z.infer<typeof bookingSchema>;

/** Appointments of the panel, by local days of the business. */
export const appointmentsQuerySchema = z.object({
  from: localDateSchema,
  days: daysCountSchema(7),
});
export type AppointmentsQuery = z.infer<typeof appointmentsQuerySchema>;

export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
export type AppointmentSource = 'online' | 'manual';

/** An appointment as the business sees it in the panel. */
export interface Appointment {
  id: string;
  professionalId: string;
  serviceId: string;
  /** Name and price when it was booked (the service may have changed since). */
  serviceName: string;
  priceCents: number;
  /** UTC instants (ISO); `endsAt` is the end of the service, without preparation. */
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  source: AppointmentSource;
  customer: { id: string; name: string; phone: string };
}

/** A service on the public page: active and with someone who performs it. */
export interface PublicService {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
  /** Active professionals who perform it. */
  professionalIds: string[];
}

export interface PublicProfessional {
  id: string;
  name: string;
  color: string;
}

/** What the public booking page shows about a business (nothing internal). */
export interface PublicBusiness {
  name: string;
  slug: string;
  phone: string;
  address: string | null;
  timeZone: string;
  services: PublicService[];
  professionals: PublicProfessional[];
}

/** A booking as its client sees it, through the code in their link. */
export interface BookingDetails {
  status: AppointmentStatus;
  serviceName: string;
  priceCents: number;
  professionalName: string;
  customerName: string;
  /** UTC instants (ISO). */
  startsAt: string;
  endsAt: string;
  /** Local date ("YYYY-MM-DD"), start ("09:30") and end ("10:00") in the business. */
  date: string;
  time: string;
  endTime: string;
  business: { name: string; slug: string; phone: string; address: string | null };
}

export interface BookingConfirmation {
  /** Secret of the client's link (only shown once; the API stores its hash). */
  code: string;
  booking: BookingDetails;
}

const MONTH_NAMES: readonly string[] = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** Local date ("2026-11-03") and time ("09:00") of a UTC instant in the IANA time zone. */
export function localDateTime(instant: string, timeZone: string): { date: string; time: string } {
  const local = DateTime.fromISO(instant).setZone(timeZone);
  return { date: local.toISODate() ?? '', time: local.toFormat('HH:mm') };
}

/** "2026-11-03" -> "martes 3 de noviembre". */
export function longDateLabel(date: string): string {
  const day = DateTime.fromISO(date, { zone: 'UTC' });
  const weekday = WEEKDAYS.find((candidate) => candidate.value === day.weekday)?.label ?? '';
  return `${weekday.toLowerCase()} ${String(day.day)} de ${MONTH_NAMES[day.month - 1] ?? ''}`;
}
