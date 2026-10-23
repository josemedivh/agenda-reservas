import { randomUUID } from 'node:crypto';
import type { MembershipSummary } from '@turnero/shared';
import {
  Clock,
  MembershipReader,
  PasswordHasher,
  SessionRepository,
  SessionTokens,
  UserRepository,
  type IssuedSessionToken,
  type NewSession,
  type NewUserAccount,
  type StoredSession,
  type UserAccount,
} from '../application/ports.js';
import type { Email } from '../domain/email.js';
import { EmailAlreadyRegisteredError } from '../domain/errors.js';

// Test doubles for the identity ports. Only used by unit tests.

export class InMemoryUserRepository extends UserRepository {
  readonly users: UserAccount[] = [];

  findByEmail(email: Email): Promise<UserAccount | null> {
    return Promise.resolve(this.users.find((user) => user.email === email.value) ?? null);
  }

  findById(id: string): Promise<UserAccount | null> {
    return Promise.resolve(this.users.find((user) => user.id === id) ?? null);
  }

  create(user: NewUserAccount): Promise<UserAccount> {
    if (this.users.some((existing) => existing.email === user.email.value)) {
      return Promise.reject(new EmailAlreadyRegisteredError());
    }
    const account = {
      id: randomUUID(),
      email: user.email.value,
      name: user.name,
      passwordHash: user.passwordHash,
    };
    this.users.push(account);
    return Promise.resolve(account);
  }
}

export class InMemorySessionRepository extends SessionRepository {
  readonly sessions: (StoredSession & { tokenHash: string })[] = [];

  create(session: NewSession): Promise<void> {
    this.sessions.push({ id: randomUUID(), ...session });
    return Promise.resolve();
  }

  findByTokenHash(tokenHash: string): Promise<StoredSession | null> {
    return Promise.resolve(
      this.sessions.find((session) => session.tokenHash === tokenHash) ?? null,
    );
  }

  deleteByTokenHash(tokenHash: string): Promise<void> {
    const index = this.sessions.findIndex((session) => session.tokenHash === tokenHash);
    if (index >= 0) {
      this.sessions.splice(index, 1);
    }
    return Promise.resolve();
  }
}

export class FakePasswordHasher extends PasswordHasher {
  verifications = 0;

  hash(plainPassword: string): Promise<string> {
    return Promise.resolve(`hashed:${plainPassword}`);
  }

  verify(plainPassword: string, passwordHash: string | null): Promise<boolean> {
    this.verifications += 1;
    return Promise.resolve(passwordHash === `hashed:${plainPassword}`);
  }
}

export class SequentialSessionTokens extends SessionTokens {
  private issued = 0;

  issue(): IssuedSessionToken {
    this.issued += 1;
    const token = `token-${String(this.issued)}`;
    return { token, tokenHash: this.hashOf(token) };
  }

  hashOf(token: string): string {
    return `hash(${token})`;
  }
}

export class FixedClock extends Clock {
  constructor(private current: Date) {
    super();
  }

  now(): Date {
    return this.current;
  }

  set(date: Date): void {
    this.current = date;
  }
}

export class InMemoryMembershipReader extends MembershipReader {
  readonly memberships = new Map<string, MembershipSummary[]>();

  listForUser(userId: string): Promise<MembershipSummary[]> {
    return Promise.resolve(this.memberships.get(userId) ?? []);
  }
}
