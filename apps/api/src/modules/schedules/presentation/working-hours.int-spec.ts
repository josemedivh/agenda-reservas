import { randomUUID } from 'node:crypto';
import type { Professional, ProfessionalSchedule, WorkingRange } from '@turnero/shared';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  ownerWithBusiness,
  signedInAgent,
  useTestApp,
  type TestApp,
} from '../../../../test/http-test-app.js';
import { MemberRole } from '../../../generated/prisma/enums.js';

function range(weekday: number, startMinute: number, endMinute: number): WorkingRange {
  return { weekday, startMinute, endMinute };
}

/** Owner with a business and one professional, plus the routes of that business. */
async function setUpBusiness(ctx: TestApp) {
  const owner = await ownerWithBusiness(ctx.server);
  const base = `/businesses/${owner.business.id}`;
  const carlos = (
    await owner.agent
      .post(`${base}/professionals`)
      .send({ name: 'Carlos', color: '#0E5A4C' })
      .expect(201)
  ).body as Professional;
  return { ...owner, base, carlos, path: `${base}/professionals/${carlos.id}/working-hours` };
}

describe('working hours', () => {
  const ctx = useTestApp();
  let owner: Awaited<ReturnType<typeof setUpBusiness>>;

  beforeAll(async () => {
    owner = await setUpBusiness(ctx);
  });

  it('starts empty, saves the whole week sorted and lists it for the business', async () => {
    await owner.agent.get(owner.path).expect(200, { ranges: [] });

    const saved = await owner.agent
      .put(owner.path)
      .send({ ranges: [range(6, 540, 780), range(1, 900, 1140), range(1, 540, 780)] })
      .expect(200);

    const week = [range(1, 540, 780), range(1, 900, 1140), range(6, 540, 780)];
    expect(saved.body).toEqual({ ranges: week });
    await owner.agent.get(owner.path).expect(200, { ranges: week });
    const list = await owner.agent.get(`${owner.base}/working-hours`).expect(200);
    expect(list.body).toEqual([{ professionalId: owner.carlos.id, ranges: week }]);
  });

  it('replaces the previous week completely', async () => {
    await owner.agent
      .put(owner.path)
      .send({ ranges: [range(1, 540, 1080)] })
      .expect(200);

    await owner.agent
      .put(owner.path)
      .send({ ranges: [range(3, 600, 900)] })
      .expect(200);

    await owner.agent.get(owner.path).expect(200, { ranges: [range(3, 600, 900)] });
  });

  it('rejects overlapping ranges in Spanish and keeps the saved week', async () => {
    await owner.agent
      .put(owner.path)
      .send({ ranges: [range(1, 540, 1080)] })
      .expect(200);

    const response = await owner.agent
      .put(owner.path)
      .send({ ranges: [range(2, 540, 780), range(2, 720, 1080)] })
      .expect(400);

    expect(response.body).toMatchObject({
      fieldErrors: { ranges: ['Los turnos del martes se cruzan.'] },
    });
    await owner.agent.get(owner.path).expect(200, { ranges: [range(1, 540, 1080)] });
  });

  it('is protected by the database too', async () => {
    await expect(
      ctx.tenants.run(owner.business.id, (tx) =>
        tx.workingHours.createMany({
          data: [
            {
              businessId: owner.business.id,
              professionalId: owner.carlos.id,
              ...range(4, 540, 780),
            },
            {
              businessId: owner.business.id,
              professionalId: owner.carlos.id,
              ...range(4, 600, 900),
            },
          ],
        }),
      ),
    ).rejects.toThrow(/working_hours_no_overlap/);
  });

  it('answers 404 for professionals that are not from the business', async () => {
    await owner.agent.get(`${owner.base}/professionals/${randomUUID()}/working-hours`).expect(404);
    await owner.agent
      .put(`${owner.base}/professionals/no-es-uuid/working-hours`)
      .send({ ranges: [] })
      .expect(404);
  });
});

describe('who can see and change working hours', () => {
  const ctx = useTestApp();

  it('lets employees see but not change, and keeps other businesses out', async () => {
    const owner = await setUpBusiness(ctx);
    await owner.agent
      .put(owner.path)
      .send({ ranges: [range(1, 540, 1080)] })
      .expect(200);
    const employee = await signedInAgent(ctx.server);
    await ctx.tenants.run(owner.business.id, (tx) =>
      tx.member.create({
        data: { businessId: owner.business.id, userId: employee.userId, role: MemberRole.EMPLOYEE },
      }),
    );
    const stranger = await setUpBusiness(ctx);

    await employee.agent.get(owner.path).expect(200, { ranges: [range(1, 540, 1080)] });
    await employee.agent.put(owner.path).send({ ranges: [] }).expect(403, {
      statusCode: 403,
      message: 'Solo el dueño o un administrador pueden cambiar los horarios.',
    });

    await stranger.agent.get(owner.path).expect(403);
    // Through their own business route, the other professional does not exist (RLS).
    await stranger.agent
      .put(`${stranger.base}/professionals/${owner.carlos.id}/working-hours`)
      .send({ ranges: [range(1, 540, 1080)] })
      .expect(404);
    const list = await stranger.agent.get(`${stranger.base}/working-hours`).expect(200);
    expect(list.body as ProfessionalSchedule[]).toEqual([]);
  });
});
