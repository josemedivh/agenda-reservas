import type { BookingInput, Professional, Service } from '@turnero/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { BusinessNotFoundError } from '../../businesses/domain/errors.js';
import { BookingNotFoundError, TimeNotAvailableError } from '../domain/errors.js';
import { FakePublicBookingSources } from '../testing/fake-public-booking-sources.js';
import { BookAppointment, GetBooking, GetPublicBusiness } from './public-booking.js';

const business = {
  id: 'business-1',
  name: 'Barbería El Faro',
  slug: 'barberia-el-faro',
  phone: '+593991234567',
  address: 'Av. 9 de Octubre 1204',
  timeZone: 'America/Guayaquil',
};
const carlos: Professional = { id: 'pro-carlos', name: 'Carlos', color: '#0E5A4C', active: true };
const andres: Professional = { id: 'pro-andres', name: 'Andrés', color: '#B9D7EE', active: true };
const zoe: Professional = { id: 'pro-zoe', name: 'Zoe', color: '#F2C46D', active: false };
const corte: Service = {
  id: 'service-corte',
  name: 'Corte + barba',
  durationMinutes: 45,
  priceCents: 1200,
  bufferMinutes: 15,
  active: true,
  professionalIds: [carlos.id, andres.id, zoe.id],
};

/** Tuesday 9:00 in Guayaquil. */
const NINE = '2026-11-03T14:00:00.000Z';
const booking: BookingInput = {
  serviceId: corte.id,
  professionalId: null,
  startsAt: NINE,
  name: 'Miguel Torres',
  phone: '+593987654321',
};

describe('public booking use cases', () => {
  let sources: FakePublicBookingSources;

  beforeEach(() => {
    sources = new FakePublicBookingSources(business);
    sources.services = [corte];
    sources.professionals = [carlos, andres, zoe];
    sources.availability.set('2026-11-03', {
      date: '2026-11-03',
      slots: [
        { startsAt: NINE, time: '09:00', professionalIds: [carlos.id, andres.id] },
        { startsAt: '2026-11-03T14:30:00.000Z', time: '09:30', professionalIds: [] },
      ],
    });
  });

  function book(input: Partial<BookingInput> = {}) {
    return new BookAppointment(sources, sources, sources, sources).execute(business.slug, {
      ...booking,
      ...input,
    });
  }

  describe('GetPublicBusiness', () => {
    it('shows only what clients can book, without internal data', async () => {
      const color: Service = {
        ...corte,
        id: 'service-color',
        name: 'Color',
        professionalIds: [zoe.id],
      };
      const old: Service = { ...corte, id: 'service-old', name: 'Old', active: false };
      const pablo: Professional = {
        id: 'pro-pablo',
        name: 'Pablo',
        color: '#000000',
        active: true,
      };
      sources.services = [corte, color, old];
      sources.professionals = [carlos, andres, zoe, pablo];

      await expect(new GetPublicBusiness(sources, sources).execute(business.slug)).resolves.toEqual(
        {
          name: 'Barbería El Faro',
          slug: 'barberia-el-faro',
          phone: '+593991234567',
          address: 'Av. 9 de Octubre 1204',
          timeZone: 'America/Guayaquil',
          // "Color" is only done by Zoe (inactive) and "Old" is inactive.
          services: [
            {
              id: corte.id,
              name: 'Corte + barba',
              durationMinutes: 45,
              priceCents: 1200,
              professionalIds: [carlos.id, andres.id],
            },
          ],
          // Pablo does none of the bookable services.
          professionals: [
            { id: carlos.id, name: 'Carlos', color: '#0E5A4C' },
            { id: andres.id, name: 'Andrés', color: '#B9D7EE' },
          ],
        },
      );
    });

    it('does not find a link without an active business', async () => {
      await expect(new GetPublicBusiness(sources, sources).execute('otra')).rejects.toThrow(
        BusinessNotFoundError,
      );
    });
  });

  describe('BookAppointment', () => {
    it('books the chosen professional, copying the service as it is now', async () => {
      const confirmation = await book({ professionalId: carlos.id });

      expect(sources.recorded).toEqual([
        {
          professionalId: carlos.id,
          serviceId: corte.id,
          serviceName: 'Corte + barba',
          priceCents: 1200,
          durationMinutes: 45,
          bufferMinutes: 15,
          startsAt: new Date(NINE),
          source: 'online',
          customer: { name: 'Miguel Torres', phone: '+593987654321' },
        },
      ]);
      expect(confirmation).toEqual({
        code: 'code-1',
        booking: {
          status: 'confirmed',
          serviceName: 'Corte + barba',
          priceCents: 1200,
          professionalName: 'Carlos',
          customerName: 'Miguel Torres',
          startsAt: NINE,
          endsAt: '2026-11-03T14:45:00.000Z',
          date: '2026-11-03',
          time: '09:00',
          endTime: '09:45',
          business: {
            name: 'Barbería El Faro',
            slug: 'barberia-el-faro',
            phone: '+593991234567',
            address: 'Av. 9 de Octubre 1204',
          },
        },
      });
    });

    it('with "anyone", gives the booking to whoever has fewer appointments that day', async () => {
      sources.busyToday = [{ professionalId: andres.id }];

      const confirmation = await book();

      expect(confirmation.booking.professionalName).toBe('Carlos');
    });

    it('tries the next professional when the first is booked at the same instant', async () => {
      sources.bookedMeanwhile.add(andres.id);

      const confirmation = await book();

      expect(confirmation.booking.professionalName).toBe('Carlos');
    });

    it('refuses a time that is not offered, is taken, or was just taken', async () => {
      await expect(book({ startsAt: '2026-11-03T15:00:00.000Z' })).rejects.toThrow(
        TimeNotAvailableError,
      );
      await expect(book({ startsAt: '2026-11-03T14:30:00.000Z' })).rejects.toThrow(
        TimeNotAvailableError,
      );
      sources.bookedMeanwhile.add(carlos.id);
      await expect(book({ professionalId: carlos.id })).rejects.toThrow(TimeNotAvailableError);
      expect(sources.recorded).toEqual([]);
    });

    it('looks for the time in the local day of the business', async () => {
      // 23:30 on Tuesday in Guayaquil is Wednesday in UTC.
      const late = '2026-11-04T04:30:00.000Z';
      sources.availability.set('2026-11-03', {
        date: '2026-11-03',
        slots: [{ startsAt: late, time: '23:30', professionalIds: [carlos.id] }],
      });

      const confirmation = await book({ startsAt: late });

      expect(confirmation.booking).toMatchObject({ date: '2026-11-03', time: '23:30' });
    });
  });

  describe('GetBooking', () => {
    it('shows a booking through the code of its link', async () => {
      const { code, booking: details } = await book({ professionalId: carlos.id });

      await expect(
        new GetBooking(sources, sources, sources).execute(business.slug, code),
      ).resolves.toEqual(details);
    });

    it('does not find unknown codes', async () => {
      await expect(
        new GetBooking(sources, sources, sources).execute(business.slug, 'code-99'),
      ).rejects.toThrow(BookingNotFoundError);
    });
  });
});
