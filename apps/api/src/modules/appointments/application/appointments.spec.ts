import type { MembershipSummary } from '@turnero/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { AppointmentNotFoundError, AppointmentOverlapError } from '../domain/errors.js';
import {
  FixedTimeZones,
  InMemoryAppointmentRepository,
  SequentialAppointmentCodes,
} from '../testing/in-memory-appointments.js';
import {
  FindAppointmentByCode,
  ListAppointments,
  ListBusyTimes,
  RecordAppointment,
  type AppointmentRequest,
} from './appointments.js';

const business = { businessId: 'business-1' };
const member: MembershipSummary = {
  businessId: 'business-1',
  businessName: 'Barbería El Faro',
  businessSlug: 'barberia-el-faro',
  role: 'employee',
};

/** Carlos, 45-minute "Corte + barba" with 15 minutes of preparation, Tuesday 9:00 in Guayaquil. */
const request: AppointmentRequest = {
  professionalId: 'pro-carlos',
  serviceId: 'service-1',
  serviceName: 'Corte + barba',
  priceCents: 1200,
  durationMinutes: 45,
  bufferMinutes: 15,
  startsAt: new Date('2026-11-03T14:00:00Z'),
  source: 'online',
  customer: { name: 'Miguel Torres', phone: '+593991234567' },
};

describe('appointment use cases', () => {
  let appointments: InMemoryAppointmentRepository;
  let codes: SequentialAppointmentCodes;
  let record: RecordAppointment;

  beforeEach(() => {
    appointments = new InMemoryAppointmentRepository();
    codes = new SequentialAppointmentCodes();
    record = new RecordAppointment(appointments, codes);
  });

  describe('RecordAppointment', () => {
    it('saves a confirmed appointment with the service span and returns the link code', async () => {
      const { appointment, code } = await record.execute(business, request);

      expect(code).toBe('code-1');
      expect(appointment).toMatchObject({
        professionalId: 'pro-carlos',
        serviceName: 'Corte + barba',
        priceCents: 1200,
        startsAt: '2026-11-03T14:00:00.000Z',
        endsAt: '2026-11-03T14:45:00.000Z',
        status: 'confirmed',
        source: 'online',
        customer: { name: 'Miguel Torres', phone: '+593991234567' },
      });
      // Only the hash is stored; the preparation keeps Carlos busy until 10:00.
      expect(appointments.stored[0]).toMatchObject({
        codeHash: 'hash:code-1',
        busyUntil: new Date('2026-11-03T15:00:00Z'),
      });
    });

    it('reuses the customer of the same phone and keeps the newest name', async () => {
      const first = await record.execute(business, request);
      const second = await record.execute(business, {
        ...request,
        startsAt: new Date('2026-11-04T14:00:00Z'),
        customer: { name: 'Miguel A. Torres', phone: '+593991234567' },
      });

      expect(second.appointment.customer).toEqual({
        id: first.appointment.customer.id,
        name: 'Miguel A. Torres',
        phone: '+593991234567',
      });
    });

    it('refuses a time when the professional is busy, preparation included', async () => {
      await record.execute(business, request);

      await expect(
        record.execute(business, { ...request, startsAt: new Date('2026-11-03T14:45:00Z') }),
      ).rejects.toThrow(AppointmentOverlapError);
      // Right after the preparation, or with someone else, the time is fine.
      await expect(
        record.execute(business, { ...request, startsAt: new Date('2026-11-03T15:00:00Z') }),
      ).resolves.toBeDefined();
      await expect(
        record.execute(business, { ...request, professionalId: 'pro-andres' }),
      ).resolves.toBeDefined();
    });
  });

  describe('ListBusyTimes', () => {
    it('returns when each professional is taken, preparation included, without cancelled ones', async () => {
      await record.execute(business, request);
      await record.execute(business, { ...request, startsAt: new Date('2026-11-03T16:00:00Z') });
      const cancelled = appointments.stored[1];
      if (cancelled) {
        cancelled.appointment.status = 'cancelled';
      }

      await expect(
        new ListBusyTimes(appointments).execute(
          business,
          new Date('2026-11-03T05:00:00Z'),
          new Date('2026-11-04T05:00:00Z'),
        ),
      ).resolves.toEqual([
        {
          professionalId: 'pro-carlos',
          startsAt: new Date('2026-11-03T14:00:00Z'),
          busyUntil: new Date('2026-11-03T15:00:00Z'),
        },
      ]);
    });
  });

  describe('FindAppointmentByCode', () => {
    it('finds the appointment of a link code', async () => {
      const { appointment, code } = await record.execute(business, request);

      await expect(
        new FindAppointmentByCode(appointments, codes).execute(business, code),
      ).resolves.toEqual(appointment);
    });

    it('does not find unknown codes or codes of another business', async () => {
      const { code } = await record.execute(business, request);
      const find = new FindAppointmentByCode(appointments, codes);

      await expect(find.execute(business, 'code-99')).rejects.toThrow(AppointmentNotFoundError);
      await expect(find.execute({ businessId: 'business-2' }, code)).rejects.toThrow(
        AppointmentNotFoundError,
      );
    });
  });

  describe('ListAppointments', () => {
    it('lists the appointments of whole local days of the business, earliest first', async () => {
      // Tuesday 23:30 in Guayaquil is already Wednesday in UTC.
      await record.execute(business, { ...request, startsAt: new Date('2026-11-04T04:30:00Z') });
      await record.execute(business, request);
      await record.execute(business, { ...request, startsAt: new Date('2026-11-04T14:00:00Z') });

      const listed = await new ListAppointments(
        appointments,
        new FixedTimeZones('America/Guayaquil'),
      ).execute(member, { from: '2026-11-03', days: 1 });

      expect(listed.map((appointment) => appointment.startsAt)).toEqual([
        '2026-11-03T14:00:00.000Z',
        '2026-11-04T04:30:00.000Z',
      ]);
    });
  });
});
