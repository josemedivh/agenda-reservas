import { randomUUID } from 'node:crypto';
import type { Professional, Service } from '@turnero/shared';
import type { Response } from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  ownerWithBusiness,
  signedInAgent,
  useTestApp,
  type TestApp,
} from '../../../../test/http-test-app.js';
import { MemberRole } from '../../../generated/prisma/enums.js';

const TEAL = '#0E5A4C';

/** Owner with a business, two active professionals and the routes of that business. */
async function setUpBusiness(ctx: TestApp) {
  const owner = await ownerWithBusiness(ctx.server);
  const base = `/businesses/${owner.business.id}`;
  const addProfessional = async (name: string) =>
    (await owner.agent.post(`${base}/professionals`).send({ name, color: TEAL }).expect(201))
      .body as Professional;
  const carlos = await addProfessional('Carlos');
  const andres = await addProfessional('Andrés');
  return { ...owner, base, path: `${base}/services`, carlos, andres };
}

function service(response: Response): Service {
  return response.body as Service;
}

function corte(professionalIds: string[]) {
  return {
    name: 'Corte clásico',
    durationMinutes: 30,
    priceCents: 800,
    bufferMinutes: 5,
    professionalIds,
  };
}

describe('managing services', () => {
  const ctx = useTestApp();
  let owner: Awaited<ReturnType<typeof setUpBusiness>>;

  beforeAll(async () => {
    owner = await setUpBusiness(ctx);
  });

  it('creates, shows, edits and lists services with their professionals', async () => {
    const created = service(
      await owner.agent
        .post(owner.path)
        .send(corte([owner.carlos.id]))
        .expect(201),
    );
    expect(created).toEqual({
      id: expect.any(String) as string,
      ...corte([owner.carlos.id]),
      active: true,
    });
    await owner.agent.get(`${owner.path}/${created.id}`).expect(200, created);

    const edited = service(
      await owner.agent
        .put(`${owner.path}/${created.id}`)
        .send({ ...corte([owner.andres.id, owner.carlos.id]), priceCents: 950 })
        .expect(200),
    );
    expect(edited.priceCents).toBe(950);
    expect([...edited.professionalIds].sort()).toEqual([owner.andres.id, owner.carlos.id].sort());

    const list = await owner.agent.get(owner.path).expect(200);
    expect(list.body).toEqual([edited]);
  });

  it('explains invalid data in Spanish', async () => {
    const response = await owner.agent
      .post(owner.path)
      .send({ ...corte([]), name: 'Degradado', durationMinutes: 32 })
      .expect(400);

    expect(response.body).toMatchObject({
      fieldErrors: {
        durationMinutes: ['La duración debe ser de 5 a 480 minutos, en bloques de 5.'],
      },
    });
  });

  it('rejects a name already used by an active service, ignoring case', async () => {
    await owner.agent
      .post(owner.path)
      .send({ ...corte([]), name: 'Barba' })
      .expect(201);

    const response = await owner.agent
      .post(owner.path)
      .send({ ...corte([]), name: 'BARBA' })
      .expect(409);

    expect(response.body).toMatchObject({
      fieldErrors: { name: ['Ya tienes un servicio activo con ese nombre.'] },
    });
  });

  it('deactivates and reactivates a service', async () => {
    const tinte = service(
      await owner.agent
        .post(owner.path)
        .send({ ...corte([]), name: 'Tinte' })
        .expect(201),
    );

    await owner.agent.post(`${owner.path}/${tinte.id}/deactivate`).expect(200);
    const list = await owner.agent.get(owner.path).expect(200);
    expect((list.body as Service[]).at(-1)).toMatchObject({ name: 'Tinte', active: false });

    const reactivated = await owner.agent.post(`${owner.path}/${tinte.id}/activate`).expect(200);
    expect(service(reactivated).active).toBe(true);
  });
});

describe('assigning professionals', () => {
  const ctx = useTestApp();

  it('only accepts active professionals of the same business', async () => {
    const owner = await setUpBusiness(ctx);
    const stranger = await setUpBusiness(ctx);
    await owner.agent.post(`${owner.base}/professionals/${owner.andres.id}/deactivate`).expect(200);

    for (const professionalId of [owner.andres.id, stranger.carlos.id]) {
      const response = await owner.agent
        .post(owner.path)
        .send({ ...corte([professionalId]), name: `Servicio ${randomUUID().slice(0, 4)}` })
        .expect(400);
      expect(response.body).toMatchObject({
        fieldErrors: { professionalIds: ['Elige profesionales activos de tu negocio.'] },
      });
    }
  });

  it('keeps the assignment of a professional deactivated later, and their services return', async () => {
    const owner = await setUpBusiness(ctx);
    const created = service(
      await owner.agent
        .post(owner.path)
        .send(corte([owner.carlos.id, owner.andres.id]))
        .expect(201),
    );
    await owner.agent.post(`${owner.base}/professionals/${owner.andres.id}/deactivate`).expect(200);

    const edited = service(
      await owner.agent
        .put(`${owner.path}/${created.id}`)
        .send({ ...corte([owner.carlos.id, owner.andres.id]), priceCents: 900 })
        .expect(200),
    );

    expect([...edited.professionalIds].sort()).toEqual([owner.carlos.id, owner.andres.id].sort());
  });

  it('is blocked by the database even if the code let it through', async () => {
    const owner = await setUpBusiness(ctx);
    const stranger = await setUpBusiness(ctx);
    const created = service(await owner.agent.post(owner.path).send(corte([])).expect(201));

    await expect(
      ctx.tenants.run(owner.business.id, (tx) =>
        tx.serviceProfessional.create({
          data: {
            businessId: owner.business.id,
            serviceId: created.id,
            professionalId: stranger.carlos.id,
          },
        }),
      ),
    ).rejects.toThrow(/service_professionals_professional_id_business_id_fkey/);
  });
});

describe('who can see and change services', () => {
  const ctx = useTestApp();
  let owner: Awaited<ReturnType<typeof setUpBusiness>>;
  let corteClasico: Service;

  beforeAll(async () => {
    owner = await setUpBusiness(ctx);
    corteClasico = service(
      await owner.agent
        .post(owner.path)
        .send(corte([owner.carlos.id]))
        .expect(201),
    );
  });

  it('lets employees see but not change services', async () => {
    const employee = await signedInAgent(ctx.server);
    await ctx.tenants.run(owner.business.id, (tx) =>
      tx.member.create({
        data: { businessId: owner.business.id, userId: employee.userId, role: MemberRole.EMPLOYEE },
      }),
    );

    await employee.agent.get(owner.path).expect(200, [corteClasico]);
    await employee.agent
      .post(owner.path)
      .send({ ...corte([]), name: 'Otro' })
      .expect(403);
    await employee.agent.put(`${owner.path}/${corteClasico.id}`).send(corte([])).expect(403);
    await employee.agent.post(`${owner.path}/${corteClasico.id}/deactivate`).expect(403);
  });

  it('keeps other businesses out', async () => {
    const stranger = await setUpBusiness(ctx);

    await stranger.agent.get(owner.path).expect(403);
    await stranger.agent.get(`${stranger.path}/${corteClasico.id}`).expect(404);
    await stranger.agent.get(`${stranger.path}/no-es-uuid`).expect(404);
  });

  it('also enforces the duration rules in the database', async () => {
    await expect(
      ctx.tenants.run(owner.business.id, (tx) =>
        tx.service.update({ where: { id: corteClasico.id }, data: { durationMinutes: 7 } }),
      ),
    ).rejects.toThrow(/services_duration_check/);
  });
});
