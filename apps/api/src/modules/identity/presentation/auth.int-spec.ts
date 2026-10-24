import { randomUUID } from 'node:crypto';
import { Controller, Get, Module, UseGuards } from '@nestjs/common';
import type { MembershipSummary } from '@turnero/shared';
import request, { type Response } from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  TEST_PASSWORD as PASSWORD,
  uniqueEmail,
  useTestApp,
} from '../../../../test/http-test-app.js';
import { MemberRole } from '../../../generated/prisma/enums.js';
import { IdentityModule } from '../identity.module.js';
import { CryptoSessionTokens } from '../infrastructure/crypto-session-tokens.js';
import { BusinessMemberGuard } from './business-member.guard.js';
import { CurrentMembership } from './request-context.js';
import { SESSION_COOKIE } from './session-cookie.js';
import { SessionGuard } from './session.guard.js';

// Stand-in for a future business route, to exercise both guards end to end.
@Controller('businesses/:businessId/probe')
@UseGuards(SessionGuard, BusinessMemberGuard)
class ProbeController {
  @Get()
  probe(@CurrentMembership() membership: MembershipSummary): MembershipSummary {
    return membership;
  }
}

@Module({ imports: [IdentityModule], controllers: [ProbeController] })
class ProbeModule {}

function sessionCookieOf(response: Response): string | undefined {
  return response.get('Set-Cookie')?.find((cookie) => cookie.startsWith(`${SESSION_COOKIE}=`));
}

describe('POST /auth/register', () => {
  const ctx = useTestApp([ProbeModule]);

  it('creates the account, sets an httpOnly session cookie and returns the user', async () => {
    const email = uniqueEmail();

    const response = await request(ctx.server)
      .post('/auth/register')
      .send({ name: '  Ana Pérez ', email: email.toUpperCase(), password: PASSWORD })
      .expect(201);

    expect(response.body).toEqual({
      user: { id: expect.any(String) as string, email, name: 'Ana Pérez' },
      memberships: [],
    });
    const cookie = sessionCookieOf(response);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toMatch(/Expires=/i);

    const stored = await ctx.prisma.user.findUniqueOrThrow({ where: { email } });
    expect(stored.passwordHash).toMatch(/^\$argon2id\$/);
  });

  it('rejects an email that is already registered', async () => {
    const email = uniqueEmail();
    await request(ctx.server)
      .post('/auth/register')
      .send({ name: 'Ana', email, password: PASSWORD })
      .expect(201);

    const response = await request(ctx.server)
      .post('/auth/register')
      .send({ name: 'Otra', email: email.toUpperCase(), password: 'otra-contraseña' })
      .expect(409);

    expect(response.body).toEqual({
      statusCode: 409,
      message: 'Ya existe una cuenta con ese correo.',
    });
    expect(sessionCookieOf(response)).toBeUndefined();
  });

  it('explains invalid fields in Spanish', async () => {
    const response = await request(ctx.server)
      .post('/auth/register')
      .send({ name: '', email: 'no-es-correo', password: 'corta' })
      .expect(400);

    expect(response.body).toEqual({
      statusCode: 400,
      message: 'Revisa los datos ingresados.',
      fieldErrors: {
        name: ['Ingresa tu nombre.'],
        email: ['Ingresa un correo válido.'],
        password: ['La contraseña debe tener al menos 10 caracteres.'],
      },
    });
  });
});

describe('login, current user and logout', () => {
  const ctx = useTestApp([ProbeModule]);
  const email = uniqueEmail();

  beforeAll(async () => {
    await request(ctx.server)
      .post('/auth/register')
      .send({ name: 'Ana', email, password: PASSWORD })
      .expect(201);
  });

  it('logs in with the right credentials and keeps the session for /auth/me', async () => {
    const agent = request.agent(ctx.server);

    const login = await agent.post('/auth/login').send({ email, password: PASSWORD }).expect(200);
    expect(sessionCookieOf(login)).toBeDefined();

    const me = await agent.get('/auth/me').expect(200);
    expect(me.body).toMatchObject({ user: { email, name: 'Ana' }, memberships: [] });
  });

  it.each([
    ['a wrong password', () => ({ email, password: 'otra-contraseña' })],
    ['an unknown email', () => ({ email: uniqueEmail(), password: PASSWORD })],
  ])('rejects %s with the same generic message', async (_case, credentials) => {
    const response = await request(ctx.server).post('/auth/login').send(credentials()).expect(401);

    expect(response.body).toEqual({ statusCode: 401, message: 'Correo o contraseña incorrectos.' });
    expect(sessionCookieOf(response)).toBeUndefined();
  });

  it('requires a session for /auth/me', async () => {
    const response = await request(ctx.server).get('/auth/me').expect(401);

    expect(response.body).toEqual({ statusCode: 401, message: 'Inicia sesión para continuar.' });
  });

  it('logs out: clears the cookie and revokes the session on the server', async () => {
    const login = await request(ctx.server)
      .post('/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);
    const cookie = sessionCookieOf(login)?.split(';')[0] ?? '';

    const logout = await request(ctx.server).post('/auth/logout').set('Cookie', cookie).expect(204);

    expect(sessionCookieOf(logout)).toMatch(/Expires=Thu, 01 Jan 1970/);
    // Replaying the old cookie must not work anymore.
    await request(ctx.server).get('/auth/me').set('Cookie', cookie).expect(401);
  });

  it('rejects and removes an expired session', async () => {
    const user = await ctx.prisma.user.findUniqueOrThrow({ where: { email } });
    const { token, tokenHash } = new CryptoSessionTokens().issue();
    await ctx.prisma.session.create({
      data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() - 1000) },
    });

    await request(ctx.server)
      .get('/auth/me')
      .set('Cookie', `${SESSION_COOKIE}=${token}`)
      .expect(401);

    expect(await ctx.prisma.session.findUnique({ where: { tokenHash } })).toBeNull();
  });
});

describe('business access', () => {
  const ctx = useTestApp([ProbeModule]);
  const ownBusinessId = randomUUID();
  const otherBusinessId = randomUUID();
  const agent = () => request.agent(ctx.server);
  let owner: ReturnType<typeof agent>;

  async function createBusiness(businessId: string, name: string, userId: string): Promise<void> {
    await ctx.tenants.run(businessId, async (tx) => {
      await tx.business.create({
        data: {
          id: businessId,
          name,
          slug: `negocio-${businessId}`,
          phone: '+593991234567',
          timeZone: 'America/Guayaquil',
        },
      });
      await tx.member.create({ data: { businessId, userId, role: MemberRole.OWNER } });
    });
  }

  async function registerUser(client: ReturnType<typeof agent>): Promise<string> {
    const response = await client
      .post('/auth/register')
      .send({ name: 'Ana', email: uniqueEmail(), password: PASSWORD })
      .expect(201);
    return (response.body as { user: { id: string } }).user.id;
  }

  beforeAll(async () => {
    owner = agent();
    await createBusiness(ownBusinessId, 'Barbería El Faro', await registerUser(owner));
    await createBusiness(otherBusinessId, 'Salón Ajeno', await registerUser(agent()));
  });

  it('lists the businesses of the user in /auth/me', async () => {
    const me = await owner.get('/auth/me').expect(200);

    expect((me.body as { memberships: MembershipSummary[] }).memberships).toEqual([
      {
        businessId: ownBusinessId,
        businessName: 'Barbería El Faro',
        businessSlug: `negocio-${ownBusinessId}`,
        role: 'owner',
      },
    ]);
  });

  it('lets a member into the routes of their business', async () => {
    const response = await owner.get(`/businesses/${ownBusinessId}/probe`).expect(200);

    expect(response.body).toMatchObject({ businessId: ownBusinessId, role: 'owner' });
  });

  it.each([
    ['another business', () => otherBusinessId],
    ['a business that does not exist', () => randomUUID()],
    ['an id that is not a UUID', () => 'no-es-uuid'],
  ])('forbids %s', async (_case, businessId) => {
    const response = await owner.get(`/businesses/${businessId()}/probe`).expect(403);

    expect(response.body).toEqual({ statusCode: 403, message: 'No tienes acceso a este negocio.' });
  });

  it('asks for a session before checking the business', async () => {
    await request(ctx.server).get(`/businesses/${ownBusinessId}/probe`).expect(401);
  });
});

describe('rate limiting', () => {
  const ctx = useTestApp([ProbeModule]);

  it('blocks the 11th login attempt within a minute', async () => {
    const credentials = { email: uniqueEmail(), password: PASSWORD };
    for (let attempt = 1; attempt <= 10; attempt += 1) {
      await request(ctx.server).post('/auth/login').send(credentials).expect(401);
    }

    const response = await request(ctx.server).post('/auth/login').send(credentials).expect(429);

    expect(response.body).toMatchObject({
      message: 'Demasiados intentos. Espera un minuto y vuelve a intentarlo.',
    });
  });
});

describe('rate limiting behind the web app', () => {
  const ctx = useTestApp([ProbeModule]);

  // The web app forwards /api/* from the same machine and adds X-Forwarded-For.
  it('counts attempts per client IP, not per forwarding proxy', async () => {
    const credentials = { email: uniqueEmail(), password: PASSWORD };
    const loginFrom = (ip: string) =>
      request(ctx.server).post('/auth/login').set('X-Forwarded-For', ip).send(credentials);
    for (let attempt = 1; attempt <= 10; attempt += 1) {
      await loginFrom('203.0.113.10').expect(401);
    }

    await loginFrom('203.0.113.10').expect(429);
    await loginFrom('203.0.113.20').expect(401);
  });
});
