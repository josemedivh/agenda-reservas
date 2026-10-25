import { describe, expect, it } from 'vitest';
import {
  appointmentsQuerySchema,
  bookingSchema,
  localDateTime,
  longDateLabel,
} from './appointment.js';

const SERVICE = '6f1c2c1e-0000-4000-8000-00000000000a';
const PRO = '6f1c2c1e-0000-4000-8000-00000000000b';

const booking = {
  serviceId: SERVICE,
  professionalId: PRO,
  startsAt: '2026-11-03T14:00:00.000Z',
  name: '  Miguel Torres ',
  phone: '099 123 4567',
};

describe('bookingSchema', () => {
  it('cleans the booking: trimmed name, E.164 phone, UTC instant', () => {
    expect(bookingSchema.parse({ ...booking, startsAt: '2026-11-03T09:00:00-05:00' })).toEqual({
      serviceId: SERVICE,
      professionalId: PRO,
      startsAt: '2026-11-03T14:00:00.000Z',
      name: 'Miguel Torres',
      phone: '+593991234567',
    });
  });

  it('means "any professional" when the professional is missing or empty', () => {
    expect(
      bookingSchema.parse({ ...booking, professionalId: undefined }).professionalId,
    ).toBeNull();
    expect(bookingSchema.parse({ ...booking, professionalId: '' }).professionalId).toBeNull();
    expect(bookingSchema.parse({ ...booking, professionalId: null }).professionalId).toBeNull();
  });

  it('keeps its output valid input (the web validates first, then sends it)', () => {
    const cleaned = bookingSchema.parse(booking);

    expect(bookingSchema.parse(cleaned)).toEqual(cleaned);
  });

  it.each([
    [{ serviceId: 'x' }, 'serviceId', 'Elige un servicio.'],
    [{ professionalId: 'x' }, 'professionalId', 'Elige un profesional de la lista.'],
    [{ startsAt: '2026-11-03 09:00' }, 'startsAt', 'Elige una hora de la lista.'],
    [{ startsAt: undefined }, 'startsAt', 'Elige una hora de la lista.'],
    [{ name: '   ' }, 'name', 'Ingresa tu nombre.'],
    [{ name: 'A' }, 'name', 'Tu nombre debe tener al menos 2 caracteres.'],
    [{ name: 'A'.repeat(81) }, 'name', 'Tu nombre no puede tener más de 80 caracteres.'],
    [{ phone: undefined }, 'phone', 'Ingresa tu número de WhatsApp.'],
    [{ phone: '  ' }, 'phone', 'Ingresa tu número de WhatsApp.'],
    [{ phone: '12345' }, 'phone', 'Ingresa un número válido, por ejemplo 099 123 4567.'],
  ])('rejects %j', (change, field, message) => {
    const result = bookingSchema.safeParse({ ...booking, ...change });

    expect(result.error?.issues.map((issue) => [issue.path[0], issue.message])).toEqual([
      [field, message],
    ]);
  });
});

describe('appointmentsQuerySchema', () => {
  it('reads the first day and how many days, 7 by default, up to 31', () => {
    expect(appointmentsQuerySchema.parse({ from: '2026-11-03' })).toEqual({
      from: '2026-11-03',
      days: 7,
    });
    expect(appointmentsQuerySchema.parse({ from: '2026-11-03', days: '31' }).days).toBe(31);
  });

  it.each([
    [{ from: '2026-13-01' }, 'from', 'Elige una fecha válida.'],
    [{ from: '2026-11-03', days: '0' }, 'days', 'Pide entre 1 y 31 días.'],
    [{ from: '2026-11-03', days: '32' }, 'days', 'Pide entre 1 y 31 días.'],
  ])('rejects %j', (query, field, message) => {
    const result = appointmentsQuerySchema.safeParse(query);

    expect(result.error?.issues[0]?.path[0]).toBe(field);
    expect(result.error?.issues[0]?.message).toBe(message);
  });
});

describe('localDateTime', () => {
  it('gives the local date and time of an instant in the business', () => {
    expect(localDateTime('2026-11-03T14:00:00.000Z', 'America/Guayaquil')).toEqual({
      date: '2026-11-03',
      time: '09:00',
    });
    // 23:30 on Tuesday in Guayaquil is already Wednesday in UTC.
    expect(localDateTime('2026-11-04T04:30:00.000Z', 'America/Guayaquil')).toEqual({
      date: '2026-11-03',
      time: '23:30',
    });
  });
});

describe('longDateLabel', () => {
  it('writes the date the way people say it', () => {
    expect(longDateLabel('2026-11-03')).toBe('martes 3 de noviembre');
    expect(longDateLabel('2027-01-10')).toBe('domingo 10 de enero');
  });
});
