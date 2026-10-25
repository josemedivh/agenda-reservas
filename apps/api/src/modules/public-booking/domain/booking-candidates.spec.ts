import type { AvailabilitySlot } from '@turnero/shared';
import { describe, expect, it } from 'vitest';
import { bookingCandidates } from './booking-candidates.js';

const professionals = [
  { id: 'pro-carlos', name: 'Carlos' },
  { id: 'pro-andres', name: 'Andrés' },
  { id: 'pro-zoe', name: 'Zoe' },
];

function slot(professionalIds: string[]): AvailabilitySlot {
  return { startsAt: '2026-11-03T14:00:00.000Z', time: '09:00', professionalIds };
}

describe('bookingCandidates', () => {
  it('books the chosen professional when they are free at that time', () => {
    expect(
      bookingCandidates({
        slot: slot(['pro-carlos', 'pro-andres']),
        professionalId: 'pro-carlos',
        professionals,
        busyThatDay: [],
      }),
    ).toEqual(['pro-carlos']);
  });

  it('has nobody when the chosen professional is taken, or the time is not offered', () => {
    expect(
      bookingCandidates({
        slot: slot(['pro-andres']),
        professionalId: 'pro-carlos',
        professionals,
        busyThatDay: [],
      }),
    ).toEqual([]);
    expect(
      bookingCandidates({ slot: undefined, professionalId: null, professionals, busyThatDay: [] }),
    ).toEqual([]);
    expect(
      bookingCandidates({ slot: slot([]), professionalId: null, professionals, busyThatDay: [] }),
    ).toEqual([]);
  });

  it('with "anyone", tries first whoever has fewer appointments that day', () => {
    expect(
      bookingCandidates({
        slot: slot(['pro-carlos', 'pro-andres', 'pro-zoe']),
        professionalId: null,
        professionals,
        busyThatDay: [
          { professionalId: 'pro-carlos' },
          { professionalId: 'pro-carlos' },
          { professionalId: 'pro-andres' },
        ],
      }),
    ).toEqual(['pro-zoe', 'pro-andres', 'pro-carlos']);
  });

  it('breaks ties by name, in Spanish order', () => {
    expect(
      bookingCandidates({
        slot: slot(['pro-zoe', 'pro-carlos', 'pro-andres']),
        professionalId: null,
        professionals,
        busyThatDay: [],
      }),
    ).toEqual(['pro-andres', 'pro-carlos', 'pro-zoe']);
  });
});
