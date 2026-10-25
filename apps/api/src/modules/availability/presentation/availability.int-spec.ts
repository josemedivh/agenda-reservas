import {
  addDays,
  todayIn,
  type DayAvailability,
  type DayAvailabilitySummary,
  type Professional,
  type Service,
} from '@turnero/shared';
import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';
import {
  ownerWithBusiness,
  signedInAgent,
  useTestApp,
  type TestApp,
} from '../../../../test/http-test-app.js';
import { MemberRole } from '../../../generated/prisma/enums.js';

const GYE = 'America/Guayaquil';

/** The first Tuesday at least two days from today in Guayaquil (always inside the window). */
function upcomingTuesday(): string {
  let date = addDays(todayIn(GYE), 2);
  while (DateTime.fromISO(date).weekday !== 2) {
    date = addDays(date, 1);
  }
  return date;
}

/** A Guayaquil business: Carlos works Tuesdays 9:00–11:00 and performs a 30-minute "Corte". */
async function setUpBusiness(ctx: TestApp) {
  const owner = await ownerWithBusiness(ctx.server);
  const base = `/businesses/${owner.business.id}`;
  const carlos = (
    await owner.agent
      .post(`${base}/professionals`)
      .send({ name: 'Carlos', color: '#0E5A4C' })
      .expect(201)
  ).body as Professional;
  const andres = (
    await owner.agent
      .post(`${base}/professionals`)
      .send({ name: 'Andrés', color: '#B9D7EE' })
      .expect(201)
  ).body as Professional;
  const corte = (
    await owner.agent
      .post(`${base}/services`)
      .send({
        name: 'Corte',
        durationMinutes: 30,
        priceCents: 800,
        bufferMinutes: 0,
        professionalIds: [carlos.id],
      })
      .expect(201)
  ).body as Service;
  await owner.agent
    .put(`${base}/professionals/${carlos.id}/working-hours`)
    .send({ ranges: [{ weekday: 2, startMinute: 540, endMinute: 660 }] })
    .expect(200);
  return { ...owner, base, carlos, andres, corte, path: `${base}/availability` };
}

describe('availability', () => {
  const ctx = useTestApp();

  it('offers the times of the working hours, in the business time zone', async () => {
    const owner = await setUpBusiness(ctx);
    const date = upcomingTuesday();

    const response = await owner.agent
      .get(owner.path)
      .query({ serviceId: owner.corte.id, date })
      .expect(200);

    const day = response.body as DayAvailability;
    expect(day.slots.map((slot) => [slot.time, slot.professionalIds])).toEqual([
      ['09:00', [owner.carlos.id]],
      ['09:30', [owner.carlos.id]],
      ['10:00', [owner.carlos.id]],
      ['10:30', [owner.carlos.id]],
    ]);
    expect(day.slots[0]?.startsAt).toBe(`${date}T14:00:00.000Z`);
  });

  it('leaves out blocked times', async () => {
    const owner = await setUpBusiness(ctx);
    const date = upcomingTuesday();
    await owner.agent
      .post(`${owner.base}/blocks`)
      .send({ kind: 'hours', date, startTime: '10:00', endTime: '11:00', reason: 'Reunión' })
      .expect(201);

    const response = await owner.agent
      .get(owner.path)
      .query({ serviceId: owner.corte.id, date })
      .expect(200);

    expect((response.body as DayAvailability).slots.map((slot) => slot.time)).toEqual([
      '09:00',
      '09:30',
    ]);
  });

  it('summarizes the coming days for the date picker', async () => {
    const owner = await setUpBusiness(ctx);
    const date = upcomingTuesday();
    const from = addDays(date, -1);

    const response = await owner.agent
      .get(`${owner.path}/days`)
      .query({ serviceId: owner.corte.id, from, days: 3 })
      .expect(200);

    expect(response.body as DayAvailabilitySummary[]).toEqual([
      { date: from, status: 'closed' },
      { date, status: 'available' },
      { date: addDays(date, 1), status: 'closed' },
    ]);
  });

  it('explains wrong queries in Spanish', async () => {
    const owner = await setUpBusiness(ctx);
    const date = upcomingTuesday();

    const invalid = await owner.agent.get(owner.path).query({ serviceId: 'x', date }).expect(400);
    expect(invalid.body).toMatchObject({ fieldErrors: { serviceId: ['Elige un servicio.'] } });

    const notPerformer = await owner.agent
      .get(owner.path)
      .query({ serviceId: owner.corte.id, date, professionalId: owner.andres.id })
      .expect(400);
    expect(notPerformer.body).toMatchObject({
      message: 'Ese profesional no realiza este servicio.',
    });

    await owner.agent.post(`${owner.base}/services/${owner.corte.id}/deactivate`).expect(200);
    const inactive = await owner.agent
      .get(owner.path)
      .query({ serviceId: owner.corte.id, date })
      .expect(404);
    expect(inactive.body).toMatchObject({ message: 'Ese servicio no existe o no está activo.' });
  });
});

describe('who can see availability', () => {
  const ctx = useTestApp();

  it('lets every member see it and keeps other businesses out', async () => {
    const owner = await setUpBusiness(ctx);
    const date = upcomingTuesday();
    const employee = await signedInAgent(ctx.server);
    await ctx.tenants.run(owner.business.id, (tx) =>
      tx.member.create({
        data: { businessId: owner.business.id, userId: employee.userId, role: MemberRole.EMPLOYEE },
      }),
    );
    const stranger = await setUpBusiness(ctx);

    await employee.agent.get(owner.path).query({ serviceId: owner.corte.id, date }).expect(200);
    await stranger.agent.get(owner.path).query({ serviceId: owner.corte.id, date }).expect(403);
    // Through their own business, the other business's service does not exist (RLS).
    await stranger.agent.get(stranger.path).query({ serviceId: owner.corte.id, date }).expect(404);
  });
});
