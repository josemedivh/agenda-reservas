import type { MembershipSummary } from '@turnero/shared';
import type { Email } from '../domain/email.js';

// Ports are abstract classes so NestJS can use them as injection tokens.

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
}

export interface NewUserAccount {
  email: Email;
  name: string;
  passwordHash: string;
}

export abstract class UserRepository {
  abstract findByEmail(email: Email): Promise<UserAccount | null>;
  abstract findById(id: string): Promise<UserAccount | null>;
  /** @throws EmailAlreadyRegisteredError when another account already uses the email. */
  abstract create(user: NewUserAccount): Promise<UserAccount>;
}

export interface StoredSession {
  id: string;
  userId: string;
  expiresAt: Date;
}

export interface NewSession {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export abstract class SessionRepository {
  abstract create(session: NewSession): Promise<void>;
  abstract findByTokenHash(tokenHash: string): Promise<StoredSession | null>;
  abstract deleteByTokenHash(tokenHash: string): Promise<void>;
}

export abstract class PasswordHasher {
  abstract hash(plainPassword: string): Promise<string>;
  /** Pass a null hash for unknown users: it still spends the time of a real verification. */
  abstract verify(plainPassword: string, passwordHash: string | null): Promise<boolean>;
}

export interface IssuedSessionToken {
  token: string;
  tokenHash: string;
}

export abstract class SessionTokens {
  abstract issue(): IssuedSessionToken;
  abstract hashOf(token: string): string;
}

export abstract class Clock {
  abstract now(): Date;
}

export abstract class MembershipReader {
  abstract listForUser(userId: string): Promise<MembershipSummary[]>;
}
