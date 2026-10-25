import { describe, expect, it } from 'vitest';
import { appointmentSpan, localDaysInterval } from './appointment-rules.js';

describe('appointmentSpan', () => {
  it('ends after the service and keeps the professional busy for the preparation too', () => {
    expect(appointmentSpan(new Date('2026-11-03T14:00:00Z'), 45, 15)).toEqual({
      startsAt: new Date('2026-11-03T14:00:00Z'),
      endsAt: new Date('2026-11-03T14:45:00Z'),
      busyUntil: new Date('2026-11-03T15:00:00Z'),
    });
  });

  it('is busy only for the service when there is no preparation', () => {
    const span = appointmentSpan(new Date('2026-11-03T14:00:00Z'), 30, 0);

    expect(span.busyUntil).toEqual(span.endsAt);
  });
});

describe('localDaysInterval', () => {
  it('covers whole local days of the business, from midnight to midnight', () => {
    expect(localDaysInterval('2026-11-03', 1, 'America/Guayaquil')).toEqual({
      from: new Date('2026-11-03T05:00:00Z'),
      to: new Date('2026-11-04T05:00:00Z'),
    });
    expect(localDaysInterval('2026-11-03', 7, 'America/Guayaquil').to).toEqual(
      new Date('2026-11-10T05:00:00Z'),
    );
  });

  it('follows daylight saving changes (Madrid has a 25-hour day on 2026-10-25)', () => {
    expect(localDaysInterval('2026-10-25', 1, 'Europe/Madrid')).toEqual({
      from: new Date('2026-10-24T22:00:00Z'),
      to: new Date('2026-10-25T23:00:00Z'),
    });
  });
});
