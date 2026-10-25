import {
  addDays,
  todayIn,
  type Appointment,
  type BookingConfirmation,
  type DayAvailability,
  type Professional,
  type PublicBusiness,
  type Service,
} from '@turnero/shared';
import { DateTime } from 'luxon';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { ownerWithBusiness, useTestApp, type TestApp } from '../../../../test/http-test-app.js';
import { BusinessStatus } from '../../../generated/prisma/enums.js';

const GYE = 'America/Guayaquil';

/** The first Tuesday at least two days from today in Guayaquil (always inside the window). */
function upcomingTuesday(): string {
  let date = addDays(todayIn(GYE), 2);
  while (DateTime.fromISO(date).weekday !== 2) {
    date = addDays(date, 1);
  }
  return date;
}

/** UTC instant of a Guayaquil wall time (UTC-5, no daylight saving). */
function at(date: string, time: string): string {
  return DateTime.fromISO(`${date}T${time}`, { zone: GYE }).toUTC().toISO() ?? '';
}

/**
 * A Guayaquil business: Carlos and Andrés work Tuesdays 9:00–11:00 and both perform a 30-minute
 * "Corte" with 15 minutes of preparation.
 */
async function setUpBusiness(ctx: TestApp) {
  const owner = await ownerWithBusiness(ctx.server);
  const base = `/businesses/${owner.business.id}`;
  const professional = async (name: string, color: string) =>
    (await owner.agent.post(`${base}/professionals`).send({ name, color }).expect(201))
      .body as Professional;
  const carlos = await professional('Carlos', '#0E5A4C');
  const andres = await professional('Andrés', '#B9D7EE');
  const corte = (
    await owner.agent
      .post(`${base}/services`)
      .send({
        name: 'Corte',
        durationMinutes: 30,
        priceCents: 800,
        bufferMinutes: 15,
        professionalIds: [carlos.id, andres.id],
      })
      .expect(201)
  ).body as Service;
  for (const { id } of [carlos, andres]) {
    await owner.agent
      .put(`${base}/professionals/${id}/working-hours`)
      .send({ ranges: [{ weekday: 2, startMinute: 540, endMinute: 660 }] })
      .expect(200);
  }
  const date = upcomingTuesday();
  return {
    ...owner,
    base,
    carlos,
    andres,
    corte,
    date,
    publicPath: `/public/businesses/${owner.business.slug}`,
  };
}

type Business = Awaited<ReturnType<typeof setUpBusiness>>;

function bookingFor(business: Business, change: Record<string, unknown> = {}) {
  return {
    serviceId: business.corte.id,
    professionalId: business.carlos.id,
    startsAt: at(business.date, '09:00'),
    name: 'Miguel Torres',
    phone: '0987654321',
    ...change,
  };
}

describe('public booking page', () => {
  const ctx = useTestApp();

  it('shows the business and what can be booked, without a session', async () => {
    const business = await setUpBusiness(ctx);

    const response = await request(ctx.server).get(business.publicPath).expect(200);

    expect(response.body).toEqual({
      name: 'Barbería El Faro',
      slug: business.business.slug,
      phone: '+593991234567',
      address: null,
      timeZone: GYE,
      services: [
        {
          id: business.corte.id,
          name: 'Corte',
          durationMinutes: 30,
          priceCents: 800,
          professionalIds: business.corte.professionalIds,
        },
      ],
      professionals: expect.arrayContaining([
        { id: business.carlos.id, name: 'Carlos', color: '#0E5A4C' },
        { id: business.andres.id, name: 'Andrés', color: '#B9D7EE' },
      ]) as PublicBusiness['professionals'],
    } satisfies PublicBusiness);
  });

  it('does not show unknown or suspended businesses', async () => {
    const business = await setUpBusiness(ctx);
    await request(ctx.server).get('/public/businesses/no-existe-este-link').expect(404);

    await ctx.tenants.run(business.business.id, (tx) =>
      tx.business.update({
        where: { id: business.business.id },
        data: { status: BusinessStatus.SUSPENDED },
      }),
    );

    await request(ctx.server)
      .get(business.publicPath)
      .expect(404, { statusCode: 404, message: 'No encontramos ese negocio.' });
  });

  it('books a time: the client gets a link, the agenda gets the appointment', async () => {
    const business = await setUpBusiness(ctx);

    const response = await request(ctx.server)
      .post(`${business.publicPath}/appointments`)
      .send(bookingFor(business))
      .expect(201);

    const confirmation = response.body as BookingConfirmation;
    expect(confirmation.code).toMatch(/^[\w-]{24}$/);
    expect(confirmation.booking).toEqual({
      status: 'confirmed',
      serviceName: 'Corte',
      priceCents: 800,
      professionalName: 'Carlos',
      customerName: 'Miguel Torres',
      startsAt: at(business.date, '09:00'),
      endsAt: at(business.date, '09:30'),
      date: business.date,
      time: '09:00',
      endTime: '09:30',
      business: {
        name: 'Barbería El Faro',
        slug: business.business.slug,
        phone: '+593991234567',
        address: null,
      },
    });
    await request(ctx.server)
      .get(`${business.publicPath}/appointments/${confirmation.code}`)
      .expect(200, confirmation.booking);

    const agenda = await business.agent
      .get(`${business.base}/appointments`)
      .query({ from: business.date, days: 1 })
      .expect(200);
    expect(agenda.body).toEqual([
      {
        id: expect.any(String) as string,
        professionalId: business.carlos.id,
        serviceId: business.corte.id,
        serviceName: 'Corte',
        priceCents: 800,
        startsAt: at(business.date, '09:00'),
        endsAt: at(business.date, '09:30'),
        status: 'confirmed',
        source: 'online',
        customer: {
          id: expect.any(String) as string,
          name: 'Miguel Torres',
          phone: '+593987654321',
        },
      },
    ] satisfies Appointment[]);
  });

  it('shows the booked time as taken, preparation included, and refuses to book it again', async () => {
    const business = await setUpBusiness(ctx);
    await request(ctx.server)
      .post(`${business.publicPath}/appointments`)
      .send(bookingFor(business))
      .expect(201);

    const day = (
      await request(ctx.server)
        .get(`${business.publicPath}/availability`)
        .query({
          serviceId: business.corte.id,
          date: business.date,
          professionalId: business.carlos.id,
        })
        .expect(200)
    ).body as DayAvailability;
    // 9:00–9:30 plus 15 minutes of preparation: 9:00 and 9:30 are taken.
    expect(day.slots.map((slot) => [slot.time, slot.professionalIds.length])).toEqual([
      ['09:00', 0],
      ['09:30', 0],
      ['10:00', 1],
      ['10:30', 1],
    ]);

    await request(ctx.server)
      .post(`${business.publicPath}/appointments`)
      .send(bookingFor(business, { startsAt: at(business.date, '09:30'), phone: '0991112222' }))
      .expect(409, {
        statusCode: 409,
        message: 'Esa hora ya no está disponible. Elige otra.',
        fieldErrors: { startsAt: ['Esa hora ya no está disponible. Elige otra.'] },
      });
  });
});

// Each block boots its own app, so its bookings count against a fresh per-minute limit.
describe('public booking rules', () => {
  const ctx = useTestApp();

  it('with "anyone", gives the time to the other professional', async () => {
    const business = await setUpBusiness(ctx);
    const path = `${business.publicPath}/appointments`;
    await request(ctx.server).post(path).send(bookingFor(business)).expect(201);

    const response = await request(ctx.server)
      .post(path)
      .send(bookingFor(business, { professionalId: '', phone: '0991112222' }))
      .expect(201);

    expect((response.body as BookingConfirmation).booking.professionalName).toBe('Andrés');
  });

  it('lets only one of two clients booking the same time at the same instant win', async () => {
    const business = await setUpBusiness(ctx);
    const path = `${business.publicPath}/appointments`;

    const responses = await Promise.all([
      request(ctx.server)
        .post(path)
        .send(bookingFor(business, { phone: '0991112222' })),
      request(ctx.server)
        .post(path)
        .send(bookingFor(business, { phone: '0993334444' })),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    const agenda = await business.agent
      .get(`${business.base}/appointments`)
      .query({ from: business.date })
      .expect(200);
    expect(agenda.body).toHaveLength(1);
  });

  it('refuses times that are not offered and explains invalid data in Spanish', async () => {
    const business = await setUpBusiness(ctx);
    const path = `${business.publicPath}/appointments`;

    // 9:15 is not one of the offered times.
    await request(ctx.server)
      .post(path)
      .send(bookingFor(business, { startsAt: at(business.date, '09:15') }))
      .expect(409);
    const invalid = await request(ctx.server)
      .post(path)
      .send(bookingFor(business, { name: ' ', phone: '123' }))
      .expect(400);
    expect(invalid.body).toMatchObject({
      fieldErrors: {
        name: ['Ingresa tu nombre.'],
        phone: ['Ingresa un número válido, por ejemplo 099 123 4567.'],
      },
    });
    await request(ctx.server).get(`${business.publicPath}/appointments/codigo-falso`).expect(404);
  });

  it('keeps one customer per phone in the business', async () => {
    const business = await setUpBusiness(ctx);
    const path = `${business.publicPath}/appointments`;
    await request(ctx.server).post(path).send(bookingFor(business)).expect(201);
    await request(ctx.server)
      .post(path)
      .send(
        bookingFor(business, { startsAt: at(business.date, '10:00'), name: 'Miguel A. Torres' }),
      )
      .expect(201);

    const customers = await ctx.tenants.run(business.business.id, (tx) =>
      tx.customer.findMany({ select: { name: true, phone: true } }),
    );
    expect(customers).toEqual([{ name: 'Miguel A. Torres', phone: '+593987654321' }]);
  });
});

describe('public booking limit', () => {
  const ctx = useTestApp();

  it('allows 10 booking attempts per minute from the same visitor', async () => {
    const business = await setUpBusiness(ctx);
    const path = `${business.publicPath}/appointments`;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await request(ctx.server).post(path).send({}).expect(400);
    }

    await request(ctx.server).post(path).send(bookingFor(business)).expect(429);
    // Looking at the page is limited separately.
    await request(ctx.server).get(business.publicPath).expect(200);
  });
});

describe('appointments in the database', () => {
  const ctx = useTestApp();

  it('rejects overlapping appointments of a professional, unless one is cancelled', async () => {
    const business = await setUpBusiness(ctx);
    await request(ctx.server)
      .post(`${business.publicPath}/appointments`)
      .send(bookingFor(business))
      .expect(201);
    const [existing] = await ctx.tenants.run(business.business.id, (tx) =>
      tx.appointment.findMany(),
    );
    if (!existing) {
      throw new Error('The booking was not saved.');
    }
    const overlapping = {
      ...existing,
      id: undefined,
      codeHash: 'otro-hash',
      startsAt: new Date(existing.busyUntil.getTime() - 60_000),
      endsAt: new Date(existing.busyUntil.getTime() + 29 * 60_000),
      busyUntil: new Date(existing.busyUntil.getTime() + 29 * 60_000),
    };

    await expect(
      ctx.tenants.run(business.business.id, (tx) => tx.appointment.create({ data: overlapping })),
    ).rejects.toThrow(/appointments_no_overlap/);

    await ctx.tenants.run(business.business.id, (tx) =>
      tx.appointment.update({ where: { id: existing.id }, data: { status: 'CANCELLED' } }),
    );
    await expect(
      ctx.tenants.run(business.business.id, (tx) => tx.appointment.create({ data: overlapping })),
    ).resolves.toBeDefined();
  });

  it('keeps appointments and customers of each business apart', async () => {
    const business = await setUpBusiness(ctx);
    const other = await ownerWithBusiness(ctx.server);
    await request(ctx.server)
      .post(`${business.publicPath}/appointments`)
      .send(bookingFor(business))
      .expect(201);

    const seenByOther = await ctx.tenants.run(other.business.id, async (tx) => ({
      appointments: await tx.appointment.count(),
      customers: await tx.customer.count(),
    }));
    expect(seenByOther).toEqual({ appointments: 0, customers: 0 });
    await other.agent
      .get(`${business.base}/appointments`)
      .query({ from: business.date })
      .expect(403);
  });
});
