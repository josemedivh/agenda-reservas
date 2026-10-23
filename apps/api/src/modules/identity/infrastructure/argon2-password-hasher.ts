import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';
import { PasswordHasher } from '../application/ports.js';

// OWASP minimum for Argon2id (the library default algorithm): 19 MiB, 2 iterations, 1 thread.
const ARGON2_OPTIONS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 };

@Injectable()
export class Argon2PasswordHasher extends PasswordHasher {
  private dummyHash: Promise<string> | undefined;

  hash(plainPassword: string): Promise<string> {
    return hash(plainPassword, ARGON2_OPTIONS);
  }

  async verify(plainPassword: string, passwordHash: string | null): Promise<boolean> {
    if (passwordHash === null) {
      // Same cost as a real check, so unknown emails cannot be told apart by timing.
      this.dummyHash ??= hash('turnero-timing-equalizer', ARGON2_OPTIONS);
      await verify(await this.dummyHash, plainPassword, ARGON2_OPTIONS);
      return false;
    }
    return verify(passwordHash, plainPassword, ARGON2_OPTIONS);
  }
}
