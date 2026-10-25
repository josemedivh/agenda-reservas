import { describe, expect, it } from 'vitest';
import {
  addDays,
  availabilityDaysQuerySchema,
  availabilityQuerySchema,
  shortDateLabel,
  todayIn,
} from './availability.js';

const SERVICE = '6f1c2c1e-0000-4000-8000-00000000000a';
const PRO = '6f1c2c1e-0000-4000-8000-00000000000b';

describe('availabilityQuerySchema', () => {
  it('accepts a service, a date and an optional professional', () => {
    expect(availabilityQuerySchema.parse({ serviceId: SERVICE, date: '2026-11-03' })).toEqual({
      serviceId: SERVICE,
      date: '2026-11-03',
      professionalId: null,
    });
    expect(
      availabilityQuerySchema.parse({ serviceId: SERVICE, date: '2026-11-03', professionalId: PRO })
        .professionalId,
    ).toBe(PRO);
    expect(
      availabilityQuerySchema.parse({ serviceId: SERVICE, date: '2026-11-03', professionalId: '' })
        .professionalId,
    ).toBeNull();
  });

  it.each([
    [{ serviceId: 'x', date: '2026-11-03' }, 'serviceId', 'Elige un servicio.'],
    [{ serviceId: SERVICE, date: '2026-02-30' }, 'date', 'Elige una fecha válida.'],
    [
      { serviceId: SERVICE, date: '2026-11-03', professionalId: 'x' },
      'professionalId',
      'Elige un profesional de la lista.',
    ],
  ])('rejects %j', (query, field, message) => {
    const result = availabilityQuerySchema.safeParse(query);

    expect(result.error?.issues[0]?.path[0]).toBe(field);
    expect(result.error?.issues[0]?.message).toBe(message);
  });
});

describe('availabilityDaysQuerySchema', () => {
  it('reads the number of days from the query string, 14 by default, up to 31', () => {
    expect(availabilityDaysQuerySchema.parse({ serviceId: SERVICE, from: '2026-11-03' })).toEqual({
      serviceId: SERVICE,
      from: '2026-11-03',
      days: 14,
      professionalId: null,
    });
    expect(
      availabilityDaysQuerySchema.parse({ serviceId: SERVICE, from: '2026-11-03', days: '7' }).days,
    ).toBe(7);
    expect(
      availabilityDaysQuerySchema.safeParse({ serviceId: SERVICE, from: '2026-11-03', days: '32' })
        .success,
    ).toBe(false);
  });
});

describe('dates', () => {
  it('knows the local date of the business, which may differ from UTC', () => {
    // 2026-11-03 03:00 UTC is still Nov 2 in Guayaquil (UTC-5).
    expect(todayIn('America/Guayaquil', new Date('2026-11-03T03:00:00.000Z'))).toBe('2026-11-02');
    expect(todayIn('America/Guayaquil', new Date('2026-11-03T06:00:00.000Z'))).toBe('2026-11-03');
  });

  it('adds calendar days', () => {
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02');
    expect(addDays('2026-11-02', -2)).toBe('2026-10-31');
  });
});

describe('shortDateLabel', () => {
  it('names a date by its weekday and day of the month', () => {
    expect(shortDateLabel('2026-11-03')).toEqual({ weekday: 'Mar', day: '3', month: 'nov' });
    expect(shortDateLabel('2026-11-08')).toEqual({ weekday: 'Dom', day: '8', month: 'nov' });
  });
});
