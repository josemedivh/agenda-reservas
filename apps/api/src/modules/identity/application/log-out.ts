import { Injectable } from '@nestjs/common';
import { SessionRepository, SessionTokens } from './ports.js';

@Injectable()
export class LogOut {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly tokens: SessionTokens,
  ) {}

  async execute(token: string | undefined): Promise<void> {
    if (!token) {
      return;
    }
    await this.sessions.deleteByTokenHash(this.tokens.hashOf(token));
  }
}
