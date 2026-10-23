import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { SessionTokens, type IssuedSessionToken } from '../application/ports.js';

const TOKEN_BYTES = 32;

@Injectable()
export class CryptoSessionTokens extends SessionTokens {
  issue(): IssuedSessionToken {
    const token = randomBytes(TOKEN_BYTES).toString('base64url');
    return { token, tokenHash: this.hashOf(token) };
  }

  // A fast hash is enough: tokens are 256-bit random values, not guessable passwords.
  hashOf(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
