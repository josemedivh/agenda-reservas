import { Injectable } from '@nestjs/common';
import { NotAuthenticatedError } from '../domain/errors.js';
import { isSessionExpired } from '../domain/session-lifetime.js';
import { Clock, SessionRepository, SessionTokens } from './ports.js';

export interface SessionPrincipal {
  userId: string;
  sessionId: string;
}

@Injectable()
export class AuthenticateSession {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly tokens: SessionTokens,
    private readonly clock: Clock,
  ) {}

  async execute(token: string | undefined): Promise<SessionPrincipal> {
    if (!token) {
      throw new NotAuthenticatedError();
    }
    const tokenHash = this.tokens.hashOf(token);
    const session = await this.sessions.findByTokenHash(tokenHash);
    if (!session) {
      throw new NotAuthenticatedError();
    }
    if (isSessionExpired(session.expiresAt, this.clock.now())) {
      await this.sessions.deleteByTokenHash(tokenHash);
      throw new NotAuthenticatedError();
    }
    return { userId: session.userId, sessionId: session.id };
  }
}
