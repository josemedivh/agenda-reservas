import { Injectable } from '@nestjs/common';
import { sessionExpiresAt } from '../domain/session-lifetime.js';
import { Clock, SessionRepository, SessionTokens } from './ports.js';

export interface StartedSession {
  /** Secret sent to the browser; only its hash is stored. */
  token: string;
  expiresAt: Date;
}

@Injectable()
export class StartSession {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly tokens: SessionTokens,
    private readonly clock: Clock,
  ) {}

  async execute(userId: string): Promise<StartedSession> {
    const { token, tokenHash } = this.tokens.issue();
    const expiresAt = sessionExpiresAt(this.clock.now());
    await this.sessions.create({ userId, tokenHash, expiresAt });
    return { token, expiresAt };
  }
}
