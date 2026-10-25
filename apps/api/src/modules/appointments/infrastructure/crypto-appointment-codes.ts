import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { AppointmentCodes, type IssuedAppointmentCode } from '../application/ports.js';

// 144 random bits: short enough for a link, far too many to guess.
const CODE_BYTES = 18;

@Injectable()
export class CryptoAppointmentCodes extends AppointmentCodes {
  issue(): IssuedAppointmentCode {
    const code = randomBytes(CODE_BYTES).toString('base64url');
    return { code, codeHash: this.hashOf(code) };
  }

  // A fast hash is enough: codes are random values, not guessable passwords.
  hashOf(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }
}
