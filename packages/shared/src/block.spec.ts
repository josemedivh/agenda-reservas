import { describe, expect, it } from 'vitest';
import { blockInputSchema, blockInterval, describeBlock } from './block.js';

const GYE = 'America/Guayaquil';
const SANTIAGO = 'America/Santiago';
const PRO = '6f1c2c1e-0000-4000-8000-00000000000a';

const allDay = {
  professionalId: '',
  kind: 'allDay',
  startDate: '2026-11-02',
  endDate: '2026-11-06',
  reason: '  Vacaciones ',
};

const hours = {
  professionalId: PRO,
  kind: 'hours',
  date: '2026-11-02',
  startTime: '14:00',
  endTime: '18:00',
  reason: '',
};

describe('blockInputSchema', () => {
  it('cleans an all-day block for the whole business', () => {
    expect(blockInputSchema.parse(allDay)).toEqual({
      professionalId: null,
      kind: 'allDay',
      startDate: '2026-11-02',
      endDate: '2026-11-06',
      reason: 'Vacaciones',
    });
  });

  it('cleans a block by hours for one professional', () => {
    expect(blockInputSchema.parse(hours)).toEqual({
      professionalId: PRO,
      kind: 'hours',
      date: '2026-11-02',
      startTime: '14:00',
      endTime: '18:00',
      reason: null,
    });
  });

  it('treats a missing professional as the whole business', () => {
    expect(
      blockInputSchema.parse({ ...hours, professionalId: undefined }).professionalId,
    ).toBeNull();
  });

  // The web validates first and sends the result; the API must accept it as is.
  it('accepts its own output', () => {
    for (const input of [allDay, hours]) {
      const cleaned = blockInputSchema.parse(input);
      expect(blockInputSchema.parse(cleaned)).toEqual(cleaned);
    }
  });

  it.each([
    [
      { ...allDay, endDate: '2026-11-01' },
      'endDate',
      'La fecha final no puede ser anterior a la inicial.',
    ],
    [{ ...allDay, endDate: '2027-11-03' }, 'endDate', 'Un bloqueo puede durar hasta un año.'],
    [{ ...allDay, startDate: '2026-02-30' }, 'startDate', 'Elige una fecha válida.'],
    [
      { ...hours, endTime: '13:00' },
      'endTime',
      'La hora de fin debe ser posterior a la de inicio.',
    ],
    [{ ...hours, startTime: '' }, 'startTime', 'Elige una hora válida.'],
    [
      { ...hours, professionalId: 'no-es-uuid' },
      'professionalId',
      'Elige para quién es el bloqueo.',
    ],
    [
      { ...hours, reason: 'x'.repeat(121) },
      'reason',
      'El motivo no puede tener más de 120 caracteres.',
    ],
  ])('rejects %j', (input, field, message) => {
    const result = blockInputSchema.safeParse(input);

    expect(result.error?.issues[0]?.path[0]).toBe(field);
    expect(result.error?.issues[0]?.message).toBe(message);
  });
});

describe('blockInterval', () => {
  it('turns whole days in Guayaquil into UTC instants (end exclusive)', () => {
    expect(blockInterval(blockInputSchema.parse(allDay), GYE)).toEqual({
      startsAt: '2026-11-02T05:00:00.000Z',
      endsAt: '2026-11-07T05:00:00.000Z',
    });
  });

  it('turns hours in Guayaquil into UTC instants', () => {
    expect(blockInterval(blockInputSchema.parse(hours), GYE)).toEqual({
      startsAt: '2026-11-02T19:00:00.000Z',
      endsAt: '2026-11-02T23:00:00.000Z',
    });
  });

  it('handles a day without midnight (daylight saving starts in Santiago)', () => {
    const day = blockInputSchema.parse({
      ...allDay,
      startDate: '2026-09-06',
      endDate: '2026-09-06',
    });

    // The day starts at 1:00 (-03:00) and lasts 23 hours.
    expect(blockInterval(day, SANTIAGO)).toEqual({
      startsAt: '2026-09-06T04:00:00.000Z',
      endsAt: '2026-09-07T03:00:00.000Z',
    });
  });
});

describe('describeBlock', () => {
  it('describes whole days in the business time zone', () => {
    expect(describeBlock('2026-11-02T05:00:00.000Z', '2026-11-03T05:00:00.000Z', GYE)).toBe(
      'Lun 2 nov · todo el día',
    );
    expect(describeBlock('2026-11-02T05:00:00.000Z', '2026-11-07T05:00:00.000Z', GYE)).toBe(
      'Del lun 2 nov al vie 6 nov · todo el día',
    );
  });

  it('describes hours within a day', () => {
    expect(describeBlock('2026-11-02T19:00:00.000Z', '2026-11-02T23:00:00.000Z', GYE)).toBe(
      'Lun 2 nov · 14:00–18:00',
    );
  });

  it('describes whole days across a daylight saving change', () => {
    expect(describeBlock('2026-09-06T04:00:00.000Z', '2026-09-07T03:00:00.000Z', SANTIAGO)).toBe(
      'Dom 6 sept · todo el día',
    );
  });
});
