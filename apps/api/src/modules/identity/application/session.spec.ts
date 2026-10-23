import type { MembershipSummary } from '@turnero/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { BusinessAccessDeniedError, NotAuthenticatedError } from '../domain/errors.js';
import {
  FixedClock,
  InMemoryMembershipReader,
  InMemorySessionRepository,
  InMemoryUserRepository,
  SequentialSessionTokens,
} from '../testing/in-memory-identity.js';
import { Email } from '../domain/email.js';
import { AuthenticateSession } from './authenticate-session.js';
import { AuthorizeBusinessMember } from './authorize-business-member.js';
import { GetCurrentUser } from './get-current-user.js';
import { LogOut } from './log-out.js';
import { StartSession } from './start-session.js';

describe('session use cases', () => {
  const now = new Date('2026-10-22T15:00:00.000Z');
  let sessions: InMemorySessionRepository;
  let clock: FixedClock;
  let startSession: StartSession;
  let authenticate: AuthenticateSession;
  let logOut: LogOut;

  beforeEach(() => {
    sessions = new InMemorySessionRepository();
    clock = new FixedClock(now);
    const tokens = new SequentialSessionTokens();
    startSession = new StartSession(sessions, tokens, clock);
    authenticate = new AuthenticateSession(sessions, tokens, clock);
    logOut = new LogOut(sessions, tokens);
  });

  describe('AuthenticateSession', () => {
    it('returns the user of a valid session token', async () => {
      const { token } = await startSession.execute('user-1');

      await expect(authenticate.execute(token)).resolves.toMatchObject({ userId: 'user-1' });
    });

    it.each([undefined, '', 'token-desconocido'])('rejects the token %j', async (token) => {
      await expect(authenticate.execute(token)).rejects.toThrow(NotAuthenticatedError);
    });

    it('rejects and deletes an expired session', async () => {
      const { token, expiresAt } = await startSession.execute('user-1');
      clock.set(expiresAt);

      await expect(authenticate.execute(token)).rejects.toThrow(NotAuthenticatedError);
      expect(sessions.sessions).toHaveLength(0);
    });
  });

  describe('LogOut', () => {
    it('deletes the session so the token stops working', async () => {
      const { token } = await startSession.execute('user-1');

      await logOut.execute(token);

      expect(sessions.sessions).toHaveLength(0);
      await expect(authenticate.execute(token)).rejects.toThrow(NotAuthenticatedError);
    });

    it('does nothing without a token', async () => {
      await startSession.execute('user-1');

      await logOut.execute(undefined);

      expect(sessions.sessions).toHaveLength(1);
    });
  });
});

describe('membership use cases', () => {
  const faro: MembershipSummary = {
    businessId: 'business-1',
    businessName: 'Barbería El Faro',
    businessSlug: 'barberia-el-faro',
    role: 'owner',
  };
  let users: InMemoryUserRepository;
  let memberships: InMemoryMembershipReader;
  let userId: string;

  beforeEach(async () => {
    users = new InMemoryUserRepository();
    memberships = new InMemoryMembershipReader();
    const user = await users.create({
      email: Email.create('ana@example.com'),
      name: 'Ana',
      passwordHash: 'secreto',
    });
    userId = user.id;
    memberships.memberships.set(userId, [faro]);
  });

  it('GetCurrentUser returns the public profile and memberships, never the password hash', async () => {
    const result = await new GetCurrentUser(users, memberships).execute(userId);

    expect(result).toEqual({
      user: { id: userId, email: 'ana@example.com', name: 'Ana' },
      memberships: [faro],
    });
  });

  it('GetCurrentUser rejects a user that no longer exists', async () => {
    await expect(new GetCurrentUser(users, memberships).execute('borrado')).rejects.toThrow(
      NotAuthenticatedError,
    );
  });

  it('AuthorizeBusinessMember returns the membership of a business the user belongs to', async () => {
    const authorize = new AuthorizeBusinessMember(memberships);

    await expect(authorize.execute(userId, 'business-1')).resolves.toEqual(faro);
  });

  it('AuthorizeBusinessMember rejects a business the user does not belong to', async () => {
    const authorize = new AuthorizeBusinessMember(memberships);

    await expect(authorize.execute(userId, 'business-2')).rejects.toThrow(
      BusinessAccessDeniedError,
    );
  });
});
