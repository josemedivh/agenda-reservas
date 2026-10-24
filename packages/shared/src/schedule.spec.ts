import { describe, expect, it } from 'vitest';
import {
  formatTime,
  parseTime,
  summarizeSchedule,
  timeInputValue,
  WEEKDAYS,
  weeklyScheduleSchema,
  type WorkingRange,
} from './schedule.js';

function range(weekday: number, start: string, end: string): WorkingRange {
  return { weekday, startMinute: parseTime(start) ?? -1, endMinute: parseTime(end) ?? -1 };
}

describe('times', () => {
  it.each([
    ['09:00', 540],
    ['9:30', 570],
    ['00:00', 0],
    ['23:55', 1435],
    ['24:00', 1440],
  ])('parses %j as minute %i', (text, minutes) => {
    expect(parseTime(text)).toBe(minutes);
  });

  it.each(['', '9', '25:00', '24:05', '12:60', 'nueve'])('rejects %j', (text) => {
    expect(parseTime(text)).toBeNull();
  });

  it('formats minutes for people and for time inputs', () => {
    expect(formatTime(540)).toBe('9:00');
    expect(formatTime(1170)).toBe('19:30');
    expect(timeInputValue(540)).toBe('09:00');
  });

  it('names the week starting on Monday', () => {
    expect(WEEKDAYS.map((day) => day.short)).toEqual([
      'Lun',
      'Mar',
      'Mié',
      'Jue',
      'Vie',
      'Sáb',
      'Dom',
    ]);
  });
});

describe('weeklyScheduleSchema', () => {
  it('sorts the ranges by day and time', () => {
    const result = weeklyScheduleSchema.parse({
      ranges: [range(2, '15:00', '19:00'), range(1, '09:00', '18:00'), range(2, '09:00', '13:00')],
    });

    expect(result.ranges).toEqual([
      range(1, '09:00', '18:00'),
      range(2, '09:00', '13:00'),
      range(2, '15:00', '19:00'),
    ]);
  });

  it('accepts an empty week (the professional does not attend)', () => {
    expect(weeklyScheduleSchema.parse({ ranges: [] }).ranges).toEqual([]);
  });

  it('accepts back-to-back ranges', () => {
    expect(() =>
      weeklyScheduleSchema.parse({
        ranges: [range(1, '09:00', '13:00'), range(1, '13:00', '18:00')],
      }),
    ).not.toThrow();
  });

  it('explains overlapping ranges with the day name', () => {
    const result = weeklyScheduleSchema.safeParse({
      ranges: [range(2, '09:00', '13:00'), range(2, '12:00', '18:00')],
    });

    expect(result.error?.issues[0]?.message).toBe('Los turnos del martes se cruzan.');
  });

  it.each([
    [range(1, '18:00', '09:00'), 'La hora de fin debe ser posterior a la de inicio.'],
    [range(1, '09:00', '09:00'), 'La hora de fin debe ser posterior a la de inicio.'],
    [{ weekday: 1, startMinute: 541, endMinute: 600 }, 'Usa horas en bloques de 5 minutos.'],
    [{ weekday: 8, startMinute: 540, endMinute: 600 }, 'Elige un día de la semana.'],
    [{ weekday: 1, startMinute: 540, endMinute: 1445 }, 'Usa horas entre las 0:00 y las 24:00.'],
  ])('rejects %j', (bad, message) => {
    const result = weeklyScheduleSchema.safeParse({ ranges: [bad] });

    expect(result.error?.issues[0]?.message).toBe(message);
  });
});

describe('summarizeSchedule', () => {
  it('groups consecutive days with the same hours', () => {
    const weekdays = [1, 2, 3, 4, 5].map((day) => range(day, '09:00', '18:00'));

    expect(summarizeSchedule([...weekdays, range(6, '09:00', '13:00')])).toBe(
      'Lun a vie 9:00–18:00 · Sáb 9:00–13:00',
    );
  });

  it('shows split days and pairs of days', () => {
    expect(
      summarizeSchedule([
        range(1, '09:00', '13:00'),
        range(1, '15:00', '19:00'),
        range(2, '09:00', '13:00'),
        range(2, '15:00', '19:00'),
      ]),
    ).toBe('Lun y mar 9:00–13:00, 15:00–19:00');
  });

  it('keeps non-consecutive days apart', () => {
    expect(summarizeSchedule([range(1, '09:00', '18:00'), range(3, '09:00', '18:00')])).toBe(
      'Lun 9:00–18:00 · Mié 9:00–18:00',
    );
  });

  it('says when there is no schedule', () => {
    expect(summarizeSchedule([])).toBe('Sin horario');
  });
});
