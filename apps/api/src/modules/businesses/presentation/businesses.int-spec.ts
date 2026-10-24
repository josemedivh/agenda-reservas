import { randomUUID } from 'node:crypto';
import type { BusinessDetails, CurrentUserResponse } from '@turnero/shared';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { signedInAgent, useTestApp } from '../../../../test/http-test-app.js';
import { MemberRole } from '../../../generated/prisma/enums.js';

/** Unique per run: the test database is shared by every test in the file. */
function uniqueSlug(prefix = 'barberia'): string {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

function newBusiness(slug = uniqueSlug()) {
  return {
    name: '  Barbería El Faro ',
    slug,
    phone: '099 123 4567',
    address: 'Av. 9 de Octubre 100',
    timeZone: 'America/Guayaquil',
  };
}

describe('POST /businesses', () => {
  const ctx = useTestApp();

  it('creates the business with clean data and makes the user its owner', async () => {
    const { agent } = await signedInAgent(ctx.server);
    const input = newBusiness();

    const created = await agent.post('/businesses').send(input).expect(201);

    const business = created.body as BusinessDetails;
    expect(business).toEqual({
      id: expect.any(String) as string,
      name: 'Barbería El Faro',
      slug: input.slug,
      phone: '+593991234567',
      address: 'Av. 9 de Octubre 100',
      timeZone: 'America/Guayaquil',
      status: 'active',
      viewerRole: 'owner',
    });
    const me = await agent.get('/auth/me').expect(200);
    expect((me.body as CurrentUserResponse).memberships).toEqual([
      {
        businessId: business.id,
        businessName: 'Barbería El Faro',
        businessSlug: input.slug,
        role: 'owner',
      },
    ]);
  });

  // The web validates with the same schema and sends the cleaned values.
  it('accepts the values exactly as the web sends them', async () => {
    const { agent } = await signedInAgent(ctx.server);

    await agent
      .post('/businesses')
      .send({
        name: 'Barbería El Faro',
        slug: uniqueSlug(),
        phone: '+593991234567',
        address: null,
        timeZone: 'America/Guayaquil',
      })
      .expect(201);
  });

  it('rejects a link that is already in use and suggests a free one', async () => {
    const { agent } = await signedInAgent(ctx.server);
    const { agent: otherOwner } = await signedInAgent(ctx.server);
    const slug = uniqueSlug();
    await agent.post('/businesses').send(newBusiness(slug)).expect(201);

    const response = await otherOwner.post('/businesses').send(newBusiness(slug)).expect(409);

    expect(response.body).toEqual({
      statusCode: 409,
      message: 'Ese link ya está en uso. Elige otro.',
      fieldErrors: { slug: ['Ese link ya está en uso. Elige otro.'] },
      suggestion: `${slug}-2`,
    });
  });

  it('explains invalid fields in Spanish', async () => {
    const { agent } = await signedInAgent(ctx.server);

    const response = await agent
      .post('/businesses')
      .send({ name: 'A', slug: 'panel', phone: '123', timeZone: 'Marte/Base' })
      .expect(400);

    expect(response.body).toMatchObject({
      statusCode: 400,
      fieldErrors: {
        name: ['El nombre debe tener al menos 2 caracteres.'],
        slug: ['Ese link está reservado. Elige otro.'],
        phone: ['Ingresa un teléfono válido, por ejemplo 099 123 4567.'],
        timeZone: ['Elige una zona horaria de la lista.'],
      },
    });
  });

  it('requires a session', async () => {
    await request(ctx.server).post('/businesses').send(newBusiness()).expect(401);
  });
});

describe('GET /businesses/slug-availability', () => {
  const ctx = useTestApp();

  it('says whether a link is free and suggests another when it is not', async () => {
    const { agent } = await signedInAgent(ctx.server);
    const slug = uniqueSlug();

    const free = await agent.get('/businesses/slug-availability').query({ slug }).expect(200);
    expect(free.body).toEqual({ slug, available: true, suggestion: null });

    await agent.post('/businesses').send(newBusiness(slug)).expect(201);
    const taken = await agent.get('/businesses/slug-availability').query({ slug }).expect(200);
    expect(taken.body).toEqual({ slug, available: false, suggestion: `${slug}-2` });
  });

  it('rejects links that could never be used', async () => {
    const { agent } = await signedInAgent(ctx.server);

    await agent.get('/businesses/slug-availability').query({ slug: 'ingresar' }).expect(400);
  });
});

describe('viewing and editing a business', () => {
  const ctx = useTestApp();
  let owner: Awaited<ReturnType<typeof signedInAgent>>;
  let employee: Awaited<ReturnType<typeof signedInAgent>>;
  let business: BusinessDetails;

  beforeAll(async () => {
    owner = await signedInAgent(ctx.server);
    employee = await signedInAgent(ctx.server);
    const created = await owner.agent.post('/businesses').send(newBusiness()).expect(201);
    business = created.body as BusinessDetails;
    await ctx.tenants.run(business.id, (tx) =>
      tx.member.create({
        data: { businessId: business.id, userId: employee.userId, role: MemberRole.EMPLOYEE },
      }),
    );
  });

  it('shows the business to its members with their role', async () => {
    const response = await employee.agent.get(`/businesses/${business.id}`).expect(200);

    expect(response.body).toEqual({ ...business, viewerRole: 'employee' });
  });

  it('lets the owner edit the details, but never the link', async () => {
    const response = await owner.agent
      .put(`/businesses/${business.id}`)
      .send({
        name: 'Barbería El Faro Norte',
        slug: 'otro-link',
        phone: '+57 310 555 1234',
        address: '',
        timeZone: 'Pacific/Galapagos',
      })
      .expect(200);

    expect(response.body).toEqual({
      ...business,
      name: 'Barbería El Faro Norte',
      phone: '+573105551234',
      address: null,
      timeZone: 'Pacific/Galapagos',
    });
  });

  it('does not let an employee edit', async () => {
    const response = await employee.agent
      .put(`/businesses/${business.id}`)
      .send(newBusiness())
      .expect(403);

    expect(response.body).toEqual({
      statusCode: 403,
      message: 'Solo el dueño o un administrador pueden editar los datos del negocio.',
    });
  });

  it('keeps other users out', async () => {
    const stranger = await signedInAgent(ctx.server);

    await stranger.agent.get(`/businesses/${business.id}`).expect(403);
    await stranger.agent.put(`/businesses/${business.id}`).send(newBusiness()).expect(403);
  });

  it('also enforces the phone format in the database', async () => {
    await expect(
      ctx.tenants.run(business.id, (tx) =>
        tx.business.update({ where: { id: business.id }, data: { phone: '0991234567' } }),
      ),
    ).rejects.toThrow(/businesses_phone_e164_check/);
  });
});
