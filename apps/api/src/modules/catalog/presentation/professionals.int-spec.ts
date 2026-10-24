import { randomUUID } from 'node:crypto';
import type { BusinessDetails, Professional } from '@turnero/shared';
import type { Response } from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { signedInAgent, useTestApp, type TestApp } from '../../../../test/http-test-app.js';
import { MemberRole } from '../../../generated/prisma/enums.js';

const TEAL = '#0E5A4C';
const SKY = '#B9D7EE';

type Agent = Awaited<ReturnType<typeof signedInAgent>>;

/** A signed-in owner with a brand-new business. */
async function ownerWithBusiness(ctx: TestApp) {
  const owner = await signedInAgent(ctx.server);
  const response = await owner.agent
    .post('/businesses')
    .send({
      name: 'Barbería El Faro',
      slug: `barberia-${randomUUID().slice(0, 8)}`,
      phone: '0991234567',
      timeZone: 'America/Guayaquil',
    })
    .expect(201);
  const business = response.body as BusinessDetails;
  return { ...owner, business, path: `/businesses/${business.id}/professionals` };
}

function body(response: Response): Professional {
  return response.body as Professional;
}

describe('managing professionals', () => {
  const ctx = useTestApp();
  let owner: Awaited<ReturnType<typeof ownerWithBusiness>>;

  beforeAll(async () => {
    owner = await ownerWithBusiness(ctx);
  });

  it('creates, shows, edits and lists professionals', async () => {
    const created = body(
      await owner.agent.post(owner.path).send({ name: '  Carlos ', color: TEAL }).expect(201),
    );
    expect(created).toEqual({
      id: expect.any(String) as string,
      name: 'Carlos',
      color: TEAL,
      active: true,
    });

    await owner.agent.get(`${owner.path}/${created.id}`).expect(200, created);
    const edited = await owner.agent
      .put(`${owner.path}/${created.id}`)
      .send({ name: 'Carlos Mena', color: SKY })
      .expect(200);
    expect(edited.body).toEqual({ ...created, name: 'Carlos Mena', color: SKY });

    const list = await owner.agent.get(owner.path).expect(200);
    expect(list.body).toEqual([{ ...created, name: 'Carlos Mena', color: SKY }]);
  });

  it('explains invalid data in Spanish', async () => {
    const response = await owner.agent
      .post(owner.path)
      .send({ name: '', color: 'rojo' })
      .expect(400);

    expect(response.body).toMatchObject({
      fieldErrors: {
        name: ['Ingresa el nombre del profesional.'],
        color: ['Elige un color de la lista.'],
      },
    });
  });

  it('rejects a name already used by an active professional, ignoring case', async () => {
    await owner.agent.post(owner.path).send({ name: 'Andrés', color: TEAL }).expect(201);

    const response = await owner.agent
      .post(owner.path)
      .send({ name: 'ANDRÉS', color: SKY })
      .expect(409);

    expect(response.body).toEqual({
      statusCode: 409,
      message: 'Ya tienes un profesional activo con ese nombre.',
      fieldErrors: { name: ['Ya tienes un profesional activo con ese nombre.'] },
    });
  });

  it('answers 404 for unknown or malformed ids', async () => {
    await owner.agent.get(`${owner.path}/${randomUUID()}`).expect(404);
    await owner.agent.get(`${owner.path}/no-es-uuid`).expect(404);
  });
});

describe('active professionals limit', () => {
  const ctx = useTestApp();

  it('allows 5 active professionals and frees a slot when one is deactivated', async () => {
    const owner = await ownerWithBusiness(ctx);
    const ids: string[] = [];
    for (const name of ['Ana', 'Beto', 'Caro', 'Dani', 'Eli']) {
      ids.push(body(await owner.agent.post(owner.path).send({ name, color: TEAL }).expect(201)).id);
    }

    const sixth = await owner.agent
      .post(owner.path)
      .send({ name: 'Fede', color: TEAL })
      .expect(409);
    expect(sixth.body).toEqual({
      statusCode: 409,
      message: 'Puedes tener hasta 5 profesionales activos. Desactiva uno para agregar otro.',
    });

    const deactivated = await owner.agent
      .post(`${owner.path}/${ids[0] ?? ''}/deactivate`)
      .expect(200);
    expect(body(deactivated)).toMatchObject({ name: 'Ana', active: false });
    await owner.agent.post(owner.path).send({ name: 'Fede', color: TEAL }).expect(201);

    await owner.agent.post(`${owner.path}/${ids[0] ?? ''}/activate`).expect(409);
  });

  // Deterministic race: another transaction adds the 5th professional and keeps the business
  // locked. A 6th request must wait and then count 5, instead of counting 4 and slipping in.
  it('counts active professionals only after other changes to the business finish', async () => {
    const owner = await ownerWithBusiness(ctx);
    for (const name of ['Ana', 'Beto', 'Caro', 'Dani']) {
      await owner.agent.post(owner.path).send({ name, color: TEAL }).expect(201);
    }
    let fifthAdded!: () => void;
    const fifthIsPending = new Promise<void>((resolve) => {
      fifthAdded = resolve;
    });

    const otherRequest = ctx.tenants.run(owner.business.id, async (tx) => {
      await tx.$executeRaw`SELECT 1 FROM businesses WHERE id = ${owner.business.id}::uuid FOR UPDATE`;
      await tx.professional.create({
        data: { businessId: owner.business.id, name: 'Eli', color: TEAL },
      });
      fifthAdded();
      await new Promise((resolve) => setTimeout(resolve, 400));
    });
    await fifthIsPending;
    // supertest only sends the request when it is awaited: .then() starts it right now.
    const sixth = owner.agent
      .post(owner.path)
      .send({ name: 'Fede', color: TEAL })
      .then((response) => response);

    await otherRequest;
    expect((await sixth).status).toBe(409);
    const list = await owner.agent.get(owner.path).expect(200);
    expect(
      (list.body as Professional[]).filter((professional) => professional.active),
    ).toHaveLength(5);
  });

  it('reuses the name of an inactive professional and refuses to reactivate the old one', async () => {
    const owner = await ownerWithBusiness(ctx);
    const carlos = body(
      await owner.agent.post(owner.path).send({ name: 'Carlos', color: TEAL }).expect(201),
    );
    await owner.agent.post(`${owner.path}/${carlos.id}/deactivate`).expect(200);

    await owner.agent.post(owner.path).send({ name: 'Carlos', color: SKY }).expect(201);

    const response = await owner.agent.post(`${owner.path}/${carlos.id}/activate`).expect(409);
    expect(response.body).toMatchObject({
      message: 'Ya tienes un profesional activo con ese nombre.',
    });
  });
});

describe('who can see and change professionals', () => {
  const ctx = useTestApp();
  let owner: Awaited<ReturnType<typeof ownerWithBusiness>>;
  let employee: Agent;
  let carlos: Professional;

  beforeAll(async () => {
    owner = await ownerWithBusiness(ctx);
    employee = await signedInAgent(ctx.server);
    await ctx.tenants.run(owner.business.id, (tx) =>
      tx.member.create({
        data: { businessId: owner.business.id, userId: employee.userId, role: MemberRole.EMPLOYEE },
      }),
    );
    carlos = body(
      await owner.agent.post(owner.path).send({ name: 'Carlos', color: TEAL }).expect(201),
    );
  });

  it('lets employees see but not change anything', async () => {
    await employee.agent.get(owner.path).expect(200, [carlos]);
    await employee.agent.get(`${owner.path}/${carlos.id}`).expect(200, carlos);

    const forbidden = {
      statusCode: 403,
      message: 'Solo el dueño o un administrador pueden cambiar los profesionales y servicios.',
    };
    await employee.agent
      .post(owner.path)
      .send({ name: 'Andrés', color: TEAL })
      .expect(403, forbidden);
    await employee.agent
      .put(`${owner.path}/${carlos.id}`)
      .send({ name: 'Otro', color: TEAL })
      .expect(403, forbidden);
    await employee.agent.post(`${owner.path}/${carlos.id}/deactivate`).expect(403, forbidden);
  });

  it('keeps other businesses out, even with a valid professional id', async () => {
    const stranger = await ownerWithBusiness(ctx);

    await stranger.agent.get(owner.path).expect(403);
    // Their own business route cannot reach a professional of another business (RLS).
    await stranger.agent.get(`${stranger.path}/${carlos.id}`).expect(404);
    await stranger.agent
      .put(`${stranger.path}/${carlos.id}`)
      .send({ name: 'Robado', color: TEAL })
      .expect(404);
  });

  it('also enforces the color format in the database', async () => {
    await expect(
      ctx.tenants.run(owner.business.id, (tx) =>
        tx.professional.update({ where: { id: carlos.id }, data: { color: 'red' } }),
      ),
    ).rejects.toThrow(/professionals_color_format_check/);
  });
});
