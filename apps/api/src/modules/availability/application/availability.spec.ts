import type { MembershipSummary, Professional, Service } from '@turnero/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { ProfessionalNotForServiceError, ServiceNotBookableError } from '../domain/errors.js';
import { FakeAvailabilitySources } from '../testing/fake-availability-sources.js';
import { AvailabilityCalculator } from './availability-calculator.js';
import { GetAvailabilityDays, GetDayAvailability } from './availability.js';

const member: MembershipSummary = {
  businessId: 'business-1',
  businessName: 'Barbería',
  businessSlug: 'barberia',
  role: 'employee',
};
const SERVICE = 'service-1';
const CARLOS = 'pro-carlos';
const ANDRES = 'pro-andres';
const ZOE = 'pro-zoe';

function pro(id: string, active = true): Professional {
  return { id, name: id, color: '#0E5A4C', active };
}

const corte: Service = {
  id: SERVICE,
  name: 'Corte',
  durationMinutes: 30,
  priceCents: 800,
  bufferMinutes: 0,
  active: true,
  professionalIds: [CARLOS, ANDRES, ZOE],
};

describe('availability use cases', () => {
  let sources: FakeAvailabilitySources;
  let getDay: GetDayAvailability;
  let getDays: GetAvailabilityDays;

  beforeEach(() => {
    sources = new FakeAvailabilitySources({
      now: new Date('2026-11-01T12:00:00.000Z'),
      timeZone: 'America/Guayaquil',
      services: [corte],
      professionals: [pro(CARLOS), pro(ANDRES), pro(ZOE, false)],
      schedules: [
        // Tuesday 9:00–10:00 for Carlos, 9:30–10:30 for Andrés, Monday–Sunday for Zoe (inactive).
        { professionalId: CARLOS, ranges: [{ weekday: 2, startMinute: 540, endMinute: 600 }] },
        { professionalId: ANDRES, ranges: [{ weekday: 2, startMinute: 570, endMinute: 630 }] },
        {
          professionalId: ZOE,
          ranges: [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
            weekday,
            startMinute: 0,
            endMinute: 1440,
          })),
        },
      ],
    });
    const calculator = new AvailabilityCalculator(sources, sources, sources, sources, sources);
    getDay = new GetDayAvailability(calculator);
    getDays = new GetAvailabilityDays(calculator);
  });

  it('combines the active professionals who perform the service', async () => {
    const day = await getDay.execute(member, {
      serviceId: SERVICE,
      date: '2026-11-03',
      professionalId: null,
    });

    expect(day.date).toBe('2026-11-03');
    expect(day.slots.map((slot) => [slot.time, slot.professionalIds])).toEqual([
      ['09:00', [CARLOS]],
      ['09:30', [CARLOS, ANDRES]],
      ['10:00', [ANDRES]],
    ]);
  });

  it('narrows to one professional when asked', async () => {
    const day = await getDay.execute(member, {
      serviceId: SERVICE,
      date: '2026-11-03',
      professionalId: ANDRES,
    });

    expect(day.slots.map((slot) => slot.time)).toEqual(['09:30', '10:00']);
  });

  it('applies business-wide blocks and the professional own blocks only to them', async () => {
    const carlosMorning = {
      id: 'b1',
      professionalId: CARLOS,
      startsAt: '2026-11-03T14:00:00.000Z',
      endsAt: '2026-11-03T15:00:00.000Z',
      reason: null,
    };
    sources.blocks = [carlosMorning];

    const day = await getDay.execute(member, {
      serviceId: SERVICE,
      date: '2026-11-03',
      professionalId: null,
    });

    expect(day.slots.map((slot) => [slot.time, slot.professionalIds])).toEqual([
      ['09:30', [ANDRES]],
      ['10:00', [ANDRES]],
    ]);

    sources.blocks = [{ ...carlosMorning, professionalId: null }];
    const closed = await getDay.execute(member, {
      serviceId: SERVICE,
      date: '2026-11-03',
      professionalId: null,
    });
    expect(closed.slots.map((slot) => slot.time)).toEqual(['10:00']);
  });

  it('marks times taken by existing appointments', async () => {
    sources.busy = [
      {
        professionalId: CARLOS,
        startsAt: new Date('2026-11-03T14:30:00.000Z'),
        endsAt: new Date('2026-11-03T15:00:00.000Z'),
      },
    ];

    const day = await getDay.execute(member, {
      serviceId: SERVICE,
      date: '2026-11-03',
      professionalId: CARLOS,
    });

    expect(day.slots).toMatchObject([
      { time: '09:00', professionalIds: [CARLOS] },
      { time: '09:30', professionalIds: [] },
    ]);
  });

  it('summarizes several days as closed, full or available', async () => {
    sources.busy = [
      {
        professionalId: CARLOS,
        startsAt: new Date('2026-11-10T14:00:00.000Z'),
        endsAt: new Date('2026-11-10T15:00:00.000Z'),
      },
    ];

    const days = await getDays.execute(member, {
      serviceId: SERVICE,
      from: '2026-11-02',
      days: 9,
      professionalId: CARLOS,
    });

    expect(days).toEqual([
      { date: '2026-11-02', status: 'closed' },
      { date: '2026-11-03', status: 'available' },
      { date: '2026-11-04', status: 'closed' },
      { date: '2026-11-05', status: 'closed' },
      { date: '2026-11-06', status: 'closed' },
      { date: '2026-11-07', status: 'closed' },
      { date: '2026-11-08', status: 'closed' },
      { date: '2026-11-09', status: 'closed' },
      { date: '2026-11-10', status: 'full' },
    ]);
  });

  it('rejects inactive or unknown services', async () => {
    sources.services = [{ ...corte, active: false }];

    await expect(
      getDay.execute(member, { serviceId: SERVICE, date: '2026-11-03', professionalId: null }),
    ).rejects.toThrow(ServiceNotBookableError);
    await expect(
      getDay.execute(member, { serviceId: 'otro', date: '2026-11-03', professionalId: null }),
    ).rejects.toThrow(ServiceNotBookableError);
  });

  it('rejects professionals who do not perform the service or are inactive', async () => {
    for (const professionalId of ['pro-desconocido', ZOE]) {
      await expect(
        getDay.execute(member, { serviceId: SERVICE, date: '2026-11-03', professionalId }),
      ).rejects.toThrow(ProfessionalNotForServiceError);
    }
  });
});
