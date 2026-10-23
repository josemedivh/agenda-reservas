import { beforeEach, describe, expect, it } from 'vitest';
import {
  EmailAlreadyRegisteredError,
  InvalidCredentialsError,
  WeakPasswordError,
} from '../domain/errors.js';
import {
  FakePasswordHasher,
  FixedClock,
  InMemorySessionRepository,
  InMemoryUserRepository,
  SequentialSessionTokens,
} from '../testing/in-memory-identity.js';
import { LogIn } from './log-in.js';
import { RegisterUser } from './register-user.js';
import { StartSession } from './start-session.js';

describe('account use cases', () => {
  const now = new Date('2026-10-22T15:00:00.000Z');
  let users: InMemoryUserRepository;
  let sessions: InMemorySessionRepository;
  let hasher: FakePasswordHasher;
  let registerUser: RegisterUser;
  let logIn: LogIn;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    sessions = new InMemorySessionRepository();
    hasher = new FakePasswordHasher();
    const startSession = new StartSession(
      sessions,
      new SequentialSessionTokens(),
      new FixedClock(now),
    );
    registerUser = new RegisterUser(users, hasher, startSession);
    logIn = new LogIn(users, hasher, startSession);
  });

  describe('RegisterUser', () => {
    it('creates the account with a hashed password and starts a 30-day session', async () => {
      const result = await registerUser.execute({
        name: 'Ana',
        email: 'Ana@Example.com',
        password: 'contraseña-segura',
      });

      expect(users.users).toEqual([
        {
          id: result.userId,
          email: 'ana@example.com',
          name: 'Ana',
          passwordHash: 'hashed:contraseña-segura',
        },
      ]);
      expect(result.session).toEqual({
        token: 'token-1',
        expiresAt: new Date('2026-11-21T15:00:00.000Z'),
      });
      expect(sessions.sessions).toMatchObject([
        { userId: result.userId, tokenHash: 'hash(token-1)' },
      ]);
    });

    it('rejects an email that is already registered, regardless of case', async () => {
      await registerUser.execute({
        name: 'Ana',
        email: 'ana@example.com',
        password: 'contraseña-segura',
      });

      await expect(
        registerUser.execute({
          name: 'Otra',
          email: 'ANA@example.com',
          password: 'otra-contraseña',
        }),
      ).rejects.toThrow(EmailAlreadyRegisteredError);
      expect(users.users).toHaveLength(1);
    });

    it('enforces the password policy', async () => {
      await expect(
        registerUser.execute({ name: 'Ana', email: 'ana@example.com', password: 'corta' }),
      ).rejects.toThrow(WeakPasswordError);
      expect(users.users).toHaveLength(0);
    });
  });

  describe('LogIn', () => {
    beforeEach(async () => {
      await registerUser.execute({
        name: 'Ana',
        email: 'ana@example.com',
        password: 'contraseña-segura',
      });
      hasher.verifications = 0;
    });

    it('starts a new session with the right credentials', async () => {
      const result = await logIn.execute({
        email: ' ANA@example.com',
        password: 'contraseña-segura',
      });

      expect(result.userId).toBe(users.users[0]?.id);
      expect(result.session.token).toBe('token-2');
      expect(sessions.sessions).toHaveLength(2);
    });

    it('rejects a wrong password with a generic error', async () => {
      await expect(
        logIn.execute({ email: 'ana@example.com', password: 'otra-contraseña' }),
      ).rejects.toThrow(InvalidCredentialsError);
    });

    it('rejects an unknown email with the same error, after verifying a password anyway', async () => {
      await expect(
        logIn.execute({ email: 'nadie@example.com', password: 'contraseña-segura' }),
      ).rejects.toThrow(InvalidCredentialsError);
      expect(hasher.verifications).toBe(1);
    });

    it('rejects a malformed email with the same error', async () => {
      await expect(logIn.execute({ email: 'no-es-correo', password: 'x' })).rejects.toThrow(
        InvalidCredentialsError,
      );
      expect(hasher.verifications).toBe(1);
    });
  });
});
