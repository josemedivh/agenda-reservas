import type { WorkingRange } from '@turnero/shared';
import { describe, expect, it } from 'vitest';
import { availableSlots, type ProfessionalDay, type SlotQuery } from './slots.js';

const GYE = 'America/Guayaquil';
const TUESDAY = '2026-11-03';
const P1 = 'pro-1';
const P2 = 'pro-2';

function range(weekday: number, start: string, end: string): WorkingRange {
  const minutes = (time: string) => {
    const [hours, mins] = time.split(':').map(Number);
    return (hours ?? 0) * 60 + (mins ?? 0);
  };
  return { weekday, startMinute: minutes(start), endMinute: minutes(end) };
}

/** Local time in Guayaquil (UTC-5) on the test Tuesday, as a Date. */
function gye(time: string, date = TUESDAY): Date {
  return new Date(`${date}T${time}:00-05:00`);
}

function interval(from: string, to: string) {
  return { startsAt: gye(from), endsAt: gye(to) };
}

function professional(overrides: Partial<ProfessionalDay> = {}): ProfessionalDay {
  return {
    professionalId: P1,
    ranges: [range(2, '09:00', '18:00')],
    blocks: [],
    busy: [],
    ...overrides,
  };
}

function query(overrides: Partial<SlotQuery> = {}): SlotQuery {
  return {
    date: TUESDAY,
    timeZone: GYE,
    now: new Date('2026-11-01T12:00:00.000Z'),
    durationMinutes: 30,
    bufferMinutes: 0,
    professionals: [professional()],
    ...overrides,
  };
}

function times(slots: ReturnType<typeof availableSlots>): string[] {
  return slots.map((slot) => slot.time);
}

function freeTimes(slots: ReturnType<typeof availableSlots>): string[] {
  return slots.filter((slot) => slot.professionalIds.length > 0).map((slot) => slot.time);
}

describe('availableSlots', () => {
  it('offers every 30 minutes while the service fits in the working range', () => {
    const slots = availableSlots(query());

    expect(times(slots)).toEqual([
      '09:00',
      '09:30',
      '10:00',
      '10:30',
      '11:00',
      '11:30',
      '12:00',
      '12:30',
      '13:00',
      '13:30',
      '14:00',
      '14:30',
      '15:00',
      '15:30',
      '16:00',
      '16:30',
      '17:00',
      '17:30',
    ]);
    expect(slots[0]).toEqual({
      startsAt: '2026-11-03T14:00:00.000Z',
      time: '09:00',
      professionalIds: [P1],
    });
  });

  it('stops when a longer service no longer fits', () => {
    expect(times(availableSlots(query({ durationMinutes: 45 }))).at(-1)).toBe('17:00');
  });

  it('does not offer a service across the lunch break', () => {
    const slots = availableSlots(
      query({
        durationMinutes: 60,
        professionals: [
          professional({ ranges: [range(2, '09:00', '13:00'), range(2, '15:00', '19:00')] }),
        ],
      }),
    );

    expect(times(slots)).toContain('12:00');
    expect(times(slots)).not.toContain('12:30');
    expect(times(slots)).toContain('15:00');
  });

  it('has nothing on a day the professional does not work', () => {
    const slots = availableSlots(
      query({ professionals: [professional({ ranges: [range(1, '09:00', '18:00')] })] }),
    );

    expect(slots).toEqual([]);
  });

  it('shows times taken by appointments (and their preparation) as taken', () => {
    // An existing 10:00–10:30 appointment with 15 minutes of preparation keeps 10:00–10:45 busy.
    const slots = availableSlots(
      query({ professionals: [professional({ busy: [interval('10:00', '10:45')] })] }),
    );

    expect(times(slots)).toContain('10:00');
    expect(freeTimes(slots)).not.toContain('10:00');
    expect(freeTimes(slots)).not.toContain('10:30');
    expect(freeTimes(slots)).toContain('11:00');
  });

  it("needs room for the new service's own preparation before the next appointment", () => {
    const busy = [interval('10:00', '10:30')];

    const withoutPreparation = availableSlots(query({ professionals: [professional({ busy })] }));
    const withPreparation = availableSlots(
      query({ bufferMinutes: 15, professionals: [professional({ busy })] }),
    );

    expect(freeTimes(withoutPreparation)).toContain('09:30');
    expect(freeTimes(withPreparation)).not.toContain('09:30');
  });

  it('lets the preparation run past closing time', () => {
    expect(freeTimes(availableSlots(query({ bufferMinutes: 15 }))).at(-1)).toBe('17:30');
  });

  it('removes blocked times entirely (they are closed, not taken)', () => {
    const slots = availableSlots(
      query({ professionals: [professional({ blocks: [interval('14:00', '16:00')] })] }),
    );

    expect(times(slots)).toContain('13:30');
    expect(times(slots)).not.toContain('14:00');
    expect(times(slots)).not.toContain('15:30');
    expect(times(slots)).toContain('16:00');
  });

  it('needs at least 60 minutes of notice', () => {
    // 09:30 in Guayaquil.
    const slots = availableSlots(query({ now: new Date('2026-11-03T14:30:00.000Z') }));

    expect(times(slots)[0]).toBe('10:30');
  });

  it('offers nothing in the past or more than 60 days ahead', () => {
    expect(availableSlots(query({ date: '2026-10-31' }))).toEqual([]);
    // Now is Nov 1: Dec 31 is day 60, Jan 1 is day 61.
    const tuesdayRanges = [1, 2, 3, 4, 5, 6, 7].map((day) => range(day, '09:00', '18:00'));
    const lastDay = availableSlots(
      query({ date: '2026-12-31', professionals: [professional({ ranges: tuesdayRanges })] }),
    );
    const tooFar = availableSlots(
      query({ date: '2027-01-01', professionals: [professional({ ranges: tuesdayRanges })] }),
    );
    expect(lastDay.length).toBeGreaterThan(0);
    expect(tooFar).toEqual([]);
  });

  it('combines professionals and says who is free at each time ("any professional")', () => {
    const slots = availableSlots(
      query({
        professionals: [
          professional({
            professionalId: P1,
            ranges: [range(2, '09:00', '12:00')],
            busy: [interval('10:00', '11:00')],
          }),
          professional({ professionalId: P2, ranges: [range(2, '10:00', '13:00')] }),
        ],
      }),
    );

    expect(slots.map((slot) => [slot.time, slot.professionalIds])).toEqual([
      ['09:00', [P1]],
      ['09:30', [P1]],
      ['10:00', [P2]],
      ['10:30', [P2]],
      ['11:00', [P1, P2]],
      ['11:30', [P1, P2]],
      ['12:00', [P2]],
      ['12:30', [P2]],
    ]);
  });

  it('skips local times that do not exist when daylight saving starts (Madrid)', () => {
    // On 2026-03-29 clocks in Madrid jump from 02:00 to 03:00.
    const slots = availableSlots(
      query({
        date: '2026-03-29',
        timeZone: 'Europe/Madrid',
        now: new Date('2026-03-01T00:00:00.000Z'),
        professionals: [professional({ ranges: [range(7, '01:00', '04:00')] })],
      }),
    );

    expect(times(slots)).toEqual(['01:00', '01:30', '03:00', '03:30']);
    expect(slots[2]?.startsAt).toBe('2026-03-29T01:00:00.000Z');
  });
});
