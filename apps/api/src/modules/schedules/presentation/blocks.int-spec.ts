import { randomUUID } from 'node:crypto';
import type { Block, Professional } from '@turnero/shared';
import { describe, expect, it } from 'vitest';
import {
  ownerWithBusiness,
  signedInAgent,
  useTestApp,
  type TestApp,
} from '../../../../test/http-test-app.js';
import { MemberRole } from '../../../generated/prisma/enums.js';

/** Owner with a business (in the given time zone) and one professional. */
async function setUpBusiness(ctx: TestApp, timeZone = 'America/Guayaquil') {
  const owner = await ownerWithBusiness(ctx.server);
  const base = `/businesses/${owner.business.id}`;
  if (timeZone !== owner.business.timeZone) {
    await owner.agent
      .put(base)
      .send({ name: owner.business.name, phone: owner.business.phone, timeZone })
      .expect(200);
  }
  const carlos = (
    await owner.agent
      .post(`${base}/professionals`)
      .send({ name: 'Carlos', color: '#0E5A4C' })
      .expect(201)
  ).body as Professional;
  return { ...owner, carlos, path: `${base}/blocks` };
}

// Far in the future, so they are always "upcoming" whatever day the tests run.
const vacations = {
  kind: 'allDay',
  startDate: '2099-11-02',
  endDate: '2099-11-06',
  reason: 'Vacaciones',
};

describe('blocks', () => {
  const ctx = useTestApp();

  it('creates whole-day blocks in the business time zone and lists them', async () => {
    const owner = await setUpBusiness(ctx);

    const created = await owner.agent
      .post(owner.path)
      .send({ ...vacations, professionalId: owner.carlos.id })
      .expect(201);

    expect(created.body).toEqual({
      id: expect.any(String) as string,
      professionalId: owner.carlos.id,
      startsAt: '2099-11-02T05:00:00.000Z',
      endsAt: '2099-11-07T05:00:00.000Z',
      reason: 'Vacaciones',
    });
    await owner.agent.get(owner.path).expect(200, [created.body]);
  });

  it('uses the time zone the business has (Santiago, with daylight saving)', async () => {
    const owner = await setUpBusiness(ctx, 'America/Santiago');

    const created = await owner.agent
      .post(owner.path)
      .send({
        kind: 'hours',
        professionalId: '',
        date: '2099-01-15',
        startTime: '14:00',
        endTime: '18:00',
        reason: '',
      })
      .expect(201);

    // January is summer in Chile: UTC-3.
    expect(created.body).toMatchObject({
      professionalId: null,
      startsAt: '2099-01-15T17:00:00.000Z',
      endsAt: '2099-01-15T21:00:00.000Z',
      reason: null,
    });
  });

  it('lists only blocks that have not ended, earliest first', async () => {
    const owner = await setUpBusiness(ctx);
    const later = (await owner.agent.post(owner.path).send(vacations).expect(201)).body as Block;
    const sooner = (
      await owner.agent
        .post(owner.path)
        .send({ ...vacations, startDate: '2099-01-10', endDate: '2099-01-10' })
        .expect(201)
    ).body as Block;
    await ctx.tenants.run(owner.business.id, (tx) =>
      tx.block.create({
        data: {
          businessId: owner.business.id,
          startsAt: new Date('2020-01-01T05:00:00Z'),
          endsAt: new Date('2020-01-02T05:00:00Z'),
        },
      }),
    );

    await owner.agent.get(owner.path).expect(200, [sooner, later]);
  });

  it('explains invalid input in Spanish', async () => {
    const owner = await setUpBusiness(ctx);

    const response = await owner.agent
      .post(owner.path)
      .send({ ...vacations, endDate: '2099-11-01' })
      .expect(400);

    expect(response.body).toMatchObject({
      fieldErrors: { endDate: ['La fecha final no puede ser anterior a la inicial.'] },
    });
  });

  it('removes a block', async () => {
    const owner = await setUpBusiness(ctx);
    const block = (await owner.agent.post(owner.path).send(vacations).expect(201)).body as Block;

    await owner.agent.delete(`${owner.path}/${block.id}`).expect(204);

    await owner.agent.get(owner.path).expect(200, []);
    await owner.agent.delete(`${owner.path}/${block.id}`).expect(404);
  });
});

describe('who can see and change blocks', () => {
  const ctx = useTestApp();

  it('lets employees see but not change, and keeps other businesses out', async () => {
    const owner = await setUpBusiness(ctx);
    const block = (await owner.agent.post(owner.path).send(vacations).expect(201)).body as Block;
    const employee = await signedInAgent(ctx.server);
    await ctx.tenants.run(owner.business.id, (tx) =>
      tx.member.create({
        data: { businessId: owner.business.id, userId: employee.userId, role: MemberRole.EMPLOYEE },
      }),
    );
    const stranger = await setUpBusiness(ctx);

    await employee.agent.get(owner.path).expect(200, [block]);
    await employee.agent.post(owner.path).send(vacations).expect(403);
    await employee.agent.delete(`${owner.path}/${block.id}`).expect(403);

    await stranger.agent.get(owner.path).expect(403);
    await stranger.agent.delete(`${stranger.path}/${block.id}`).expect(404);
    await stranger.agent
      .post(stranger.path)
      .send({ ...vacations, professionalId: owner.carlos.id })
      .expect(404);
  });

  it('enforces the period in the database too', async () => {
    const owner = await setUpBusiness(ctx);

    await expect(
      ctx.tenants.run(owner.business.id, (tx) =>
        tx.block.create({
          data: {
            businessId: owner.business.id,
            startsAt: new Date('2099-01-02T00:00:00Z'),
            endsAt: new Date('2099-01-01T00:00:00Z'),
          },
        }),
      ),
    ).rejects.toThrow(/blocks_period_check/);
    await owner.agent.delete(`${owner.path}/${randomUUID()}`).expect(404);
    await owner.agent.delete(`${owner.path}/no-es-uuid`).expect(404);
  });
});
